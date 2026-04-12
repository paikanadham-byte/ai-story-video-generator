import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { execFile } from "child_process";
import { promisify } from "util";
import { generateScript, generateScriptChunked } from "../services/scriptEngine.js";
import { fetchMediaForScene, resetMediaTracker } from "../services/mediaFetcher.js";
import { generateSpeech } from "../services/ttsEngine.js";
import { renderScene, concatenateScenes, generateSRT } from "../services/videoRenderer.js";
import { ensureDir, projectDir } from "../utils/helpers.js";
import { createJob, updateJob } from "../utils/jobStore.js";
import { emitProgress, emitComplete, emitError } from "../websocket.js";
import { uploadVideoOutput, isSupabaseEnabled } from "../utils/supabase.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAPTION_BURNER = path.join(__dirname, "caption_burner.py");

const CONCURRENT_MEDIA = 3;
const CONCURRENT_TTS = 2;

export async function runPipeline(options) {
  const { storyIdea, genre, voiceStyle, sceneCount, resolution, musicMood, targetDuration } = options;
  const jobId = uuid();
  const jobDir = projectDir(jobId);
  await ensureDir(jobDir);

  // Reset media tracker so each job starts fresh
  resetMediaTracker();

  const job = createJob(jobId);
  const totalSteps = 5; // script, media, tts, render, concat

  function progress(step, stepName, detail, pct) {
    const overallPct = Math.round(((step - 1) / totalSteps + pct / 100 / totalSteps) * 100);
    updateJob(jobId, { status: "processing", progress: overallPct, currentStep: stepName });
    emitProgress(jobId, { step: stepName, detail, progress: overallPct });
  }

  // Run pipeline async
  (async () => {
    try {
      // ── Step 1: Script Generation ──
      progress(1, "script", "Generating cinematic script...", 0);

      let script;
      if (sceneCount > 30) {
        script = await generateScriptChunked(storyIdea, genre, sceneCount, (chunk, total) => {
          progress(1, "script", `Generating script chunk ${chunk}/${total}...`, (chunk / total) * 100);
        });
      } else {
        script = await generateScript(storyIdea, genre, sceneCount);
      }

      updateJob(jobId, { scenes: script.scenes });
      progress(1, "script", `Script ready: ${script.scenes.length} scenes`, 100);

      // ── Step 2: Media Fetch ──
      progress(2, "media", "Fetching stock media...", 0);
      const mediaResults = [];
      for (let i = 0; i < script.scenes.length; i += CONCURRENT_MEDIA) {
        const batch = script.scenes.slice(i, i + CONCURRENT_MEDIA);
        const results = await Promise.all(
          batch.map((scene) => fetchMediaForScene(
            scene.visualDescription, scene.sceneNumber, jobDir, scene.searchKeywords
          ))
        );
        mediaResults.push(...results);
        progress(2, "media", `Fetched media ${mediaResults.length}/${script.scenes.length}`,
          (mediaResults.length / script.scenes.length) * 100);
      }

      // ── Step 3: TTS ──
      progress(3, "tts", "Generating voiceover...", 0);
      const audioResults = [];
      for (let i = 0; i < script.scenes.length; i += CONCURRENT_TTS) {
        const batch = script.scenes.slice(i, i + CONCURRENT_TTS);
        const results = await Promise.all(
          batch.map((scene) =>
            generateSpeech(scene.narration, scene.sceneNumber, jobDir, voiceStyle)
              .then((r) => ({ sceneNumber: scene.sceneNumber, ...r, error: null }))
              .catch((err) => ({ sceneNumber: scene.sceneNumber, error: err.message }))
          )
        );
        audioResults.push(...results);
        progress(3, "tts", `Generated audio ${audioResults.length}/${script.scenes.length}`,
          (audioResults.length / script.scenes.length) * 100);
      }

      // ── Step 4: Render Scenes ──
      progress(4, "render", "Rendering scenes...", 0);
      const sceneFiles = [];
      for (let i = 0; i < script.scenes.length; i++) {
        const scene = script.scenes[i];
        const mediaInfo = mediaResults.find((m) => m.sceneNumber === scene.sceneNumber);
        const audioInfo = audioResults.find((a) => a.sceneNumber === scene.sceneNumber);

        try {
          const file = await renderScene(scene, mediaInfo, audioInfo, jobDir, resolution);
          sceneFiles.push(file);
        } catch (err) {
          console.error(`[RENDER] Scene ${scene.sceneNumber} failed:`, err.message);
          // Continue with other scenes
        }

        progress(4, "render", `Rendered scene ${i + 1}/${script.scenes.length}`,
          ((i + 1) / script.scenes.length) * 100);
      }

      if (sceneFiles.length === 0) {
        throw new Error("No scenes were rendered successfully");
      }

      // ── Step 5: Concatenate ──
      progress(5, "concat", "Assembling final video...", 0);

      // Find background music if requested
      let musicPath = null;
      if (musicMood) {
        const musicFile = path.join("music", `${musicMood}.mp3`);
        try {
          await import("fs/promises").then((fs) => fs.access(musicFile));
          musicPath = musicFile;
        } catch {
          // No music file found, continue without
        }
      }

      const concatPath = await concatenateScenes(sceneFiles, jobDir, jobId, {
        resolution,
        musicPath,
      });

      // Generate SRT subtitles
      const srtPath = await generateSRT(script.scenes, audioResults, jobDir);

      // ── Step 6: Burn auto captions ──
      progress(5, "captions", "Burning auto captions...", 60);

      const w = resolution === "4k" ? 3840 : resolution === "1080p" ? 1920 : 1280;
      const h = resolution === "4k" ? 2160 : resolution === "1080p" ? 1080 : 720;
      const captionedPath = path.join(jobDir, `${jobId}_captioned.mp4`);

      let finalPath = concatPath;
      try {
        await execFileAsync("python3", [
          CAPTION_BURNER, concatPath, srtPath, captionedPath,
          "--width", String(w), "--height", String(h),
        ], { timeout: 600000 });

        // Verify captioned file exists and has size
        const { size } = await import("fs/promises").then((fs) => fs.stat(captionedPath));
        if (size > 0) {
          finalPath = captionedPath;
          console.log(`[PIPELINE] Auto captions burned: ${(size / 1024 / 1024).toFixed(1)}MB`);
        }
      } catch (err) {
        console.warn(`[PIPELINE] Caption burning failed, using video without captions:`, err.message);
        // finalPath stays as concatPath (no captions)
      }

      progress(5, "captions", "Captions done!", 80);

      // ── Step 7: Upload to Supabase ──
      let supabaseVideoUrl = null;
      let supabaseSrtUrl = null;

      if (isSupabaseEnabled()) {
        progress(5, "upload", "Uploading to cloud storage...", 85);
        try {
          const uploaded = await uploadVideoOutput(jobId, finalPath, srtPath);
          supabaseVideoUrl = uploaded.videoUrl;
          supabaseSrtUrl = uploaded.subtitlesUrl;
        } catch (err) {
          console.warn(`[PIPELINE] Supabase upload failed:`, err.message);
        }
      }

      progress(5, "done", "Video complete!", 100);

      const outputUrl = supabaseVideoUrl || `/output/${jobId}/${path.basename(finalPath)}`;
      const srtUrl = supabaseSrtUrl || `/output/${jobId}/subtitles.srt`;

      updateJob(jobId, {
        status: "complete",
        progress: 100,
        currentStep: "done",
        outputPath: finalPath,
      });

      emitComplete(jobId, {
        videoUrl: outputUrl,
        subtitlesUrl: srtUrl,
        supabaseVideoUrl,
        supabaseSrtUrl,
        script,
        duration: script.estimatedTotalDuration,
      });
    } catch (err) {
      console.error(`[PIPELINE] Job ${jobId} failed:`, err);
      updateJob(jobId, { status: "error", error: err.message });
      emitError(jobId, err.message);
    }
  })();

  return jobId;
}

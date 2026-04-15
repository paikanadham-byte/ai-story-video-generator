import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs/promises";
import { ensureDir } from "../utils/helpers.js";
import config from "../config/index.js";

ffmpeg.setFfmpegPath(config.ffmpeg.path || "/usr/local/bin/ffmpeg");
ffmpeg.setFfprobePath(config.ffmpeg.probePath || "/usr/local/bin/ffprobe");

// ─── Get audio duration ───

function getMediaDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration || 4);
    });
  });
}

// ─── Render a single scene ───

export async function renderScene(scene, mediaInfo, audioInfo, jobDir, resolution = "1080p") {
  const sceneDir = path.join(jobDir, "scenes");
  await ensureDir(sceneDir);

  const outputFile = path.join(sceneDir, `scene_${String(scene.sceneNumber).padStart(3, "0")}.mp4`);
  const width = resolution === "1080p" ? 1920 : 1280;
  const height = resolution === "1080p" ? 1080 : 720;

  // Get actual audio duration for scene length
  let duration = scene.estimatedDuration;
  if (audioInfo?.filepath) {
    try {
      duration = await getMediaDuration(audioInfo.filepath);
    } catch {
      // fallback to estimated
    }
  }

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg();

    if (mediaInfo?.media?.localPath) {
      const isVideo = mediaInfo.media.type === "video";

      if (isVideo) {
        // Video input: loop/trim to match audio duration
        cmd = cmd
          .input(mediaInfo.media.localPath)
          .inputOptions(["-stream_loop", "-1"]);
      } else {
        // Image input: create video from image
        cmd = cmd
          .input(mediaInfo.media.localPath)
          .inputOptions(["-loop", "1"]);
      }
    } else {
      // No media: black screen
      cmd = cmd
        .input(`color=c=black:s=${width}x${height}:d=${duration}`)
        .inputOptions(["-f", "lavfi"]);
    }

    // Add audio if available
    if (audioInfo?.filepath) {
      cmd = cmd.input(audioInfo.filepath);
    }

    // Build video filter (scale + pad only — drawtext not available in this FFmpeg build)
    const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;

    cmd
      .outputOptions([
        "-t", String(Math.ceil(duration)),
        "-vf", scaleFilter,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        ...(audioInfo?.filepath ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : ["-an"]),
        "-movflags", "+faststart",
        "-y",
      ])
      .output(outputFile)
      .on("end", () => resolve(outputFile))
      .on("error", (err) => reject(new Error(`FFmpeg scene render error: ${err.message}`)))
      .run();
  });
}

// ─── Concatenate all scene videos ───

export async function concatenateScenes(sceneFiles, jobDir, jobId, options = {}) {
  const { resolution = "1080p", musicPath = null } = options;
  const outputFile = path.join(jobDir, `${jobId}_final.mp4`);

  // Create concat list file
  const listFile = path.join(jobDir, "concat_list.txt");
  const listContent = sceneFiles
    .map((f) => `file '${f.replace(/'/g, "'\\''")}'`)
    .join("\n");
  await fs.writeFile(listFile, listContent);

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg()
      .input(listFile)
      .inputOptions(["-f", "concat", "-safe", "0"]);

    if (musicPath) {
      cmd = cmd.input(musicPath).inputOptions(["-stream_loop", "-1"]);
    }

    const outputOpts = [
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "22",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-y",
    ];

    if (musicPath) {
      // Mix original audio + background music
      outputOpts.push(
        "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=3[aout]",
        "-map", "0:v",
        "-map", "[aout]",
        "-c:a", "aac",
        "-b:a", "192k"
      );
    } else {
      outputOpts.push("-c:a", "aac", "-b:a", "192k");
    }

    cmd
      .outputOptions(outputOpts)
      .output(outputFile)
      .on("end", () => resolve(outputFile))
      .on("error", (err) => reject(new Error(`FFmpeg concat error: ${err.message}`)))
      .run();
  });
}

// ─── Generate SRT subtitles file ───

export async function generateSRT(scenes, audioInfos, jobDir) {
  const srtPath = path.join(jobDir, "subtitles.srt");
  let srt = "";
  let currentTime = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    let duration = scene.estimatedDuration;

    // Try to use actual audio duration
    const audioInfo = audioInfos.find((a) => a.sceneNumber === scene.sceneNumber);
    if (audioInfo?.filepath) {
      try {
        duration = await getMediaDuration(audioInfo.filepath);
      } catch {
        // fallback
      }
    }

    const startSRT = formatSRTTime(currentTime);
    const endSRT = formatSRTTime(currentTime + duration);

    srt += `${i + 1}\n${startSRT} --> ${endSRT}\n${scene.narration}\n\n`;
    currentTime += duration;
  }

  await fs.writeFile(srtPath, srt);
  return srtPath;
}

// ─── Helpers ───

function formatSRTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, "0")}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function escapeFFmpegText(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "'\\\\\\''")
    .replace(/:/g, "\\:")
    .replace(/\n/g, " ")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/;/g, "\\;");
}

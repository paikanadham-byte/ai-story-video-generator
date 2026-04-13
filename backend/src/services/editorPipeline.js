import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs/promises";
import { ensureDir } from "../utils/helpers.js";
import { generateSpeech } from "./ttsEngine.js";
import config from "../config/index.js";

ffmpeg.setFfmpegPath(config.ffmpeg.path || "/usr/bin/ffmpeg");
ffmpeg.setFfprobePath(config.ffmpeg.probePath || "/usr/bin/ffprobe");

// ── Get media duration ──

function getMediaDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration || 0);
    });
  });
}

// ── Escape text for FFmpeg drawtext filter ──

function escapeFFmpegText(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\:")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/%/g, "%%")
    .replace(/\n/g, " ");
}

// ── Build filter chain for selected transforms ──

function buildVideoFilters(transforms, options = {}) {
  const filters = [];

  // Mirror / Flip
  if (transforms.includes("mirror") || transforms.includes("flip")) {
    filters.push("hflip");
  }

  // Speed change
  if (transforms.includes("speed")) {
    const speed = parseFloat(options.speed) || 1.1;
    const pts = (1 / speed).toFixed(4);
    filters.push(`setpts=${pts}*PTS`);
  }

  // Color grading
  if (transforms.includes("color") || transforms.includes("filter")) {
    const colorStyle = options.colorStyle || options.filter || "cinematic";
    switch (colorStyle) {
      case "warm":
        filters.push("colorbalance=rs=0.15:gs=0.05:bs=-0.1");
        break;
      case "cool":
        filters.push("colorbalance=rs=-0.1:gs=0.05:bs=0.15");
        break;
      case "bw":
        filters.push("colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3");
        break;
      case "vintage":
        filters.push("curves=vintage");
        break;
      case "high_contrast":
        filters.push("eq=contrast=1.3:brightness=0.05:saturation=1.2");
        break;
      case "cinematic":
      default:
        filters.push("eq=contrast=1.15:brightness=-0.03:saturation=1.1");
        break;
    }
  }

  // Crop / Resize
  if (transforms.includes("crop") || transforms.includes("resize")) {
    const target = options.platform || options.ratio || "1920x1080";
    let w, h;
    if (target.includes("x")) {
      [w, h] = target.split("x").map(Number);
    } else {
      w = 1920; h = 1080;
    }
    filters.push(
      `scale=${w}:${h}:force_original_aspect_ratio=decrease`,
      `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black`,
      "setsar=1"
    );
  }

  // Ken Burns zoom effect
  if (transforms.includes("zoom")) {
    filters.push("zoompan=z='min(zoom+0.001,1.15)':d=125:s=1920x1080:fps=30");
  }

  // Text overlay / Watermark
  if (transforms.includes("watermark")) {
    const text = escapeFFmpegText(options.watermarkText || "");
    if (text) {
      filters.push(
        `drawtext=text='${text}':fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=50`
      );
    }
  }

  return filters;
}

function buildAudioFilters(transforms, options = {}) {
  const filters = [];

  if (transforms.includes("speed")) {
    const speed = parseFloat(options.speed) || 1.1;
    filters.push(`atempo=${speed}`);
  }

  return filters;
}

// ═══════════════════════════════════════
// Main transform function
// ═══════════════════════════════════════

export async function runEditorTransform(inputPath, outputDir, transforms, options = {}, onProgress) {
  await ensureDir(outputDir);

  const outputFile = path.join(outputDir, "transformed.mp4");
  let currentInput = inputPath;

  const totalSteps = transforms.length;
  let completedSteps = 0;

  const report = (detail) => {
    completedSteps++;
    const pct = Math.round((completedSteps / (totalSteps + 1)) * 100);
    if (onProgress) onProgress(pct, detail);
  };

  // ── Step: Re-voice (requires separate TTS pipeline) ──
  if (transforms.includes("revoice")) {
    if (onProgress) onProgress(5, "Generating new AI voiceover...");

    const voiceStyle = options.voiceStyle || "male_deep";
    const revoiceText = options.revoiceText || "This video has been re-voiced with AI narration.";
    const duration = await getMediaDuration(currentInput);

    try {
      const audioResult = await generateSpeech(revoiceText, 1, outputDir, voiceStyle);

      // Replace audio track
      const revoicedFile = path.join(outputDir, "revoiced.mp4");
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(currentInput)
          .input(audioResult.filepath)
          .outputOptions([
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            "-y",
          ])
          .output(revoicedFile)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });
      currentInput = revoicedFile;
    } catch (err) {
      console.error("[EDITOR] Re-voice failed:", err.message);
    }

    report("AI voiceover applied");
  }

  // ── Step: Replace music ──
  if (transforms.includes("music")) {
    if (onProgress) onProgress(15, "Generating silent video for music replacement...");

    // Strip existing audio, then add new track if available
    const silentFile = path.join(outputDir, "no_audio.mp4");
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(currentInput)
        .outputOptions(["-c:v", "copy", "-an", "-y"])
        .output(silentFile)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Check if we have a music file
    const musicMood = options.musicMood || "calm";
    const musicFile = path.resolve("music", `${musicMood}.mp3`);
    let hasMusicFile = false;
    try {
      await fs.access(musicFile);
      hasMusicFile = true;
    } catch {
      // no music file
    }

    if (hasMusicFile) {
      const musicedFile = path.join(outputDir, "with_music.mp4");
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(silentFile)
          .input(musicFile)
          .inputOptions(["-stream_loop", "-1"])
          .outputOptions([
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-y",
          ])
          .output(musicedFile)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });
      currentInput = musicedFile;
    } else {
      // No music file — just use the silent version (original audio removed)
      currentInput = silentFile;
    }

    report("Music replaced");
  }

  // ── Step: Subtitles ──
  if (transforms.includes("subtitles")) {
    if (onProgress) onProgress(30, "Burning subtitles into video...");

    const subtitleText = options.subtitleText || "Subtitles generated by StoryForge AI";
    const escapedText = escapeFFmpegText(subtitleText);

    const subbedFile = path.join(outputDir, "subtitled.mp4");
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(currentInput)
        .outputOptions([
          "-vf", `drawtext=text='${escapedText}':fontsize=24:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-80`,
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "23",
          "-c:a", "copy",
          "-y",
        ])
        .output(subbedFile)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });
    currentInput = subbedFile;
    report("Subtitles burned");
  }

  // ── Step: Apply video+audio filters (mirror, speed, color, crop, zoom, watermark) ──
  const filterTransforms = transforms.filter(
    (t) => ["mirror", "flip", "speed", "color", "filter", "crop", "resize", "zoom", "watermark"].includes(t)
  );

  if (filterTransforms.length > 0) {
    if (onProgress) onProgress(50, `Applying ${filterTransforms.join(", ")}...`);

    const vFilters = buildVideoFilters(filterTransforms, options);
    const aFilters = buildAudioFilters(filterTransforms, options);

    const filteredFile = path.join(outputDir, "filtered.mp4");

    await new Promise((resolve, reject) => {
      const cmd = ffmpeg().input(currentInput);

      const outputOpts = [
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-y",
      ];

      if (vFilters.length > 0) {
        outputOpts.push("-vf", vFilters.join(","));
      }

      if (aFilters.length > 0) {
        outputOpts.push("-af", aFilters.join(","));
        outputOpts.push("-c:a", "aac", "-b:a", "192k");
      } else {
        outputOpts.push("-c:a", "copy");
      }

      cmd
        .outputOptions(outputOpts)
        .output(filteredFile)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    currentInput = filteredFile;
    filterTransforms.forEach((t) => report(`${t} applied`));
  }

  // ── Step: Trim ──
  if (transforms.includes("trim")) {
    if (onProgress) onProgress(80, "Trimming video...");

    const startTime = parseFloat(options.trimStart) || 0;
    const endTime = parseFloat(options.trimEnd) || 0;

    if (endTime > startTime) {
      const trimmedFile = path.join(outputDir, "trimmed.mp4");
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(currentInput)
          .inputOptions(["-ss", String(startTime)])
          .outputOptions([
            "-t", String(endTime - startTime),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "192k",
            "-y",
          ])
          .output(trimmedFile)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });
      currentInput = trimmedFile;
    }
    report("Trimmed");
  }

  // ── Final: copy to output ──
  if (onProgress) onProgress(90, "Finalizing output...");

  if (currentInput !== outputFile) {
    await fs.copyFile(currentInput, outputFile);
  }

  if (onProgress) onProgress(100, "Transform complete!");

  return outputFile;
}

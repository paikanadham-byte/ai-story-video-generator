import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuid } from "uuid";
import { ensureDir } from "../utils/helpers.js";
import { createJob, updateJob, getJob } from "../utils/jobStore.js";
import { emitProgress, emitComplete, emitError } from "../websocket.js";
import { runEditorTransform } from "../services/editorPipeline.js";
import { uploadEditorOutput } from "../utils/supabase.js";

const router = Router();

// Ensure uploads directory exists on import
ensureDir("output/uploads").catch(() => {});

const upload = multer({
  dest: "output/uploads/",
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are accepted"));
  },
});

/**
 * POST /api/editor/upload
 * Upload a video for editing
 */
router.post("/upload", upload.single("video"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    // Rename to keep original extension
    const ext = path.extname(req.file.originalname) || ".mp4";
    const newPath = req.file.path + ext;
    await fs.rename(req.file.path, newPath);

    res.json({
      id: req.file.filename,
      originalName: req.file.originalname,
      path: newPath,
      size: req.file.size,
      url: `/output/uploads/${req.file.filename}${ext}`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/editor/download-url
 * Download a video from a URL to the server for transformation
 * Body: { url: "https://..." }
 */
router.post("/download-url", async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return res.status(400).json({ error: "Invalid URL. Must be http:// or https://" });
    }

    const uploadDir = path.resolve("output/uploads");
    await ensureDir(uploadDir);

    // Determine filename from URL or use UUID
    const urlPath = parsedUrl.pathname;
    let ext = path.extname(urlPath).toLowerCase();
    if (![".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext)) {
      ext = ".mp4";
    }
    const fileId = uuid().slice(0, 12);
    const filePath = path.join(uploadDir, `${fileId}${ext}`);

    // Download the file
    const response = await fetch(url, {
      headers: { "User-Agent": "StoryForge-VideoEditor/1.0" },
      signal: AbortSignal.timeout(120000), // 2 min timeout
    });

    if (!response.ok) {
      return res.status(400).json({ error: `Failed to download: HTTP ${response.status}` });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("video") && !contentType.includes("octet-stream")) {
      // Still try to download — some servers don't set proper content-type
      console.warn(`[EDITOR] URL content-type is "${contentType}", attempting download anyway`);
    }

    // Stream to file
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 1000) {
      return res.status(400).json({ error: "Downloaded file is too small — may not be a valid video" });
    }

    await fs.writeFile(filePath, buffer);

    res.json({
      id: fileId,
      originalName: path.basename(urlPath) || `video${ext}`,
      path: filePath,
      size: buffer.length,
      url: `/output/uploads/${fileId}${ext}`,
    });
  } catch (err) {
    if (err.name === "TimeoutError") {
      return res.status(408).json({ error: "Download timed out — URL took too long to respond" });
    }
    next(err);
  }
});

/**
 * POST /api/editor/transform
 * Apply real FFmpeg transformations to a video
 * Body: { videoPath, transforms: ["mirror", "speed", "color", ...], options: {} }
 */
router.post("/transform", async (req, res, next) => {
  try {
    const { videoPath, transforms, options } = req.body;

    if (!videoPath || !transforms || !Array.isArray(transforms)) {
      return res.status(400).json({ error: "videoPath and transforms[] required" });
    }

    // Resolve input path — could be an upload URL or absolute path
    let inputPath;
    if (videoPath.startsWith("/output/")) {
      inputPath = path.resolve(videoPath.slice(1)); // strip leading /
    } else if (videoPath.startsWith("output/")) {
      inputPath = path.resolve(videoPath);
    } else {
      inputPath = path.resolve(videoPath);
    }

    // Verify input exists
    try {
      await fs.access(inputPath);
    } catch {
      return res.status(400).json({ error: "Video file not found on server. Please upload first." });
    }

    const jobId = uuid();
    const outputDir = path.resolve("output", jobId);
    await ensureDir(outputDir);

    const job = createJob(jobId);
    updateJob(jobId, { status: "processing", currentStep: "transform" });

    // Respond immediately — processing happens async
    res.json({
      jobId,
      status: "processing",
      transforms,
      message: "Transform started. Connect via WebSocket for progress.",
    });

    // Run transform pipeline async with WebSocket progress
    (async () => {
      try {
        const outputFile = await runEditorTransform(
          inputPath,
          outputDir,
          transforms,
          options || {},
          (pct, detail) => {
            updateJob(jobId, { progress: pct, currentStep: "transform" });
            emitProgress(jobId, { step: "transform", detail, progress: pct });
          }
        );

        const localUrl = `/output/${jobId}/${path.basename(outputFile)}`;

        // Upload to Supabase if available
        const supabaseUrl = await uploadEditorOutput(jobId, outputFile).catch(() => null);
        const outputUrl = supabaseUrl || localUrl;

        updateJob(jobId, {
          status: "complete",
          progress: 100,
          currentStep: "done",
          outputPath: outputFile,
        });

        emitComplete(jobId, {
          videoUrl: outputUrl,
          supabaseUrl,
          transforms,
        });
      } catch (err) {
        console.error(`[EDITOR] Transform job ${jobId} failed:`, err);
        updateJob(jobId, { status: "error", error: err.message });
        emitError(jobId, err.message);
      }
    })();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/editor/job/:jobId
 * Check transform job status
 */
router.get("/job/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

export default router;

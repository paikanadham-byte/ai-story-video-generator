import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuid } from "uuid";
import { exec } from "child_process";
import { promisify } from "util";
import { ensureDir } from "../utils/helpers.js";

const execAsync = promisify(exec);
const router = Router();

ensureDir("output/uploads").catch(() => {});
ensureDir("output/vocal").catch(() => {});

const upload = multer({
  dest: "output/uploads/",
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio or video files are accepted"));
    }
  },
});

/**
 * POST /api/vocal/separate
 * Upload audio/video and separate vocals from instrumentals
 */
router.post("/separate", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const jobId = uuid();
    const outDir = path.resolve(`output/vocal/${jobId}`);
    await ensureDir(outDir);

    const ext = path.extname(req.file.originalname) || ".mp3";
    const inputPath = req.file.path + ext;
    await fs.rename(req.file.path, inputPath);

    const vocalsPath = path.join(outDir, "vocals.mp3");
    const instrumentalPath = path.join(outDir, "instrumental.mp3");

    // Extract audio from video if needed (get stereo wav first for best quality)
    const wavPath = path.join(outDir, "source.wav");
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -vn -ac 2 -ar 44100 -acodec pcm_s16le "${wavPath}"`
    );

    // Instrumental: phase cancellation removes center-panned content (vocals)
    await execAsync(
      `ffmpeg -y -i "${wavPath}" -af "pan=stereo|c0=c0-c1|c1=c1-c0" -b:a 192k "${instrumentalPath}"`
    );

    // Vocals: subtract instrumental from original to isolate center content
    await execAsync(
      `ffmpeg -y -i "${wavPath}" -i "${instrumentalPath}" -filter_complex "[0:a][1:a]amerge=inputs=2,pan=stereo|c0=c0-c2|c1=c1-c3[out]" -map "[out]" -b:a 192k "${vocalsPath}"`
    );

    // Clean up source files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(wavPath).catch(() => {});

    res.json({
      jobId,
      vocals: `/output/vocal/${jobId}/vocals.mp3`,
      instrumental: `/output/vocal/${jobId}/instrumental.mp3`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

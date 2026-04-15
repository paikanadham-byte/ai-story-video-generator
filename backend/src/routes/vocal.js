import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { v4 as uuid } from "uuid";
import { exec } from "child_process";
import { promisify } from "util";
import { ensureDir } from "../utils/helpers.js";

const execAsync = promisify(exec);
const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEPARATOR_SCRIPT = path.resolve(__dirname, "../services/vocal_separator.py");
const FFMPEG = process.env.FFMPEG_PATH || "/usr/local/bin/ffmpeg";

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
 * Upload audio/video and separate vocals from instrumentals using STFT spectral masking
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

    // Step 1: decode to high-quality stereo WAV (required by separator)
    const wavPath = path.join(outDir, "source.wav");
    await execAsync(
      `"${FFMPEG}" -y -i "${inputPath}" -vn -ac 2 -ar 44100 -acodec pcm_s16le "${wavPath}"`,
      { timeout: 120000 }
    );

    // Step 2: run STFT-based spectral masking separator (much better than phase cancellation)
    const voxWav  = path.join(outDir, "vocals_raw.wav");
    const instWav = path.join(outDir, "instrumental_raw.wav");

    await execAsync(
      `python3 "${SEPARATOR_SCRIPT}" "${wavPath}" "${voxWav}" "${instWav}"`,
      { timeout: 300000 }  // allow up to 5 min for long tracks
    );

    // Step 3: encode WAV stems to MP3 at 320kbps
    const vocalsPath       = path.join(outDir, "vocals.mp3");
    const instrumentalPath = path.join(outDir, "instrumental.mp3");

    await Promise.all([
      execAsync(`"${FFMPEG}" -y -i "${voxWav}"  -b:a 320k "${vocalsPath}"`, { timeout: 60000 }),
      execAsync(`"${FFMPEG}" -y -i "${instWav}" -b:a 320k "${instrumentalPath}"`, { timeout: 60000 }),
    ]);

    // Cleanup
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(wavPath).catch(() => {}),
      fs.unlink(voxWav).catch(() => {}),
      fs.unlink(instWav).catch(() => {}),
    ]);

    res.json({
      jobId,
      vocals:       `/output/vocal/${jobId}/vocals.mp3`,
      instrumental: `/output/vocal/${jobId}/instrumental.mp3`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

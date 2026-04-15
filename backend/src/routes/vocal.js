import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { v4 as uuid } from "uuid";
import { exec, execSync } from "child_process";
import { promisify } from "util";
import { ensureDir } from "../utils/helpers.js";

const execAsync = promisify(exec);
const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEPARATOR_SCRIPT = path.resolve(__dirname, "../services/vocal_separator.py");
const FFMPEG = process.env.FFMPEG_PATH || "/usr/local/bin/ffmpeg";

/**
 * Detect the best available Python interpreter at server startup.
 * Prefers Python 3.12 (needed for audio-separator AI models).
 * Falls back to python3 which uses the REPET+MidSide DSP path.
 */
function detectPython() {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;

  const candidates = [
    // Homebrew Python 3.12 — Intel Mac
    "/usr/local/opt/python@3.12/bin/python3.12",
    // Homebrew Python 3.12 — Apple Silicon Mac
    "/opt/homebrew/opt/python@3.12/bin/python3.12",
    // In PATH (works if brew linked it)
    "python3.12",
    // Last resort — Python 3.14 (uses REPET DSP fallback, no AI)
    "python3",
  ];

  for (const py of candidates) {
    try {
      execSync(`"${py}" --version`, { timeout: 3000, stdio: "ignore" });
      console.log(`[VOCAL] Using Python: ${py}`);
      return py;
    } catch {
      // not found, try next
    }
  }
  return "python3";
}

const PYTHON = detectPython();

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
      `"${PYTHON}" "${SEPARATOR_SCRIPT}" "${wavPath}" "${voxWav}" "${instWav}"`,
      { timeout: 300000 }  // allow up to 5 min (includes model download on first run)
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

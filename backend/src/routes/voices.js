import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuid } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import { getAvailableVoices } from "../services/ttsEngine.js";
import { uploadVoiceSample } from "../utils/supabase.js";

const router = Router();
const VOICES_DIR = path.resolve("data/voices");

// Ensure voices dir exists
await fs.mkdir(VOICES_DIR, { recursive: true });

// Configure multer for voice sample uploads (50MB limit)
const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      const tmpDir = path.join(VOICES_DIR, "_tmp");
      await fs.mkdir(tmpDir, { recursive: true });
      cb(null, tmpDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".webm";
      cb(null, `upload_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Only audio files are allowed"));
  },
});

// ── Analyze audio sample to extract characteristics ──
function analyzeAudio(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const audioStream = metadata.streams.find((s) => s.codec_type === "audio");
      resolve({
        duration: metadata.format.duration || 0,
        sampleRate: audioStream?.sample_rate || 44100,
        channels: audioStream?.channels || 1,
        bitRate: audioStream?.bit_rate || 128000,
        codec: audioStream?.codec_name || "unknown",
      });
    });
  });
}

// ── Convert uploaded audio to normalized WAV ──
function convertToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-ar", "22050",
        "-ac", "1",
        "-acodec", "pcm_s16le",
        "-y",
      ])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .run();
  });
}

// Edge-TTS voice profiles for matching
const VOICE_PROFILES = [
  { id: "en-US-AndrewMultilingualNeural", gender: "male", style: "warm", pitch: "medium" },
  { id: "en-US-ChristopherNeural", gender: "male", style: "deep", pitch: "low" },
  { id: "en-US-GuyNeural", gender: "male", style: "narrator", pitch: "medium" },
  { id: "en-US-BrianNeural", gender: "male", style: "casual", pitch: "medium-high" },
  { id: "en-US-EricNeural", gender: "male", style: "neutral", pitch: "medium" },
  { id: "en-US-AvaNeural", gender: "female", style: "warm", pitch: "medium" },
  { id: "en-US-JennyNeural", gender: "female", style: "bright", pitch: "medium-high" },
  { id: "en-US-AriaNeural", gender: "female", style: "confident", pitch: "medium" },
  { id: "en-US-EmmaNeural", gender: "female", style: "cheerful", pitch: "high" },
];

/**
 * POST /api/voices/clone
 * Upload a voice sample and create a cloned voice profile
 */
router.post("/clone", upload.single("sample"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file uploaded" });

    const { name, gender, style } = req.body;
    if (!name || !name.trim()) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: "Voice name is required" });
    }

    const voiceId = `clone_${uuid().slice(0, 8)}`;
    const voiceDir = path.join(VOICES_DIR, voiceId);
    await fs.mkdir(voiceDir, { recursive: true });

    // Convert to normalized WAV
    const wavPath = path.join(voiceDir, "sample.wav");
    await convertToWav(req.file.path, wavPath);

    // Also keep original for playback
    const origExt = path.extname(req.file.originalname) || ".webm";
    const origPath = path.join(voiceDir, `original${origExt}`);
    await fs.rename(req.file.path, origPath);

    // Analyze audio characteristics
    const analysis = await analyzeAudio(wavPath);

    // Match to closest edge-tts voice
    const genderPref = (gender || "male").toLowerCase();
    const stylePref = (style || "warm").toLowerCase();
    const matchedVoices = VOICE_PROFILES.filter((v) => v.gender === genderPref);
    const matched = matchedVoices.find((v) => v.style === stylePref)
      || matchedVoices[0]
      || VOICE_PROFILES[0];

    // Rate/pitch adjustments (slight variations to personalize)
    const rateAdjust = "+0%"; // Can be tuned: "-10%" to "+10%"
    const pitchAdjust = "+0Hz"; // Can be tuned: "-50Hz" to "+50Hz"

    // Save metadata
    const meta = {
      id: voiceId,
      name: name.trim(),
      gender: genderPref,
      style: stylePref,
      baseVoice: matched.id,
      rateAdjust,
      pitchAdjust,
      sampleDuration: analysis.duration,
      samplePath: wavPath,
      originalPath: origPath,
      createdAt: new Date().toISOString(),
      status: "ready",
    };

    await fs.writeFile(path.join(voiceDir, "meta.json"), JSON.stringify(meta, null, 2));

    // Upload to Supabase Storage
    const supabaseUrl = await uploadVoiceSample(voiceId, wavPath).catch(() => null);

    res.json({
      voice: {
        id: meta.id,
        name: meta.name,
        gender: meta.gender,
        style: meta.style,
        baseVoice: meta.baseVoice,
        sampleDuration: Math.round(meta.sampleDuration),
        createdAt: meta.createdAt,
        status: meta.status,
      },
    });
  } catch (err) {
    // Clean up upload on error
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    next(err);
  }
});

/**
 * GET /api/voices
 * List all voices (standard + cloned)
 */
router.get("/", async (_req, res, next) => {
  try {
    const standardVoices = getAvailableVoices();
    const clonedVoices = await getClonedVoices();

    res.json({
      standard: standardVoices,
      cloned: clonedVoices,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/voices/cloned
 * List only cloned voices
 */
router.get("/cloned", async (_req, res, next) => {
  try {
    const cloned = await getClonedVoices();
    res.json({ voices: cloned });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/voices/cloned/:id
 * Delete a cloned voice
 */
router.delete("/cloned/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id.startsWith("clone_")) {
      return res.status(400).json({ error: "Can only delete cloned voices" });
    }

    const voiceDir = path.join(VOICES_DIR, id);
    try {
      await fs.access(voiceDir);
    } catch {
      return res.status(404).json({ error: "Voice not found" });
    }

    await fs.rm(voiceDir, { recursive: true, force: true });
    res.json({ success: true, deleted: id });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/voices/preview
 * Generate a short TTS preview with a specific voice
 */
router.post("/preview", async (req, res, next) => {
  try {
    const { voiceId, text } = req.body;
    const previewText = (text || "Hello! This is a preview of my cloned voice.").slice(0, 200);

    const { generateSpeechWithVoice } = await import("../services/ttsEngine.js");
    const tmpDir = path.join(VOICES_DIR, "_previews");
    await fs.mkdir(tmpDir, { recursive: true });

    const filename = `preview_${Date.now()}.mp3`;
    const filepath = path.join(tmpDir, filename);

    await generateSpeechWithVoice(previewText, filepath, voiceId);

    res.sendFile(filepath);
  } catch (err) {
    next(err);
  }
});

// ── Helper: Load all cloned voices from disk ──
async function getClonedVoices() {
  const voices = [];
  try {
    const entries = await fs.readdir(VOICES_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
      try {
        const metaPath = path.join(VOICES_DIR, entry.name, "meta.json");
        const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
        voices.push({
          id: meta.id,
          name: meta.name,
          gender: meta.gender,
          style: meta.style,
          baseVoice: meta.baseVoice,
          sampleDuration: Math.round(meta.sampleDuration || 0),
          createdAt: meta.createdAt,
          status: meta.status,
        });
      } catch {
        // Skip invalid entries
      }
    }
  } catch {
    // No voices directory yet
  }
  return voices;
}

export { getClonedVoices };
export default router;

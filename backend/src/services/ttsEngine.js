import OpenAI from "openai";
import { spawn } from "child_process";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import config from "../config/index.js";
import { ensureDir } from "../utils/helpers.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TTS_HELPER = path.join(__dirname, "tts_helper.py");

// ─── Run edge-tts via helper script (reads text from stdin, avoids CLI bugs) ───

function runEdgeTTS(text, voice, outputPath, rate = "+0%", pitch = "+0Hz") {
  return new Promise((resolve, reject) => {
    const args = [TTS_HELPER, voice, outputPath];
    if (rate && rate !== "+0%") args.push("--rate", rate);
    if (pitch && pitch !== "+0Hz") args.push("--pitch", pitch);

    const proc = spawn("python3", args, { timeout: 60000 });
    let stderr = "";

    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`TTS failed (code ${code}): ${stderr.slice(0, 200)}`));
    });
    proc.on("error", (err) => reject(err));

    proc.stdin.write(text);
    proc.stdin.end();
  });
}

// ─── OpenAI voices ───

const OPENAI_VOICE_MAP = {
  male_deep: "onyx",
  male_warm: "echo",
  female_warm: "nova",
  female_bright: "shimmer",
  neutral: "alloy",
  storyteller: "fable",
};

// ─── Edge-TTS voices (FREE) ───

const EDGE_VOICE_MAP = {
  male_deep: "en-US-ChristopherNeural",
  male_warm: "en-US-AndrewNeural",
  male_casual: "en-US-BrianNeural",
  male_narrator: "en-US-GuyNeural",
  female_warm: "en-US-AvaNeural",
  female_bright: "en-US-JennyNeural",
  female_confident: "en-US-AriaNeural",
  female_cheerful: "en-US-EmmaNeural",
  neutral: "en-US-EricNeural",
  storyteller: "en-US-AndrewMultilingualNeural",
};

export function getAvailableVoices() {
  const provider = config.tts.provider;

  if (provider === "edge") {
    return Object.entries(EDGE_VOICE_MAP).map(([key, value]) => ({
      id: key,
      label: key.replace(/_/g, " "),
      voice: value,
      provider: "edge",
      free: true,
    }));
  }

  return Object.entries(OPENAI_VOICE_MAP).map(([key, value]) => ({
    id: key,
    label: key.replace(/_/g, " "),
    voice: value,
    provider: "openai",
    free: false,
  }));
}

// ─── Unified speech generation ───

export async function generateSpeech(text, sceneNumber, jobDir, voiceStyle = null) {
  // Check if it's a cloned voice
  if (voiceStyle && voiceStyle.startsWith("clone_")) {
    return generateSpeechCloned(text, sceneNumber, jobDir, voiceStyle);
  }

  const provider = config.tts.provider;

  if (provider === "edge") {
    return generateSpeechEdge(text, sceneNumber, jobDir, voiceStyle);
  }
  return generateSpeechOpenAI(text, sceneNumber, jobDir, voiceStyle);
}

// ─── Generate speech with a specific voice ID (used by clone preview) ───

export async function generateSpeechWithVoice(text, outputPath, voiceId) {
  if (voiceId && voiceId.startsWith("clone_")) {
    const meta = await loadCloneMeta(voiceId);
    if (!meta) throw new Error(`Cloned voice ${voiceId} not found`);
    await runEdgeTTS(text, meta.baseVoice, outputPath, meta.rateAdjust, meta.pitchAdjust);
    return;
  }

  // Standard voice
  const voice = EDGE_VOICE_MAP[voiceId] || EDGE_VOICE_MAP.storyteller;
  await runEdgeTTS(text, voice, outputPath);
}

// ─── Load clone metadata from disk ───

async function loadCloneMeta(cloneId) {
  try {
    const metaPath = path.join("data/voices", cloneId, "meta.json");
    const raw = await fs.readFile(path.resolve(metaPath), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Cloned voice TTS (edge-tts with matched voice + adjustments) ───

async function generateSpeechCloned(text, sceneNumber, jobDir, cloneId) {
  const meta = await loadCloneMeta(cloneId);
  if (!meta) throw new Error(`Cloned voice ${cloneId} not found`);

  const filename = `scene_${String(sceneNumber).padStart(3, "0")}_audio.mp3`;
  const audioDir = path.join(jobDir, "audio");
  await ensureDir(audioDir);
  const filepath = path.join(audioDir, filename);

  await runEdgeTTS(text, meta.baseVoice, filepath, meta.rateAdjust, meta.pitchAdjust);
  await fs.access(filepath);

  return { filepath, filename };
}

// ─── OpenAI TTS (paid) ───

async function generateSpeechOpenAI(text, sceneNumber, jobDir, voiceStyle) {
  const openai = new OpenAI({ apiKey: config.openai.apiKey });
  const voice = voiceStyle
    ? OPENAI_VOICE_MAP[voiceStyle] || config.tts.defaultVoice
    : config.tts.defaultVoice;

  const filename = `scene_${String(sceneNumber).padStart(3, "0")}_audio.mp3`;
  const audioDir = path.join(jobDir, "audio");
  await ensureDir(audioDir);
  const filepath = path.join(audioDir, filename);

  const response = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice,
    input: text,
    response_format: "mp3",
    speed: 1.0,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  return { filepath, filename };
}

// ─── Edge-TTS (FREE) ───

async function generateSpeechEdge(text, sceneNumber, jobDir, voiceStyle) {
  const voice = voiceStyle
    ? EDGE_VOICE_MAP[voiceStyle] || EDGE_VOICE_MAP.storyteller
    : EDGE_VOICE_MAP.storyteller;

  const filename = `scene_${String(sceneNumber).padStart(3, "0")}_audio.mp3`;
  const audioDir = path.join(jobDir, "audio");
  await ensureDir(audioDir);
  const filepath = path.join(audioDir, filename);

  await runEdgeTTS(text, voice, filepath);

  // Verify file was created
  await fs.access(filepath);

  return { filepath, filename };
}

export async function generateAllSpeech(scenes, jobDir, voiceStyle, onProgress) {
  const results = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    try {
      const result = await generateSpeech(
        scene.narration,
        scene.sceneNumber,
        jobDir,
        voiceStyle
      );
      results.push({ sceneNumber: scene.sceneNumber, ...result, error: null });
    } catch (err) {
      results.push({ sceneNumber: scene.sceneNumber, error: err.message });
    }

    if (onProgress) {
      onProgress(i + 1, scenes.length);
    }
  }

  return results;
}

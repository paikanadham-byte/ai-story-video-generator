import { Router } from "express";
import OpenAI from "openai";
import config from "../config/index.js";
import { readFile } from "fs/promises";
import path from "path";

const router = Router();

const openai = new OpenAI({
  apiKey: config.llm.apiKey,
  baseURL: config.llm.baseUrl,
});

/**
 * POST /api/pro/seo
 * Generate SEO title, description, and tags from a script/title
 */
router.post("/seo", async (req, res, next) => {
  try {
    const { title, genre, scenes } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const sceneText = (scenes || []).slice(0, 5).map(s => s.narration).join(" ");
    const prompt = `You are a YouTube SEO expert. Given this video info, generate optimized metadata.

Title: ${title}
Genre: ${genre || "general"}
Content preview: ${sceneText.slice(0, 500)}

Return ONLY valid JSON:
{
  "seoTitle": "optimized clickbait-worthy title under 70 chars",
  "description": "SEO-optimized YouTube description 150-300 words with keywords, timestamps placeholder, and call to action",
  "tags": ["tag1", "tag2", ... up to 15 relevant tags],
  "hashtags": ["#hashtag1", "#hashtag2", ... up to 5]
}`;

    const response = await openai.chat.completions.create({
      model: config.llm.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: "LLM returned empty response" });

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else return res.status(502).json({ error: "Failed to parse SEO response" });
    }

    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/pro/thumbnail-prompt
 * Generate a thumbnail description/prompt from video content
 */
router.post("/thumbnail-prompt", async (req, res, next) => {
  try {
    const { title, genre, scenes } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const sceneText = (scenes || []).slice(0, 3).map(s => s.visualDescription || s.narration).join(". ");

    const prompt = `You are a YouTube thumbnail design expert. Given this video, generate 3 thumbnail concepts.

Title: ${title}
Genre: ${genre || "general"}
Visual scenes: ${sceneText.slice(0, 400)}

Return ONLY valid JSON:
{
  "thumbnails": [
    {
      "concept": "short concept name",
      "description": "detailed visual description of the thumbnail",
      "textOverlay": "bold text to put on the thumbnail (2-5 words)",
      "colorScheme": "primary colors to use",
      "style": "photorealistic | illustrated | cinematic | dramatic"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: config.llm.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 800,
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: "LLM returned empty response" });

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else return res.status(502).json({ error: "Failed to parse thumbnail response" });
    }

    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/pro/translate
 * Translate a script to another language
 */
router.post("/translate", async (req, res, next) => {
  try {
    const { scenes, targetLanguage } = req.body;
    if (!scenes || !targetLanguage) {
      return res.status(400).json({ error: "scenes and targetLanguage required" });
    }

    const narrations = scenes.map((s, i) => `[${i}] ${s.narration}`).join("\n");

    const prompt = `Translate these video narrations to ${targetLanguage}. Keep the same tone, emotion, and pacing.

${narrations}

Return ONLY valid JSON:
{
  "translations": [
    { "index": 0, "narration": "translated text" },
    ...
  ],
  "language": "${targetLanguage}"
}`;

    const response = await openai.chat.completions.create({
      model: config.llm.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: "LLM returned empty response" });

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else return res.status(502).json({ error: "Failed to parse translation" });
    }

    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/pro/languages
 * List supported TTS languages
 */
router.get("/languages", (_req, res) => {
  res.json({
    languages: [
      { code: "en", name: "English", voices: ["en-US-AndrewNeural", "en-US-JennyNeural", "en-GB-RyanNeural"] },
      { code: "es", name: "Spanish", voices: ["es-ES-AlvaroNeural", "es-MX-DaliaNeural"] },
      { code: "fr", name: "French", voices: ["fr-FR-HenriNeural", "fr-FR-DeniseNeural"] },
      { code: "de", name: "German", voices: ["de-DE-ConradNeural", "de-DE-KatjaNeural"] },
      { code: "hi", name: "Hindi", voices: ["hi-IN-MadhurNeural", "hi-IN-SwaraNeural"] },
      { code: "ar", name: "Arabic", voices: ["ar-SA-HamedNeural", "ar-SA-ZariyahNeural"] },
      { code: "pt", name: "Portuguese", voices: ["pt-BR-AntonioNeural", "pt-BR-FranciscaNeural"] },
      { code: "ja", name: "Japanese", voices: ["ja-JP-KeitaNeural", "ja-JP-NanamiNeural"] },
      { code: "ko", name: "Korean", voices: ["ko-KR-InJoonNeural", "ko-KR-SunHiNeural"] },
      { code: "zh", name: "Chinese", voices: ["zh-CN-YunxiNeural", "zh-CN-XiaoxiaoNeural"] },
      { code: "it", name: "Italian", voices: ["it-IT-DiegoNeural", "it-IT-ElsaNeural"] },
      { code: "ru", name: "Russian", voices: ["ru-RU-DmitryNeural", "ru-RU-SvetlanaNeural"] },
      { code: "tr", name: "Turkish", voices: ["tr-TR-AhmetNeural", "tr-TR-EmelNeural"] },
      { code: "nl", name: "Dutch", voices: ["nl-NL-MaartenNeural", "nl-NL-ColetteNeural"] },
      { code: "pl", name: "Polish", voices: ["pl-PL-MarekNeural", "pl-PL-ZofiaNeural"] },
      { code: "sv", name: "Swedish", voices: ["sv-SE-MattiasNeural", "sv-SE-SofieNeural"] },
      { code: "th", name: "Thai", voices: ["th-TH-NiwatNeural", "th-TH-PremwadeeNeural"] },
      { code: "vi", name: "Vietnamese", voices: ["vi-VN-NamMinhNeural", "vi-VN-HoaiMyNeural"] },
      { code: "id", name: "Indonesian", voices: ["id-ID-ArdiNeural", "id-ID-GadisNeural"] },
      { code: "uk", name: "Ukrainian", voices: ["uk-UA-OstapNeural", "uk-UA-PolinaNeural"] },
    ],
  });
});

/**
 * GET /api/pro/api-key
 * Get or generate API key (local/personal use)
 */
router.get("/api-key", (_req, res) => {
  // For personal local use, just return a static key
  res.json({
    apiKey: "sfai_local_" + Buffer.from(config.llm.apiKey?.slice(-8) || "personal").toString("base64url"),
    baseUrl: `http://localhost:${config.port}/api`,
    endpoints: [
      { method: "POST", path: "/api/generate", desc: "Start video generation pipeline" },
      { method: "POST", path: "/api/generate/ideas", desc: "Get AI story ideas" },
      { method: "GET", path: "/api/generate/:jobId/status", desc: "Check job status" },
      { method: "POST", path: "/api/editor/upload", desc: "Upload video for editing" },
      { method: "POST", path: "/api/editor/transform", desc: "Apply transforms to video" },
      { method: "POST", path: "/api/pro/seo", desc: "Generate SEO title/desc/tags" },
      { method: "POST", path: "/api/pro/thumbnail-prompt", desc: "Generate thumbnail concepts" },
      { method: "POST", path: "/api/pro/translate", desc: "Translate script to another language" },
      { method: "GET", path: "/api/pro/languages", desc: "List supported languages" },
      { method: "GET", path: "/api/media/search?q=query", desc: "Search stock media" },
      { method: "GET", path: "/api/media/voices", desc: "List available voices" },
    ],
  });
});

export default router;

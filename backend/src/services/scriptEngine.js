import OpenAI from "openai";
import config from "../config/index.js";

const llm = new OpenAI({
  apiKey: config.llm.apiKey,
  baseURL: config.llm.provider === "openrouter" ? config.llm.baseUrl : undefined,
  defaultHeaders: config.llm.provider === "openrouter" ? {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "AI Story Video Generator",
  } : undefined,
});

// Fallback models to try if primary model fails (free tier on OpenRouter)
const FALLBACK_MODELS = [
  config.llm.model,
  "openai/gpt-oss-120b:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

// Retry LLM call with fallback models
async function llmWithRetry(requestOpts, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const model = attempt === 0 ? requestOpts.model : FALLBACK_MODELS[attempt % FALLBACK_MODELS.length];
    try {
      console.log(`[LLM] Attempt ${attempt + 1}/${maxRetries} with model: ${model}`);
      const opts = { ...requestOpts, model };
      const response = await llm.chat.completions.create(opts);
      const content = response?.choices?.[0]?.message?.content;
      if (content && content.trim().length > 2) {
        if (attempt > 0) console.log(`[LLM] Succeeded on attempt ${attempt + 1} with model: ${model}`);
        return content;
      }
      console.warn(`[LLM] Empty response from ${model}, retrying...`);
      lastError = new Error(`Empty response from ${model}`);
    } catch (err) {
      console.warn(`[LLM] Error from ${model}: ${err.message}, retrying...`);
      lastError = err;
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error("All LLM attempts failed");
}

// ─── Idea Generator ───

export async function generateIdeas(genre = "cinematic", targetDurationMin = 2) {
  const durationLabel = targetDurationMin <= 2 ? "short (1–2 min)"
    : targetDurationMin <= 5 ? "medium (3–5 min)"
    : targetDurationMin <= 15 ? "long (10–15 min)"
    : "epic-length (30–60 min)";

  const prompt = `Generate 6 unique, creative, and viral-worthy story ideas for a ${durationLabel} cinematic video.
Genre preference: ${genre}

RULES:
- Each idea must be completely different in theme, setting, and characters
- Ideas should be highly engaging and visually cinematic
- For ${durationLabel} videos, scale the story complexity accordingly:
  - Short: tight focused stories, one twist, one message
  - Medium: multi-act stories with character development
  - Long: deep narratives with subplots and rich world-building
  - Epic-length: full movie-style plots with complex arcs, multiple characters, and detailed world-building
- Make ideas trendy and suitable for social media / YouTube
- Each idea should be 2-4 sentences describing the full concept

Output ONLY a valid JSON array of objects (no markdown, no code fences):
[{"title": "short catchy title", "idea": "2-4 sentence description", "tags": ["tag1", "tag2", "tag3"]}]`;

  const requestOpts = {
    model: config.llm.model,
    messages: [
      { role: "system", content: "You are a creative viral content strategist. Generate unique story ideas for AI video creation. Output ONLY valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 1.0,
    max_tokens: 2000,
  };

  // Only use response_format for models known to support it
  const supportsJsonMode = config.llm.model.includes("gpt-") || config.llm.model.includes("openai/");
  if (supportsJsonMode) {
    requestOpts.response_format = { type: "json_object" };
  }

  let content = await llmWithRetry(requestOpts);
  content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Try to extract JSON array from response
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to find JSON array in the content
    const arrMatch = content.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      parsed = JSON.parse(arrMatch[0]);
    } else {
      console.error("[IDEAS] Failed to parse LLM response:", content.slice(0, 500));
      return [];
    }
  }

  // Handle both array and {ideas: []} formats
  const ideas = Array.isArray(parsed) ? parsed : (parsed.ideas || parsed.stories || parsed.data || []);
  return ideas.filter(i => i && (i.title || i.idea));
}

const SYSTEM_PROMPT = `You are a cinematic screenplay writer AI. Given a story idea, genre, and desired scene count, generate a structured JSON script for video production.

RULES:
- Output ONLY valid JSON (no markdown, no code fences)
- Each scene must have: sceneNumber, narration, emotion, visualDescription, searchKeywords, estimatedDuration
- narration: 1-3 sentences of voiceover text
- emotion: one of [dramatic, happy, sad, tense, mysterious, romantic, inspiring, dark, peaceful, energetic]
- visualDescription: a short, UNIQUE, specific visual prompt suitable for stock footage search (e.g., "aerial shot of ocean waves at sunset")
- searchKeywords: array of 3-4 specific stock footage keywords for this scene (e.g., ["ocean waves", "sunset aerial", "sea drone shot"])
- estimatedDuration: integer seconds between 3 and 6
- Scenes should flow as a coherent story with narrative arc
- Include opening/establishing scene and a closing/resolution scene
- CRITICAL: Every scene MUST have a DIFFERENT and UNIQUE visualDescription — never repeat the same visual concept across scenes. Vary locations, subjects, camera angles, and moods.

OUTPUT FORMAT:
{
  "title": "string",
  "genre": "string",
  "totalScenes": number,
  "estimatedTotalDuration": number,
  "scenes": [
    {
      "sceneNumber": 1,
      "narration": "string",
      "emotion": "string",
      "visualDescription": "string",
      "searchKeywords": ["keyword1", "keyword2", "keyword3"],
      "estimatedDuration": 4
    }
  ]
}`;

export async function generateScript(storyIdea, genre = "cinematic", sceneCount = 25) {
  const clampedCount = Math.max(10, Math.min(60, sceneCount));

  const userPrompt = `Story Idea: "${storyIdea}"
Genre: ${genre}
Number of Scenes: ${clampedCount}

Generate a cinematic script with exactly ${clampedCount} scenes. Make the visual descriptions highly searchable for stock footage (nature, city, people, objects — real-world imagery).`;

  const requestOpts = {
    model: config.llm.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 8000,
  };

  // Only use response_format for models known to support it
  const supportsJsonMode = config.llm.model.includes("gpt-") || config.llm.model.includes("openai/");
  if (supportsJsonMode) {
    requestOpts.response_format = { type: "json_object" };
  }

  let content = await llmWithRetry(requestOpts);

  // Strip markdown code fences if present (some models add them)
  content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let script;
  try {
    script = JSON.parse(content);
  } catch {
    // Try to extract JSON object from content
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) {
      let raw = objMatch[0];
      // Fix common LLM JSON issues: trailing commas before ] or }
      raw = raw.replace(/,\s*([\]}])/g, "$1");
      // Fix unescaped newlines inside strings
      raw = raw.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");
      try {
        script = JSON.parse(raw);
      } catch {
        throw new Error("Failed to parse script JSON from LLM response");
      }
    } else {
      throw new Error("Failed to parse script JSON from LLM response");
    }
  }
  validateScript(script);
  return script;
}

function validateScript(script) {
  if (!script.scenes || !Array.isArray(script.scenes) || script.scenes.length === 0) {
    throw new Error("Script must contain a non-empty scenes array");
  }

  for (const scene of script.scenes) {
    const required = ["sceneNumber", "narration", "emotion", "visualDescription", "estimatedDuration"];
    for (const field of required) {
      if (scene[field] === undefined || scene[field] === null) {
        throw new Error(`Scene ${scene.sceneNumber || "?"} missing required field: ${field}`);
      }
    }
    scene.estimatedDuration = Math.max(3, Math.min(6, scene.estimatedDuration));
    // Ensure searchKeywords exists
    if (!Array.isArray(scene.searchKeywords) || scene.searchKeywords.length === 0) {
      scene.searchKeywords = scene.visualDescription.split(" ").filter(w => w.length > 3).slice(0, 3);
    }
  }

  script.estimatedTotalDuration = script.scenes.reduce((sum, s) => sum + s.estimatedDuration, 0);
}

export async function generateScriptChunked(storyIdea, genre, totalScenes, onChunk) {
  const CHUNK_SIZE = 15;
  const chunks = Math.ceil(totalScenes / CHUNK_SIZE);
  const allScenes = [];
  let title = "";

  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE + 1;
    const end = Math.min((i + 1) * CHUNK_SIZE, totalScenes);
    const count = end - start + 1;

    const previousSummary = allScenes.length > 0
      ? `Previous scenes summary: ${allScenes.slice(-3).map(s => s.narration).join(" ")}`
      : "";

    const prompt = `Story Idea: "${storyIdea}"
Genre: ${genre}
${previousSummary}

Generate scenes ${start} to ${end} (${count} scenes). Scene numbers must start at ${start}.
${i === 0 ? "Begin with an establishing scene." : ""}
${i === chunks - 1 ? "End with a satisfying resolution." : "Continue building the narrative arc."}

Make visual descriptions highly searchable for stock footage.`;

    const chunkOpts = {
      model: config.llm.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 8000,
    };

    // Only use response_format for models known to support it
    const supportsJsonMode = config.llm.model.includes("gpt-") || config.llm.model.includes("openai/");
    if (supportsJsonMode) {
      chunkOpts.response_format = { type: "json_object" };
    }

    let chunkContent = await llmWithRetry(chunkOpts);
    chunkContent = chunkContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let chunk;
    try {
      chunk = JSON.parse(chunkContent);
    } catch {
      const objMatch = chunkContent.match(/\{[\s\S]*\}/);
      if (objMatch) {
        chunk = JSON.parse(objMatch[0]);
      } else {
        throw new Error(`Failed to parse script chunk ${i + 1} JSON from LLM`);
      }
    }
    if (i === 0) title = chunk.title || "Untitled";

    allScenes.push(...chunk.scenes);
    if (onChunk) onChunk(i + 1, chunks, chunk.scenes.length);
  }

  const script = {
    title,
    genre,
    totalScenes: allScenes.length,
    estimatedTotalDuration: allScenes.reduce((s, sc) => s + sc.estimatedDuration, 0),
    scenes: allScenes,
  };

  return script;
}

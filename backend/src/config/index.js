import "dotenv/config";

const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  llm: {
    provider: process.env.LLM_PROVIDER || "openrouter",
    apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
    model: process.env.LLM_MODEL || "google/gemini-2.0-flash-exp:free",
    baseUrl: process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  tts: {
    provider: process.env.TTS_PROVIDER || "openai",
    defaultVoice: process.env.TTS_DEFAULT_VOICE || "onyx",
  },

  media: {
    pexelsKey: process.env.PEXELS_API_KEY,
    pixabayKey: process.env.PIXABAY_API_KEY,
    unsplashKey: process.env.UNSPLASH_ACCESS_KEY,
  },

  ffmpeg: {
    path: process.env.FFMPEG_PATH || null,
    probePath: process.env.FFPROBE_PATH || null,
  },

  output: {
    dir: process.env.OUTPUT_DIR || "./output",
    maxConcurrentRenders: parseInt(process.env.MAX_CONCURRENT_RENDERS || "2", 10),
  },
};

export default config;

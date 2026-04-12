import { Router } from "express";
import { searchMedia } from "../services/mediaFetcher.js";
import { getAvailableVoices } from "../services/ttsEngine.js";

const router = Router();

/**
 * GET /api/media/search?q=ocean+sunset
 * Search stock media across all providers
 */
router.get("/search", async (req, res, next) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: "Query parameter 'q' is required (min 2 chars)" });
    }
    const results = await searchMedia(query.trim());
    res.json(results);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/media/voices
 * List available TTS voice options
 */
router.get("/voices", (_req, res) => {
  res.json(getAvailableVoices());
});

export default router;

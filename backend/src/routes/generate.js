import { Router } from "express";
import { runPipeline } from "../services/pipeline.js";
import { generateIdeas } from "../services/scriptEngine.js";
import { getJob } from "../utils/jobStore.js";

const router = Router();

/**
 * POST /api/generate/ideas
 * Get AI-generated story ideas based on genre and duration
 */
router.post("/ideas", async (req, res, next) => {
  try {
    const { genre, targetDuration } = req.body;
    const ideas = await generateIdeas(genre || "cinematic", parseInt(targetDuration) || 2);
    res.json({ ideas });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/generate
 * Start video generation pipeline
 *
 * Body:
 *   storyIdea: string (required) — the story prompt
 *   genre: string — horror | romance | documentary | motivational | cinematic
 *   voiceStyle: string — voice style id
 *   sceneCount: number — 10–60 (default: auto-calculated from targetDuration)
 *   targetDuration: number — target video length in minutes (1–60, default 2)
 *   resolution: string — "720p" | "1080p" (default "1080p")
 *   musicMood: string | null — calm | epic | dark | upbeat | romantic
 */
router.post("/", async (req, res, next) => {
  try {
    const { storyIdea, genre, voiceStyle, sceneCount, targetDuration, resolution, musicMood } = req.body;

    if (!storyIdea || typeof storyIdea !== "string" || storyIdea.trim().length < 10) {
      return res.status(400).json({ error: "storyIdea must be at least 10 characters" });
    }

    if (storyIdea.length > 5000) {
      return res.status(400).json({ error: "storyIdea must be under 5000 characters" });
    }

    const validGenres = ["horror", "romance", "documentary", "motivational", "cinematic"];
    const validResolutions = ["720p", "1080p", "4k"];

    // Auto-calculate scene count from target duration (~4.5s avg per scene)
    const durationMin = Math.max(1, Math.min(60, parseInt(targetDuration) || 2));
    const autoSceneCount = Math.round((durationMin * 60) / 4.5);
    const finalSceneCount = sceneCount
      ? Math.max(10, Math.min(60, parseInt(sceneCount)))
      : Math.max(10, Math.min(60, autoSceneCount));

    const opts = {
      storyIdea: storyIdea.trim(),
      genre: validGenres.includes(genre) ? genre : "cinematic",
      voiceStyle: voiceStyle || null,
      sceneCount: finalSceneCount,
      targetDuration: durationMin,
      resolution: validResolutions.includes(resolution) ? resolution : "1080p",
      musicMood: musicMood || null,
    };

    const jobId = await runPipeline(opts);

    res.status(202).json({
      jobId,
      message: "Video generation started",
      wsChannel: `job:${jobId}`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/generate/:jobId/status
 * Check job status
 */
router.get("/:jobId/status", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    error: job.error,
  });
});

export default router;

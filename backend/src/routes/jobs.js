import { Router } from "express";
import { getJob, listJobs } from "../utils/jobStore.js";

const router = Router();

/**
 * GET /api/jobs
 * List all jobs
 */
router.get("/", (_req, res) => {
  const jobs = listJobs().map((j) => ({
    id: j.id,
    status: j.status,
    progress: j.progress,
    currentStep: j.currentStep,
    createdAt: j.createdAt,
  }));
  res.json(jobs);
});

/**
 * GET /api/jobs/:id
 * Get full job details
 */
router.get("/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

export default router;

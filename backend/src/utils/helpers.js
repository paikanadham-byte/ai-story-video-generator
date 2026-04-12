import fs from "fs/promises";
import path from "path";

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export function projectDir(jobId) {
  return path.resolve("output", jobId);
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_\-]/gi, "_").slice(0, 100);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

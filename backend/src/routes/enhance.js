import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuid } from "uuid";
import { exec } from "child_process";
import { promisify } from "util";
import { ensureDir } from "../utils/helpers.js";

const execAsync = promisify(exec);
const router = Router();

ensureDir("output/uploads").catch(() => {});
ensureDir("output/enhanced").catch(() => {});

const upload = multer({
  dest: "output/uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are accepted"));
    }
  },
});

/**
 * POST /api/enhance/process
 * Upload image and apply enhancement filters
 * Body (multipart): file + filters (JSON string array)
 */
router.post("/process", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    let filters;
    try {
      filters = JSON.parse(req.body.filters || "[]");
    } catch {
      return res.status(400).json({ error: "Invalid filters format" });
    }

    if (!Array.isArray(filters) || filters.length === 0) {
      return res.status(400).json({ error: "At least one filter is required" });
    }

    const jobId = uuid();
    const outDir = path.resolve(`output/enhanced/${jobId}`);
    await ensureDir(outDir);

    // Keep original extension
    const ext = path.extname(req.file.originalname) || ".jpg";
    const inputPath = req.file.path + ext;
    await fs.rename(req.file.path, inputPath);

    const outputPath = path.join(outDir, `enhanced${ext}`);
    const scriptPath = path.resolve("src/services/image_enhancer.py");
    const filtersJson = JSON.stringify(filters).replace(/'/g, "\\'");

    const { stdout } = await execAsync(
      `python3 "${scriptPath}" "${inputPath}" "${outputPath}" '${filtersJson}'`,
      { timeout: 120000 }
    );

    let result;
    try {
      result = JSON.parse(stdout.trim());
    } catch {
      result = {};
    }

    // Clean up input file
    await fs.unlink(inputPath).catch(() => {});

    res.json({
      jobId,
      url: `/output/enhanced/${jobId}/enhanced${ext}`,
      width: result.width,
      height: result.height,
      originalWidth: result.original_width,
      originalHeight: result.original_height,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

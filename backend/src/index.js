import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import config from "./config/index.js";
import { initSocket } from "./websocket.js";
import generateRouter from "./routes/generate.js";
import mediaRouter from "./routes/media.js";
import jobsRouter from "./routes/jobs.js";
import editorRouter from "./routes/editor.js";
import proRouter from "./routes/pro.js";
import voicesRouter from "./routes/voices.js";
import vocalRouter from "./routes/vocal.js";
import enhanceRouter from "./routes/enhance.js";
import authRouter from "./routes/auth.js";
import { ensureDir } from "./utils/helpers.js";
import { initSupabaseStorage } from "./utils/supabase.js";

const app = express();
const server = http.createServer(app);

// Security & parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: config.frontendUrl?.includes(",")
    ? config.frontendUrl.split(",").map(u => u.trim())
    : config.frontendUrl || "*",
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("short"));

// Serve generated output files
app.use("/output", express.static(path.resolve(config.output.dir)));

// API routes
app.use("/api/auth", authRouter);
app.use("/oauth", authRouter); // /oauth/consent handled here
app.use("/api/generate", generateRouter);
app.use("/api/media", mediaRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/editor", editorRouter);
app.use("/api/pro", proRouter);
app.use("/api/voices", voicesRouter);
app.use("/api/vocal", vocalRouter);
app.use("/api/enhance", enhanceRouter);

// Feedback endpoint
app.post("/api/feedback", (req, res) => {
  const { type, message, email } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }
  console.log(`[FEEDBACK] type=${type} email=${email || "none"} message=${message.substring(0, 200)}`);
  res.json({ success: true });
});

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// Start
async function start() {
  await ensureDir(config.output.dir);
  initSocket(server);

  // Initialize Supabase storage buckets
  await initSupabaseStorage().catch((err) =>
    console.warn("[SUPABASE] Init warning:", err.message)
  );

  server.listen(config.port, () => {
    console.log(`\n🎬 AI Story Video Generator — Backend`);
    console.log(`   http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}\n`);
  });
}

start().catch(console.error);

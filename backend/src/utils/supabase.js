import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import config from "../config/index.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "";

let supabase = null;

export function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabase;
}

export function isSupabaseEnabled() {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

// ── Ensure storage buckets exist ──

const BUCKETS = ["videos", "voices", "uploads"];

export async function initSupabaseStorage() {
  const sb = getSupabase();
  if (!sb) {
    console.log("[SUPABASE] Not configured — using local storage only");
    return;
  }

  for (const bucket of BUCKETS) {
    const { error } = await sb.storage.createBucket(bucket, {
      public: true,
    });
    if (error && !error.message?.includes("already exists") && !error.message?.includes("row-level security")) {
      console.warn(`[SUPABASE] Bucket "${bucket}" setup: ${error.message}`);
    }
  }
  console.log("[SUPABASE] Storage initialized (create buckets in Supabase dashboard if needed)");
}

// ── Upload a file to Supabase Storage ──

export async function uploadToSupabase(bucket, filePath, remotePath) {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const { data, error } = await sb.storage
      .from(bucket)
      .upload(remotePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error(`[SUPABASE] Upload failed: ${error.message}`);
      return null;
    }

    // Get public URL
    const { data: urlData } = sb.storage.from(bucket).getPublicUrl(remotePath);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.error(`[SUPABASE] Upload error: ${err.message}`);
    return null;
  }
}

// ── Delete a file from Supabase Storage ──

export async function deleteFromSupabase(bucket, remotePath) {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb.storage.from(bucket).remove([remotePath]);
    return !error;
  } catch {
    return false;
  }
}

// ── Upload generated video + subtitles ──

export async function uploadVideoOutput(jobId, videoPath, srtPath) {
  if (!isSupabaseEnabled()) return { videoUrl: null, subtitlesUrl: null };

  const videoRemote = `${jobId}/${path.basename(videoPath)}`;
  const srtRemote = `${jobId}/subtitles.srt`;

  const [videoUrl, srtUrl] = await Promise.all([
    uploadToSupabase("videos", videoPath, videoRemote),
    srtPath ? uploadToSupabase("videos", srtPath, srtRemote) : null,
  ]);

  if (videoUrl) {
    console.log(`[SUPABASE] Video uploaded: ${videoUrl}`);
  }

  return { videoUrl, subtitlesUrl: srtUrl };
}

// ── Upload voice clone sample ──

export async function uploadVoiceSample(voiceId, samplePath) {
  if (!isSupabaseEnabled()) return null;
  const remote = `${voiceId}/${path.basename(samplePath)}`;
  return uploadToSupabase("voices", samplePath, remote);
}

// ── Upload editor/copyright video ──

export async function uploadEditorOutput(jobId, videoPath) {
  if (!isSupabaseEnabled()) return null;
  const remote = `${jobId}/${path.basename(videoPath)}`;
  return uploadToSupabase("uploads", videoPath, remote);
}

const MIME_TYPES = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".srt": "text/plain",
  ".vtt": "text/vtt",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

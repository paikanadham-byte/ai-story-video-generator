const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
const API_BASE = `${BACKEND_URL}/api`;

export async function startGeneration(payload) {
  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getJobStatus(jobId) {
  const res = await fetch(`${API_BASE}/generate/${jobId}/status`);
  if (!res.ok) throw new Error("Failed to fetch job status");
  return res.json();
}

export async function searchMedia(query) {
  const res = await fetch(`${API_BASE}/media/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Media search failed");
  return res.json();
}

export async function getVoices() {
  const res = await fetch(`${API_BASE}/media/voices`);
  if (!res.ok) throw new Error("Failed to fetch voices");
  return res.json();
}

export async function getStoryIdeas(genre, targetDuration) {
  const res = await fetch(`${API_BASE}/generate/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ genre, targetDuration }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Failed to get ideas");
  }
  return res.json();
}

export async function uploadVideo(file) {
  const formData = new FormData();
  formData.append("video", file);
  const res = await fetch(`${API_BASE}/editor/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function downloadVideoUrl(url) {
  const res = await fetch(`${API_BASE}/editor/download-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Download failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function startTransform(videoPath, transforms, options = {}) {
  const res = await fetch(`${API_BASE}/editor/transform`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoPath, transforms, options }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Transform failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getEditorJobStatus(jobId) {
  const res = await fetch(`${API_BASE}/editor/job/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch job status");
  return res.json();
}

export async function generateSEO(title, genre, scenes) {
  const res = await fetch(`${API_BASE}/pro/seo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, genre, scenes }),
  });
  if (!res.ok) throw new Error("SEO generation failed");
  return res.json();
}

export async function generateThumbnailPrompts(title, genre, scenes) {
  const res = await fetch(`${API_BASE}/pro/thumbnail-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, genre, scenes }),
  });
  if (!res.ok) throw new Error("Thumbnail generation failed");
  return res.json();
}

export async function translateScript(scenes, targetLanguage) {
  const res = await fetch(`${API_BASE}/pro/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenes, targetLanguage }),
  });
  if (!res.ok) throw new Error("Translation failed");
  return res.json();
}

export async function getLanguages() {
  const res = await fetch(`${API_BASE}/pro/languages`);
  if (!res.ok) throw new Error("Failed to fetch languages");
  return res.json();
}

export async function getApiKeyInfo() {
  const res = await fetch(`${API_BASE}/pro/api-key`);
  if (!res.ok) throw new Error("Failed to fetch API key");
  return res.json();
}

// ── Voice Clone APIs ──

export async function getAllVoices() {
  const res = await fetch(`${API_BASE}/voices`);
  if (!res.ok) throw new Error("Failed to fetch voices");
  return res.json();
}

export async function getClonedVoices() {
  const res = await fetch(`${API_BASE}/voices/cloned`);
  if (!res.ok) throw new Error("Failed to fetch cloned voices");
  return res.json();
}

export async function cloneVoice(audioFile, name, gender, style) {
  const formData = new FormData();
  formData.append("sample", audioFile);
  formData.append("name", name);
  formData.append("gender", gender || "male");
  formData.append("style", style || "warm");
  const res = await fetch(`${API_BASE}/voices/clone`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Clone failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteClonedVoice(voiceId) {
  const res = await fetch(`${API_BASE}/voices/cloned/${voiceId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete voice");
  return res.json();
}

export async function previewVoice(voiceId, text) {
  const res = await fetch(`${API_BASE}/voices/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voiceId, text }),
  });
  if (!res.ok) throw new Error("Preview failed");
  return res.blob();
}

// ── Vocal Separator APIs ──

export async function separateVocals(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/vocal/separate`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Separation failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Image Enhancement APIs ──

export async function enhanceImage(file, filters) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filters", JSON.stringify(filters));
  const res = await fetch(`${API_BASE}/enhance/process`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Enhancement failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

import fetch from "node-fetch";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import config from "../config/index.js";
import { ensureDir } from "../utils/helpers.js";

// ─── Used media URL tracker (prevents duplicate media across scenes) ───
const usedMediaUrls = new Set();

// ─── Pexels ───

async function searchPexelsVideos(query, perPage = 5) {
  if (!config.media.pexelsKey) return [];
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: config.media.pexelsKey },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.videos || []).map((v) => {
    const file = v.video_files
      .filter((f) => f.width >= 1280)
      .sort((a, b) => a.width - b.width)[0] || v.video_files[0];
    return {
      source: "pexels",
      type: "video",
      url: file?.link,
      width: file?.width,
      height: file?.height,
      duration: v.duration,
      thumbnail: v.image,
    };
  }).filter((v) => v.url);
}

// ─── Pixabay ───

async function searchPixabayVideos(query, perPage = 5) {
  if (!config.media.pixabayKey) return [];
  const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(config.media.pixabayKey)}&q=${encodeURIComponent(query)}&per_page=${perPage}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.hits || []).map((v) => {
    const file = v.videos?.large || v.videos?.medium || v.videos?.small;
    return {
      source: "pixabay",
      type: "video",
      url: file?.url,
      width: file?.width,
      height: file?.height,
      duration: v.duration,
      thumbnail: `https://i.vimeocdn.com/video/${v.picture_id}_640x360.jpg`,
    };
  }).filter((v) => v.url);
}

// ─── Pixabay Images ───

async function searchPixabayImages(query, perPage = 5) {
  if (!config.media.pixabayKey) return [];
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(config.media.pixabayKey)}&q=${encodeURIComponent(query)}&per_page=${perPage}&image_type=photo&orientation=horizontal&min_width=1280`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.hits || []).map((img) => ({
    source: "pixabay",
    type: "image",
    url: img.largeImageURL || img.webformatURL,
    width: img.imageWidth,
    height: img.imageHeight,
    thumbnail: img.previewURL,
  }));
}

// ─── Unsplash ───

async function searchUnsplashImages(query, perPage = 5) {
  if (!config.media.unsplashKey) return [];
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${config.media.unsplashKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((img) => ({
    source: "unsplash",
    type: "image",
    url: img.urls?.full || img.urls?.regular,
    width: img.width,
    height: img.height,
    thumbnail: img.urls?.thumb,
  }));
}

// ─── Unified Search ───

export async function searchMedia(query) {
  const [pexelsVids, pixabayVids, pixabayImgs, unsplashImgs] = await Promise.allSettled([
    searchPexelsVideos(query, 10),
    searchPixabayVideos(query, 10),
    searchPixabayImages(query, 5),
    searchUnsplashImages(query, 5),
  ]);

  const results = {
    videos: [
      ...(pexelsVids.status === "fulfilled" ? pexelsVids.value : []),
      ...(pixabayVids.status === "fulfilled" ? pixabayVids.value : []),
    ],
    images: [
      ...(pixabayImgs.status === "fulfilled" ? pixabayImgs.value : []),
      ...(unsplashImgs.status === "fulfilled" ? unsplashImgs.value : []),
    ],
  };

  return results;
}

// ─── Reset tracker for new jobs ───

export function resetMediaTracker() {
  usedMediaUrls.clear();
}

// ─── Best match per scene (with dedup + strong video preference) ───

export async function fetchMediaForScene(visualDescription, sceneNumber, jobDir, searchKeywords = []) {
  // Try multiple search strategies to find the best unique match
  const queries = [
    visualDescription,
    ...(searchKeywords || []),
  ];

  let chosen = null;

  for (const query of queries) {
    if (chosen) break;

    const results = await searchMedia(query);

    // Strong video preference: try ALL videos before falling back to images
    const allVideos = results.videos.filter((v) => !usedMediaUrls.has(v.url));
    const allImages = results.images.filter((img) => !usedMediaUrls.has(img.url));

    if (allVideos.length > 0) {
      chosen = allVideos[0];
    } else if (allImages.length > 0) {
      chosen = allImages[0];
    }
  }

  // Last resort: simplified 2-word query
  if (!chosen) {
    const simpleQuery = visualDescription.split(" ").slice(0, 2).join(" ");
    const fallback = await searchMedia(simpleQuery);
    const vids = fallback.videos.filter((v) => !usedMediaUrls.has(v.url));
    const imgs = fallback.images.filter((img) => !usedMediaUrls.has(img.url));
    chosen = vids[0] || imgs[0] || null;
  }

  // If everything is used, allow reuse but still prefer unused
  if (!chosen) {
    const lastTry = await searchMedia(visualDescription);
    chosen = lastTry.videos[0] || lastTry.images[0] || null;
  }

  if (!chosen) {
    return { sceneNumber, media: null, error: "No media found" };
  }

  // Track this URL so other scenes don't reuse it
  usedMediaUrls.add(chosen.url);

  // Download the file
  const ext = chosen.type === "video" ? "mp4" : "jpg";
  const filename = `scene_${String(sceneNumber).padStart(3, "0")}_media.${ext}`;
  const filepath = path.join(jobDir, "media", filename);
  await ensureDir(path.dirname(filepath));

  try {
    await downloadFile(chosen.url, filepath);
  } catch (err) {
    console.warn(`[MEDIA] Download failed for scene ${sceneNumber}: ${err.message} — trying next source`);
    usedMediaUrls.delete(chosen.url);

    // Try alternative sources (different provider) before giving up
    const allResults = await searchMedia(visualDescription.split(" ").slice(0, 3).join(" "));
    const alternatives = [
      ...allResults.videos.filter((v) => !usedMediaUrls.has(v.url) && v.url !== chosen.url),
      ...allResults.images.filter((img) => !usedMediaUrls.has(img.url) && img.url !== chosen.url),
    ];

    for (const alt of alternatives.slice(0, 3)) {
      try {
        const altExt = alt.type === "video" ? "mp4" : "jpg";
        const altFilename = `scene_${String(sceneNumber).padStart(3, "0")}_media.${altExt}`;
        const altFilepath = path.join(jobDir, "media", altFilename);
        await downloadFile(alt.url, altFilepath);
        usedMediaUrls.add(alt.url);
        return { sceneNumber, media: { ...alt, localPath: altFilepath, filename: altFilename }, error: null };
      } catch {
        // Try next
      }
    }

    return { sceneNumber, media: null, error: `Download failed: ${err.message}` };
  }

  return {
    sceneNumber,
    media: { ...chosen, localPath: filepath, filename },
    error: null,
  };
}

// ─── Download ───

async function downloadFile(url, dest) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000); // 30s timeout
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "StoryForge/1.0" },
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
    const ws = createWriteStream(dest);
    await pipeline(res.body, ws);
  } finally {
    clearTimeout(timer);
  }
}

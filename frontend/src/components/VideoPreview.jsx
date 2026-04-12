import { useState, useRef, useEffect } from "react";
import { generateSEO, generateThumbnailPrompts } from "../api/client.js";

function VideoPreview({ result, onReset }) {
  const { videoUrl, subtitlesUrl, script, duration } = result;

  const [seo, setSeo] = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState(null);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({});
  const videoRef = useRef(null);

  // Auto-enable captions when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const enableCaptions = () => {
      if (video.textTracks && video.textTracks.length > 0) {
        video.textTracks[0].mode = "showing";
      }
    };
    video.addEventListener("loadedmetadata", enableCaptions);
    // Also try immediately in case it already loaded
    enableCaptions();
    return () => video.removeEventListener("loadedmetadata", enableCaptions);
  }, [videoUrl]);

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleGenerateSEO = async () => {
    setSeoLoading(true);
    try {
      const data = await generateSEO(script?.title, script?.genre, script?.scenes);
      setSeo(data);
    } catch (err) {
      console.error("SEO failed:", err);
    } finally {
      setSeoLoading(false);
    }
  };

  const handleGenerateThumbnails = async () => {
    setThumbLoading(true);
    try {
      const data = await generateThumbnailPrompts(script?.title, script?.genre, script?.scenes);
      setThumbnails(data.thumbnails || []);
    } catch (err) {
      console.error("Thumbnail generation failed:", err);
    } finally {
      setThumbLoading(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleUpload = (platform) => {
    setUploadStatus((prev) => ({ ...prev, [platform]: "uploading" }));
    // Simulate upload progress — in a real app this would call platform APIs
    setTimeout(() => {
      setUploadStatus((prev) => ({ ...prev, [platform]: "ready" }));
    }, 2000);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ textAlign: "center" }}>
        <h2>🎉 Your Video is Ready!</h2>
        <p>{script?.title}</p>
      </div>

      <div className="card video-card glow">
        <div className="card-title">
          <span>🎬</span> {script?.title || "Your Video is Ready!"}
        </div>

        <div className="video-wrapper">
          <video
            ref={videoRef}
            className="video-player"
            src={videoUrl}
            controls
            autoPlay
            playsInline
          >
            {subtitlesUrl && (
              <track kind="captions" src={subtitlesUrl} srcLang="en" label="English" default />
            )}
          </video>
          <div style={{ textAlign: "center", marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
            📝 Auto captions are burned into the video • Subtitles also available as a separate SRT download
          </div>
        </div>

        <p style={{ color: "var(--text-secondary)", marginBottom: 20, fontSize: 14 }}>
          {script?.totalScenes || "?"} scenes • {formatDuration(duration || 0)} duration • {script?.genre}
        </p>

        <div className="video-actions">
          <a href={videoUrl} download className="btn btn-primary">
            ⬇️ Download MP4
          </a>
          {subtitlesUrl && (
            <a href={subtitlesUrl} download className="btn btn-secondary">
              📄 Download Subtitles
            </a>
          )}
          <button className="btn btn-secondary" onClick={onReset}>
            ✨ Create Another
          </button>
        </div>
      </div>

      {/* 💎 Direct Upload */}
      <div className="card">
        <div className="card-title">
          <span>🔗</span> Direct Upload
          <span className="badge" style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: "var(--gradient-accent)", color: "white", fontWeight: 700, marginLeft: 8 }}>PRO</span>
        </div>
        <div className="upload-platforms">
          {[
            { id: "youtube", icon: "📺", name: "YouTube", color: "#FF0000" },
            { id: "tiktok", icon: "🎵", name: "TikTok", color: "#00F2EA" },
            { id: "instagram", icon: "📸", name: "Instagram", color: "#E1306C" },
          ].map((p) => (
            <button
              key={p.id}
              className={`upload-platform-btn ${uploadStatus[p.id] || ""}`}
              onClick={() => handleUpload(p.id)}
              disabled={uploadStatus[p.id] === "uploading"}
            >
              <span className="platform-icon">{p.icon}</span>
              <span className="platform-name">{p.name}</span>
              <span className="platform-status">
                {uploadStatus[p.id] === "uploading" ? "Preparing..." :
                 uploadStatus[p.id] === "ready" ? "✅ Ready to publish" :
                 "Upload →"}
              </span>
            </button>
          ))}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 10, textAlign: "center" }}>
          Connect your accounts in Settings to enable one-click publishing
        </p>
      </div>

      {/* 📈 SEO Generator */}
      <div className="card">
        <div className="card-title">
          <span>📈</span> SEO Title & Description
          <span className="badge" style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: "var(--gradient-accent)", color: "white", fontWeight: 700, marginLeft: 8 }}>PRO</span>
        </div>
        {!seo ? (
          <button className="idea-btn" onClick={handleGenerateSEO} disabled={seoLoading}>
            {seoLoading ? "Generating SEO..." : "📈 Generate SEO Metadata"}
          </button>
        ) : (
          <div className="seo-results">
            <div className="seo-field">
              <div className="seo-field-header">
                <label>Optimized Title</label>
                <button className="copy-btn" onClick={() => handleCopy(seo.seoTitle, "title")}>
                  {copied === "title" ? "✅" : "📋"}
                </button>
              </div>
              <div className="seo-value title">{seo.seoTitle}</div>
            </div>
            <div className="seo-field">
              <div className="seo-field-header">
                <label>Description</label>
                <button className="copy-btn" onClick={() => handleCopy(seo.description, "desc")}>
                  {copied === "desc" ? "✅" : "📋"}
                </button>
              </div>
              <div className="seo-value desc">{seo.description}</div>
            </div>
            <div className="seo-field">
              <div className="seo-field-header">
                <label>Tags</label>
                <button className="copy-btn" onClick={() => handleCopy((seo.tags || []).join(", "), "tags")}>
                  {copied === "tags" ? "✅" : "📋"}
                </button>
              </div>
              <div className="seo-tags">
                {(seo.tags || []).map((tag, i) => (
                  <span key={i} className="seo-tag">{tag}</span>
                ))}
              </div>
            </div>
            {seo.hashtags && (
              <div className="seo-field">
                <label>Hashtags</label>
                <div className="seo-tags">
                  {seo.hashtags.map((h, i) => (
                    <span key={i} className="seo-tag hashtag">{h}</span>
                  ))}
                </div>
              </div>
            )}
            <button className="idea-btn" onClick={handleGenerateSEO} disabled={seoLoading} style={{ marginTop: 10 }}>
              {seoLoading ? "Regenerating..." : "🔄 Regenerate"}
            </button>
          </div>
        )}
      </div>

      {/* 🤖 AI Thumbnail Generator */}
      <div className="card">
        <div className="card-title">
          <span>🤖</span> AI Thumbnail Generator
          <span className="badge" style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: "var(--gradient-accent)", color: "white", fontWeight: 700, marginLeft: 8 }}>PRO</span>
        </div>
        {!thumbnails ? (
          <button className="idea-btn" onClick={handleGenerateThumbnails} disabled={thumbLoading}>
            {thumbLoading ? "Generating concepts..." : "🤖 Generate Thumbnail Concepts"}
          </button>
        ) : (
          <div className="thumbnail-concepts">
            {thumbnails.map((t, i) => (
              <div key={i} className="thumbnail-card">
                <div className="thumb-preview" style={{ background: `linear-gradient(135deg, ${t.colorScheme?.split(" ")[0] || "#8b5cf6"} 0%, ${t.colorScheme?.split(" ").pop() || "#06b6d4"} 100%)` }}>
                  <span className="thumb-text-overlay">{t.textOverlay}</span>
                  <span className="thumb-style-badge">{t.style}</span>
                </div>
                <div className="thumb-info">
                  <h4>{t.concept}</h4>
                  <p>{t.description}</p>
                </div>
              </div>
            ))}
            <button className="idea-btn" onClick={handleGenerateThumbnails} disabled={thumbLoading} style={{ marginTop: 10 }}>
              {thumbLoading ? "Regenerating..." : "🔄 Generate More Concepts"}
            </button>
          </div>
        )}
      </div>

      {/* Script Preview */}
      {script?.scenes && (
        <div className="card">
          <div className="card-title">
            <span>📜</span> Script ({script.scenes.length} scenes)
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {script.scenes.map((scene) => (
              <div
                key={scene.sceneNumber}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--accent)",
                  marginBottom: 4,
                }}>
                  Scene {scene.sceneNumber} • {scene.emotion} • {scene.estimatedDuration}s
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                  {scene.narration}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  🎬 {scene.visualDescription}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPreview;

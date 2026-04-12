import { useState, useRef } from "react";
import { io } from "socket.io-client";
import { uploadVideo, startTransform, downloadVideoUrl } from "../api/client.js";

const TRANSFORMS = [
  { id: "revoice", icon: "🎙️", title: "Replace Voiceover", desc: "Re-generate narration with a completely new AI voice" },
  { id: "mirror", icon: "🪞", title: "Mirror / Flip Video", desc: "Horizontally flip the video to avoid visual detection" },
  { id: "crop", icon: "📐", title: "Crop & Resize", desc: "Change aspect ratio and crop edges of the video" },
  { id: "speed", icon: "⚡", title: "Alter Speed", desc: "Slightly speed up or slow down to change timing" },
  { id: "color", icon: "🎨", title: "Color Grade", desc: "Apply a color filter to change the visual look entirely" },
  { id: "music", icon: "🎵", title: "Replace Music", desc: "Remove original background music and add new royalty-free track" },
  { id: "subtitles", icon: "💬", title: "Add Subtitles", desc: "Burn new styled subtitles into the video" },
  { id: "zoom", icon: "🔍", title: "Ken Burns Effect", desc: "Add slow zoom/pan motion to make static shots dynamic" },
];

function CopyrightTransformer() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [serverPath, setServerPath] = useState(null);
  const [fileName, setFileName] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [selected, setSelected] = useState(["revoice", "mirror", "color", "music"]);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressDetail, setProgressDetail] = useState("");
  const [error, setError] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const fileRef = useRef(null);

  const toggleTransform = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("video/")) return;
    setVideoFile(file);
    setVideoSrc(URL.createObjectURL(file));
    setFileName(file.name);
    setError(null);
    setResultUrl(null);

    // Upload to server
    setUploading(true);
    try {
      const result = await uploadVideo(file);
      setServerPath(result.path);
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUrlLoad = async () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    setError(null);
    setResultUrl(null);
    setUploading(true);

    try {
      // Download the video from URL to our server
      const result = await downloadVideoUrl(url);
      setVideoSrc(result.url || url);
      setFileName(result.originalName || url.split("/").pop() || "External video");
      setServerPath(result.path);
    } catch (err) {
      setError("Failed to load video from URL: " + err.message);
      setVideoSrc(null);
    } finally {
      setUploading(false);
    }
  };

  const handleTransform = async () => {
    if (selected.length === 0) return;
    if (!serverPath) {
      setError("Please upload a video file first.");
      return;
    }

    setProcessing(true);
    setProgressPct(0);
    setProgressDetail("Starting transformations...");
    setError(null);
    setResultUrl(null);

    try {
      const options = {
        speed: "1.1",
        colorStyle: "cinematic",
      };

      const { jobId } = await startTransform(serverPath, selected, options);

      // Listen for progress via WebSocket
      const socket = io({ transports: ["websocket", "polling"] });
      socket.on("connect", () => socket.emit("subscribe", jobId));

      socket.on("progress", (data) => {
        setProgressPct(data.progress || 0);
        setProgressDetail(data.detail || "");
      });

      socket.on("complete", (data) => {
        setProgressPct(100);
        setProgressDetail("All transformations complete!");
        setResultUrl(data.videoUrl);
        setProcessing(false);
        socket.disconnect();
      });

      socket.on("error", (data) => {
        setError(data.error || "Transform failed");
        setProcessing(false);
        socket.disconnect();
      });
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setVideoSrc(null);
    setVideoFile(null);
    setFileName("");
    setServerPath(null);
    setResultUrl(null);
    setError(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Copyright Transformer 🛡️</h2>
            <p>Transform any video to make it copyright-safe for re-uploading</p>
          </div>
          {videoSrc && (
            <button className="btn btn-secondary" onClick={handleReset}>
              ← Upload New
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {!videoSrc ? (
        <div
          className={`editor-upload-zone ${dragging ? "dragging" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="upload-icon">🛡️</div>
          <div className="upload-title">Drop a video to make it copyright-safe</div>
          <div className="upload-subtitle">We'll transform it so you can re-upload on YouTube, TikTok, Instagram</div>

          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />

          <div className="upload-or">— or paste a video URL —</div>

          <div className="url-input-row" onClick={(e) => e.stopPropagation()}>
            <input
              className="text-input"
              placeholder="https://example.com/video.mp4"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleUrlLoad}>Load</button>
          </div>
        </div>
      ) : (
        <>
          {uploading && (
            <div className="card" style={{ textAlign: "center", padding: "20px" }}>
              <div className="spinner" />
              <p style={{ color: "var(--text-secondary)" }}>Uploading video to server...</p>
            </div>
          )}

          {/* Preview */}
          <div className="card">
            <div className="editor-preview">
              <video src={resultUrl || videoSrc} controls style={{ width: "100%", maxHeight: 340, borderRadius: 12, background: "#000" }} />
              <div className="editor-filename">
                {resultUrl ? "✅ Copyright-safe output" : fileName}
              </div>
            </div>
            {resultUrl && (
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <a href={resultUrl} download className="btn btn-primary">⬇️ Download Result</a>
              </div>
            )}
          </div>

          {/* Processing progress */}
          {processing && (
            <div className="card glow" style={{ textAlign: "center" }}>
              <div className="progress-percent">{progressPct}%</div>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="progress-detail">{progressDetail}</div>
            </div>
          )}

          {/* Transformation options */}
          {!processing && (
            <div className="card">
              <div className="card-title">
                <span>🔧</span> Select Transformations
                <span className="badge">{selected.length} selected</span>
              </div>

              <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 14 }}>
                Select which changes to apply. More transformations = more copyright-safe result.
              </p>

              <div className="transform-options">
                {TRANSFORMS.map((t) => {
                  const isSelected = selected.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      className={`transform-option ${isSelected ? "selected" : ""}`}
                      onClick={() => toggleTransform(t.id)}
                    >
                      <div className="transform-check">{isSelected ? "✓" : ""}</div>
                      <div className="transform-info">
                        <h4>{t.icon} {t.title}</h4>
                        <p>{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!processing && (
            <button
              className="generate-btn"
              onClick={handleTransform}
              disabled={processing || uploading || selected.length === 0 || !serverPath}
            >
              {uploading ? "Uploading..." : `🛡️ Apply ${selected.length} Transformations`}
            </button>
          )}

          <div style={{ height: 24 }} />
        </>
      )}
    </div>
  );
}

export default CopyrightTransformer;

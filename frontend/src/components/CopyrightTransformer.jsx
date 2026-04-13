import { useState, useRef } from "react";
import { io } from "socket.io-client";
import { uploadVideo, startTransform, downloadVideoUrl } from "../api/client.js";
import { useI18n } from "../utils/i18n.js";

const TRANSFORM_DEFS = [
  { id: "revoice", icon: "🎙️", titleKey: "ct_revoice", descKey: "ct_revoiceDesc" },
  { id: "mirror", icon: "🪞", titleKey: "ct_mirror", descKey: "ct_mirrorDesc" },
  { id: "crop", icon: "📐", titleKey: "ct_crop", descKey: "ct_cropDesc" },
  { id: "speed", icon: "⚡", titleKey: "ct_speed", descKey: "ct_speedDesc" },
  { id: "color", icon: "🎨", titleKey: "ct_color", descKey: "ct_colorDesc" },
  { id: "music", icon: "🎵", titleKey: "ct_music", descKey: "ct_musicDesc" },
  { id: "subtitles", icon: "💬", titleKey: "ct_subtitles", descKey: "ct_subtitlesDesc" },
  { id: "zoom", icon: "🔍", titleKey: "ct_zoom", descKey: "ct_zoomDesc" },
];

function CopyrightTransformer() {
  const t = useI18n();
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
            <h2>{t.copyrightTitle}</h2>
            <p>{t.copyrightDesc}</p>
          </div>
          {videoSrc && (
            <button className="btn btn-secondary" onClick={handleReset}>
              {t.uploadNew}
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
          <div className="upload-title">{t.copyrightDropTitle}</div>
          <div className="upload-subtitle">{t.copyrightDropSub}</div>

          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />

          <div className="upload-or">{t.orPasteUrl}</div>

          <div className="url-input-row" onClick={(e) => e.stopPropagation()}>
            <input
              className="text-input"
              placeholder="https://example.com/video.mp4"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleUrlLoad}>{t.load}</button>
          </div>
        </div>
      ) : (
        <>
          {uploading && (
            <div className="card" style={{ textAlign: "center", padding: "20px" }}>
              <div className="spinner" />
              <p style={{ color: "var(--text-secondary)" }}>{t.uploading}</p>
            </div>
          )}

          {/* Preview */}
          <div className="card">
            <div className="editor-preview">
              <video src={resultUrl || videoSrc} controls style={{ width: "100%", maxHeight: 340, borderRadius: 12, background: "#000" }} />
              <div className="editor-filename">
                {resultUrl ? t.copyrightSafeOutput : fileName}
              </div>
            </div>
            {resultUrl && (
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <a href={resultUrl} download className="btn btn-primary">{t.downloadResult}</a>
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
                <span>🔧</span> {t.selectTransformations}
                <span className="badge">{selected.length} {t.selected}</span>
              </div>

              <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 14 }}>
                {t.transformHint}
              </p>

              <div className="transform-options">
                {TRANSFORM_DEFS.map((tr) => {
                  const isSelected = selected.includes(tr.id);
                  return (
                    <button
                      key={tr.id}
                      className={`transform-option ${isSelected ? "selected" : ""}`}
                      onClick={() => toggleTransform(tr.id)}
                    >
                      <div className="transform-check">{isSelected ? "✓" : ""}</div>
                      <div className="transform-info">
                        <h4>{tr.icon} {t[tr.titleKey]}</h4>
                        <p>{t[tr.descKey]}</p>
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
              {uploading ? t.loading : `🛡️ ${t.applyTransformations} (${selected.length})`}
            </button>
          )}

          <div style={{ height: 24 }} />
        </>
      )}
    </div>
  );
}

export default CopyrightTransformer;

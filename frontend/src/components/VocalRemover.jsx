import { useState, useRef } from "react";
import { separateVocals } from "../api/client.js";
import { useI18n } from "../utils/i18n.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

function VocalRemover() {
  const t = useI18n();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.type.startsWith("audio/") || f.type.startsWith("video/"))) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  };

  const handleSeparate = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const data = await separateVocals(file);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const fullUrl = `${BACKEND_URL}${url}`;
      const resp = await fetch(fullUrl);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(`${BACKEND_URL}${url}`, "_blank");
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t.vocalRemover}</h2>
        <p>{t.vocalRemoverDesc}</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span> {error}
        </div>
      )}

      {!result ? (
        <>
          {/* Upload Zone */}
          <div className="card">
            <div className="card-title">
              <span>🎵</span> {t.uploadAudio}
            </div>
            <div
              className={`editor-upload-zone ${dragging ? "dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                type="file"
                ref={fileRef}
                style={{ display: "none" }}
                accept="audio/*,video/*"
                onChange={handleFileSelect}
              />
              <div className="upload-icon">🎤</div>
              <div className="upload-title">{t.vocalUploadTitle}</div>
              <div className="upload-subtitle">{t.vocalUploadSubtitle}</div>
            </div>

            {file && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--bg-input)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>🎵</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatSize(file.size)}</div>
                </div>
                <button className="btn btn-secondary" onClick={() => { setFile(null); setError(null); }} style={{ padding: "6px 12px", fontSize: 12 }}>✕</button>
              </div>
            )}

            <button
              className="generate-btn"
              onClick={handleSeparate}
              disabled={!file || processing}
              style={{ marginTop: 18 }}
            >
              {processing ? (
                <><span className="spinner" style={{ width: 20, height: 20, margin: 0 }}></span> {t.vocalProcessing}</>
              ) : (
                <>{t.vocalSeparateBtn}</>
              )}
            </button>
          </div>

          {/* How It Works */}
          <div className="card">
            <div className="card-title">
              <span>ℹ️</span> {t.howItWorks}
            </div>
            <div className="how-it-works">
              <div className="how-step">
                <div className="how-step-num">1</div>
                <div>
                  <h4>{t.vocalStep1Title}</h4>
                  <p>{t.vocalStep1Desc}</p>
                </div>
              </div>
              <div className="how-step">
                <div className="how-step-num">2</div>
                <div>
                  <h4>{t.vocalStep2Title}</h4>
                  <p>{t.vocalStep2Desc}</p>
                </div>
              </div>
              <div className="how-step">
                <div className="how-step-num">3</div>
                <div>
                  <h4>{t.vocalStep3Title}</h4>
                  <p>{t.vocalStep3Desc}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Results */}
          <div className="card glow" style={{ textAlign: "center" }}>
            <div className="card-title" style={{ justifyContent: "center" }}>
              <span>✅</span> {t.vocalSeparationComplete}
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>
              {t.vocalSeparationDesc}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              {/* Vocals Card */}
              <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎤</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t.vocalsTrack}</h3>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>{t.vocalsTrackDesc}</p>
                <audio controls src={`${BACKEND_URL}${result.vocals}`} style={{ width: "100%", marginBottom: 12 }} />
                <button
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => handleDownload(result.vocals, `${file?.name?.replace(/\.[^.]+$/, "")}_vocals.mp3`)}
                >
                  ⬇️ {t.downloadVocals}
                </button>
              </div>

              {/* Instrumental Card */}
              <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎸</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t.instrumentalTrack}</h3>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>{t.instrumentalTrackDesc}</p>
                <audio controls src={`${BACKEND_URL}${result.instrumental}`} style={{ width: "100%", marginBottom: 12 }} />
                <button
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => handleDownload(result.instrumental, `${file?.name?.replace(/\.[^.]+$/, "")}_instrumental.mp3`)}
                >
                  ⬇️ {t.downloadInstrumental}
                </button>
              </div>
            </div>

            <button className="btn btn-secondary" onClick={handleReset}>
              {t.separateAnother}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default VocalRemover;

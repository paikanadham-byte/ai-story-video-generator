import { useState, useRef } from "react";
import { enhanceImage } from "../api/client.js";
import { useI18n } from "../utils/i18n.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

const ENHANCE_FILTERS = [
  { id: "upscale", icon: "🔍", key: "enh_upscale", descKey: "enh_upscaleDesc", hasStrength: true, default: 2 },
  { id: "sharpen", icon: "✨", key: "enh_sharpen", descKey: "enh_sharpenDesc", hasStrength: true, default: 0.7 },
  { id: "denoise", icon: "🔇", key: "enh_denoise", descKey: "enh_denoiseDesc", hasStrength: true, default: 0.5 },
  { id: "hdr", icon: "🌟", key: "enh_hdr", descKey: "enh_hdrDesc", hasStrength: true, default: 0.6 },
  { id: "color_enhance", icon: "🎨", key: "enh_colorEnhance", descKey: "enh_colorEnhanceDesc", hasStrength: true, default: 0.5 },
  { id: "background_blur", icon: "📸", key: "enh_bgBlur", descKey: "enh_bgBlurDesc", hasStrength: true, default: 0.7 },
  { id: "smooth_skin", icon: "🧴", key: "enh_smoothSkin", descKey: "enh_smoothSkinDesc", hasStrength: true, default: 0.5 },
  { id: "vignette", icon: "🔲", key: "enh_vignette", descKey: "enh_vignetteDesc", hasStrength: true, default: 0.5 },
  { id: "warm", icon: "🔥", key: "enh_warm", descKey: "enh_warmDesc", hasStrength: true, default: 0.5 },
  { id: "cool", icon: "❄️", key: "enh_cool", descKey: "enh_coolDesc", hasStrength: true, default: 0.5 },
  { id: "bw", icon: "⬛", key: "enh_bw", descKey: "enh_bwDesc", hasStrength: false, default: 1 },
  { id: "vintage", icon: "📼", key: "enh_vintage", descKey: "enh_vintageDesc", hasStrength: false, default: 1 },
];

function ImageEnhancer() {
  const t = useI18n();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [comparePos, setComparePos] = useState(50);
  const fileRef = useRef(null);
  const compareRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
      setError(null);
    }
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
      setError(null);
    }
  };

  const toggleFilter = (id) => {
    setSelectedFilters((prev) => {
      const copy = { ...prev };
      if (copy[id] !== undefined) {
        delete copy[id];
      } else {
        const filter = ENHANCE_FILTERS.find((f) => f.id === id);
        copy[id] = filter?.default || 1;
      }
      return copy;
    });
  };

  const updateStrength = (id, val) => {
    setSelectedFilters((prev) => ({ ...prev, [id]: parseFloat(val) }));
  };

  const handleEnhance = async () => {
    if (!file || Object.keys(selectedFilters).length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const filters = Object.entries(selectedFilters).map(([name, strength]) => ({ name, strength }));
      const data = await enhanceImage(file, filters);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    try {
      const fullUrl = `${BACKEND_URL}${result.url}`;
      const resp = await fetch(fullUrl);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${file?.name?.replace(/\.[^.]+$/, "")}_enhanced.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(`${BACKEND_URL}${result.url}`, "_blank");
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setSelectedFilters({});
    setComparePos(50);
  };

  const handleCompareMove = (e) => {
    if (!compareRef.current) return;
    const rect = compareRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setComparePos(pct);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const activeCount = Object.keys(selectedFilters).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t.imageEnhancer}</h2>
        <p>{t.imageEnhancerDesc}</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span> {error}
        </div>
      )}

      {!file ? (
        /* ── Upload Zone ── */
        <div className="card">
          <div className="card-title"><span>🖼️</span> {t.uploadImage}</div>
          <div
            className={`editor-upload-zone ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect} />
            <div className="upload-icon">🖼️</div>
            <div className="upload-title">{t.enhUploadTitle}</div>
            <div className="upload-subtitle">{t.enhUploadSubtitle}</div>
          </div>
        </div>
      ) : !result ? (
        /* ── Filter Selection ── */
        <>
          {/* Preview */}
          <div className="card">
            <div className="card-title"><span>📷</span> {t.originalImage}</div>
            <div style={{ textAlign: "center" }}>
              <img src={preview} alt="Preview" style={{ maxWidth: "100%", maxHeight: 360, borderRadius: "var(--radius-md)", boxShadow: "var(--shadow)" }} />
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
                <span>{file.name}</span>
                <span>{formatSize(file.size)}</span>
              </div>
            </div>
          </div>

          {/* Enhancement Filters */}
          <div className="card">
            <div className="card-title"><span>✨</span> {t.enhFilters} <span className="badge">{activeCount} {t.enhSelected}</span></div>
            <div className="editor-tools-grid">
              {ENHANCE_FILTERS.map((f) => {
                const isActive = selectedFilters[f.id] !== undefined;
                return (
                  <button
                    key={f.id}
                    className={`editor-tool-card ${isActive ? "active" : ""}`}
                    onClick={() => toggleFilter(f.id)}
                  >
                    <div className="tool-icon">{f.icon}</div>
                    <div className="tool-name">{t[f.key]}</div>
                    <div className="tool-desc">{t[f.descKey]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Strength Controls */}
          {activeCount > 0 && (
            <div className="card">
              <div className="card-title"><span>⚙️</span> {t.enhAdjust}</div>
              {Object.entries(selectedFilters).map(([id, strength]) => {
                const filter = ENHANCE_FILTERS.find((f) => f.id === id);
                if (!filter || !filter.hasStrength) return null;
                return (
                  <div key={id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{filter.icon} {t[filter.key]}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {id === "upscale" ? `${Math.round(strength)}x` : `${Math.round(strength * 100)}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      className="range-input"
                      min={id === "upscale" ? 1 : 0.1}
                      max={id === "upscale" ? 4 : 1}
                      step={id === "upscale" ? 1 : 0.1}
                      value={strength}
                      onChange={(e) => updateStrength(id, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Enhance Button */}
          <button
            className="generate-btn"
            onClick={handleEnhance}
            disabled={activeCount === 0 || processing}
          >
            {processing ? (
              <><span className="spinner" style={{ width: 20, height: 20, margin: 0 }}></span> {t.enhProcessing}</>
            ) : (
              <>✨ {t.enhEnhanceBtn} ({activeCount} {t.enhFiltersApplied})</>
            )}
          </button>

          <button className="btn btn-secondary" onClick={handleReset} style={{ width: "100%", marginTop: 10, justifyContent: "center" }}>
            {t.enhChooseDifferent}
          </button>
        </>
      ) : (
        /* ── Results with Before/After Comparison ── */
        <>
          <div className="card glow">
            <div className="card-title" style={{ justifyContent: "center" }}>
              <span>✅</span> {t.enhComplete}
            </div>

            {result.width && (
              <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                {result.originalWidth}×{result.originalHeight} → {result.width}×{result.height}
              </p>
            )}

            {/* Before / After Slider */}
            <div
              ref={compareRef}
              onMouseMove={(e) => e.buttons === 1 && handleCompareMove(e)}
              onTouchMove={handleCompareMove}
              onClick={handleCompareMove}
              style={{
                position: "relative",
                width: "100%",
                maxHeight: 440,
                overflow: "hidden",
                borderRadius: "var(--radius-md)",
                cursor: "col-resize",
                userSelect: "none",
                marginBottom: 20,
              }}
            >
              {/* After (enhanced) — full width behind */}
              <img
                src={`${BACKEND_URL}${result.url}`}
                alt="Enhanced"
                style={{ width: "100%", display: "block", maxHeight: 440, objectFit: "contain" }}
              />
              {/* Before (original) — clipped */}
              <div style={{
                position: "absolute", top: 0, left: 0, bottom: 0,
                width: `${comparePos}%`, overflow: "hidden",
              }}>
                <img
                  src={preview}
                  alt="Original"
                  style={{ width: compareRef.current?.clientWidth || "100%", maxHeight: 440, objectFit: "contain", display: "block" }}
                />
              </div>
              {/* Slider line */}
              <div style={{
                position: "absolute", top: 0, bottom: 0, left: `${comparePos}%`,
                width: 3, background: "var(--accent)", transform: "translateX(-50%)",
                boxShadow: "0 0 8px rgba(233,69,96,0.5)",
              }}>
                <div style={{
                  position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                  width: 32, height: 32, borderRadius: "50%", background: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, color: "white", fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}>
                  ⟷
                </div>
              </div>
              {/* Labels */}
              <div style={{ position: "absolute", top: 8, left: 10, fontSize: 11, fontWeight: 700, color: "white", background: "rgba(0,0,0,0.5)", padding: "3px 8px", borderRadius: 6 }}>
                {t.enhBefore}
              </div>
              <div style={{ position: "absolute", top: 8, right: 10, fontSize: 11, fontWeight: 700, color: "white", background: "rgba(233,69,96,0.7)", padding: "3px 8px", borderRadius: 6 }}>
                {t.enhAfter}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-lg" onClick={handleDownload}>
                ⬇️ {t.enhDownload}
              </button>
              <button className="btn btn-secondary" onClick={handleReset}>
                {t.enhEnhanceAnother}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ImageEnhancer;

import { useState } from "react";
import { useI18n } from "../utils/i18n.js";
import I from "./Icons.jsx";

const GENRES = [
  { id: "cinematic", label: "Cinematic" },
  { id: "horror", label: "Horror" },
  { id: "motivational", label: "Motivational" },
  { id: "documentary", label: "Documentary" },
  { id: "comedy", label: "Comedy" },
  { id: "gaming", label: "Gaming" },
  { id: "tech", label: "Tech / Tutorial" },
  { id: "vlog", label: "Vlog / Lifestyle" },
  { id: "fitness", label: "Fitness" },
  { id: "cooking", label: "Cooking" },
  { id: "travel", label: "Travel" },
  { id: "music", label: "Music" },
];

const MODELS = [
  { id: "flux-realism", label: "Photorealistic", desc: "Best quality photos" },
  { id: "flux", label: "AI Art", desc: "Creative & artistic" },
  { id: "flux-3d", label: "3D Render", desc: "3D CGI style" },
  { id: "flux-anime", label: "Anime", desc: "Japanese anime style" },
  { id: "any-dark", label: "Dark Cinematic", desc: "Moody & dramatic" },
  { id: "turbo", label: "Turbo (Fast)", desc: "Quick generation" },
];

const MOOD_PROMPTS = {
  cinematic:    "dramatic cinematic composition, golden hour lighting, bokeh background, epic film poster style, 8K ultra detail",
  horror:       "dark horror atmosphere, eerie fog, dramatic shadows, blood red tones, horror movie poster composition",
  motivational: "inspiring sunrise over mountains, vibrant vivid colors, powerful motivational poster style, particles of light",
  documentary:  "natural authentic lighting, documentary photography style, real-world environment, wide establishing shot",
  comedy:       "bright cheerful pastel colors, fun cartoon-like style, playful composition, energetic and joyful",
  gaming:       "epic gaming artwork, neon RGB lighting, dark background, action-packed scene, game poster illustration",
  tech:         "modern futuristic technology, clean minimal design, deep blue tones, holographic elements, digital art",
  vlog:         "warm golden lifestyle photography, natural bokeh, candid outdoor moment, soft light, aesthetically pleasing",
  fitness:      "powerful athlete silhouette, gym environment, dramatic lighting, energetic and intense composition",
  cooking:      "gourmet food photography, professional studio lighting, shallow depth of field, vibrant appetizing colors",
  travel:       "breathtaking landscape aerial view, golden hour, travel photography, vivid colors, wanderlust feeling",
  music:        "music concert stage, neon lights and smoke, dynamic energy, artistic music video frame",
};

const TEXT_TEMPLATES = [
  { id: "bold_center", label: "Bold Center", css: { top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" } },
  { id: "top_banner", label: "Top Banner", css: { top: 0, left: 0, right: 0, textAlign: "center", background: "rgba(0,0,0,0.6)", padding: "14px 20px" } },
  { id: "bottom_banner", label: "Bottom Banner", css: { bottom: 0, left: 0, right: 0, textAlign: "center", background: "rgba(0,0,0,0.7)", padding: "14px 20px" } },
  { id: "left_overlay", label: "Left Side", css: { top: "50%", left: 24, transform: "translateY(-50%)", textAlign: "left", background: "rgba(0,0,0,0.65)", padding: "16px 20px", borderRadius: 8 } },
];

function ThumbnailMaker() {
  const t = useI18n();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [genre, setGenre] = useState("cinematic");
  const [model, setModel] = useState("flux-realism");
  const [customPrompt, setCustomPrompt] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [textPosition, setTextPosition] = useState("bottom_banner");
  const [showText, setShowText] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [error, setError] = useState(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 99999));

  const buildPrompt = () => {
    if (useCustom && customPrompt.trim()) return customPrompt.trim();
    const mood = MOOD_PROMPTS[genre] || MOOD_PROMPTS.cinematic;
    const titlePart = title.trim() ? `for a video titled "${title.trim()}", ` : "";
    return `Professional YouTube thumbnail ${titlePart}${mood}, highly detailed, vibrant striking composition, thumbnail aspect ratio 16:9, no text, photographic quality`;
  };

  const handleGenerate = () => {
    const prompt = buildPrompt();
    if (!prompt.trim()) {
      setError("Please enter a title or custom prompt");
      return;
    }
    const newSeed = Math.floor(Math.random() * 99999);
    setSeed(newSeed);
    setGenerating(true);
    setImageLoading(true);
    setError(null);
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?model=${model}&width=1280&height=720&seed=${newSeed}&nologo=true`;
    setThumbnailUrl(url);
    setGenerating(false);
  };

  const handleDownload = async () => {
    if (!thumbnailUrl) return;
    try {
      const resp = await fetch(thumbnailUrl);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `thumbnail-${title.replace(/\s+/g, "-") || seed}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(thumbnailUrl, "_blank");
    }
  };

  const textPos = TEXT_TEMPLATES.find((tp) => tp.id === textPosition);

  return (
    <div className="page-container wide">
      <div className="page-header">
        <h2>AI Thumbnail Maker</h2>
        <p>Generate eye-catching YouTube thumbnails instantly — powered by Pollinations AI, 100% free</p>
      </div>

      {error && (
        <div className="error-banner">
          <I name="alert" size={16} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: thumbnailUrl ? "1fr 1fr" : "1fr", gap: 24 }}>
        {/* Left: Settings */}
        <div>
          <div className="card glow">
            <div className="card-title"><I name="sparkles" size={18} /> Thumbnail Settings</div>

            <div className="form-group">
              <label className="form-label">Video Title</label>
              <input
                className="text-input"
                placeholder="e.g. 10 Secrets Nobody Tells You About..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
            </div>

            {showText && (
              <div className="form-group">
                <label className="form-label">Subtitle / Tagline (optional)</label>
                <input
                  className="text-input"
                  placeholder="e.g. #1 Tip That Changed Everything"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Content Genre</label>
              <div className="option-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
                {GENRES.map((g) => (
                  <button
                    key={g.id}
                    className={`option-button ${genre === g.id ? "active" : ""}`}
                    onClick={() => setGenre(g.id)}
                    style={{ fontSize: 12 }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Image Style</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    style={{
                      padding: "10px 8px",
                      borderRadius: 10,
                      border: `2px solid ${model === m.id ? "var(--accent)" : "var(--border)"}`,
                      background: model === m.id ? "var(--accent-glow)" : "var(--bg-input)",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: model === m.id ? "var(--accent)" : "var(--text-primary)" }}>{m.label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} style={{ width: 16, height: 16 }} />
                <span className="form-label" style={{ margin: 0 }}>Use custom image prompt</span>
              </label>
              {useCustom && (
                <textarea
                  className="text-input"
                  style={{ marginTop: 10, minHeight: 80, resize: "vertical" }}
                  placeholder="Describe exactly what you want in the thumbnail image..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                />
              )}
            </div>

            {!useCustom && (title || genre) && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, padding: "10px 14px", background: "var(--bg-input)", borderRadius: 10, lineHeight: 1.6 }}>
                <strong style={{ color: "var(--text-secondary)" }}>AI Prompt Preview:</strong><br />
                {buildPrompt()}
              </div>
            )}

            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? <><span className="spinner" style={{ width: 20, height: 20, margin: 0 }}></span>&nbsp;Generating...</>
                : <><I name="sparkles" size={18} />&nbsp;Generate Thumbnail</>}
            </button>
          </div>

          {/* Text Overlay Settings */}
          {thumbnailUrl && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title"><I name="type" size={18} /> Text Overlay</div>

              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} style={{ width: 16, height: 16 }} />
                  <span className="form-label" style={{ margin: 0 }}>Show text overlay on preview</span>
                </label>
              </div>

              {showText && (
                <div className="form-group">
                  <label className="form-label">Text Position</label>
                  <div className="option-grid">
                    {TEXT_TEMPLATES.map((tp) => (
                      <button
                        key={tp.id}
                        className={`option-button ${textPosition === tp.id ? "active" : ""}`}
                        onClick={() => setTextPosition(tp.id)}
                        style={{ fontSize: 12 }}
                      >
                        {tp.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        {thumbnailUrl && (
          <div>
            <div className="card">
              <div className="card-title"><I name="image" size={18} /> Preview — 1280×720</div>

              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#111", aspectRatio: "16/9" }}>
                {imageLoading && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", zIndex: 2 }}>
                    <div className="spinner" style={{ width: 40, height: 40, marginBottom: 12 }} />
                    <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Generating with Pollinations AI...</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 6 }}>This takes 5–15 seconds</div>
                  </div>
                )}
                <img
                  src={thumbnailUrl}
                  alt="Generated thumbnail"
                  style={{ width: "100%", display: "block", borderRadius: 12, opacity: imageLoading ? 0 : 1, transition: "opacity 0.3s" }}
                  onLoad={() => setImageLoading(false)}
                  onError={() => { setImageLoading(false); setError("Failed to generate thumbnail. Please try again."); }}
                />

                {/* Text overlay preview */}
                {showText && !imageLoading && (title || subtitle) && textPos && (
                  <div style={{ position: "absolute", pointerEvents: "none", zIndex: 3, ...textPos.css }}>
                    {title && (
                      <div style={{
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: "clamp(14px, 3vw, 28px)",
                        textShadow: "2px 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.8)",
                        lineHeight: 1.2,
                        letterSpacing: "0.02em",
                        textTransform: "uppercase",
                      }}>
                        {title}
                      </div>
                    )}
                    {subtitle && (
                      <div style={{
                        color: "#FFD700",
                        fontWeight: 700,
                        fontSize: "clamp(10px, 2vw, 16px)",
                        textShadow: "1px 1px 4px rgba(0,0,0,0.9)",
                        marginTop: 6,
                      }}>
                        {subtitle}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={handleDownload} disabled={imageLoading}>
                  <I name="download" size={16} />&nbsp;Download JPG (1280×720)
                </button>
                <button className="btn btn-secondary" onClick={handleGenerate} disabled={imageLoading}>
                  <I name="refresh" size={16} />&nbsp;Regenerate
                </button>
              </div>

              <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--bg-input)", borderRadius: 10, fontSize: 11, color: "var(--text-muted)" }}>
                💡 <strong>Tip:</strong> The text overlay shown above is a preview only. Download the raw image and add text using Canva or Photoshop for best results.
              </div>
            </div>

            {/* Variations */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title"><I name="layers" size={18} /> Generate Variations</div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
                Create multiple versions with different visual approaches for A/B testing.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { modelId: "flux-realism", label: "Realistic" },
                  { modelId: "flux-3d", label: "3D Style" },
                  { modelId: "any-dark", label: "Dark Mode" },
                ].map((v) => (
                  <button
                    key={v.modelId}
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: "8px 10px" }}
                    onClick={() => { setModel(v.modelId); handleGenerate(); }}
                    disabled={imageLoading}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title"><I name="lightbulb" size={18} /> Thumbnail Best Practices</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 8 }}>
          {[
            { icon: "eye", tip: "Use high contrast colors to stand out in feed" },
            { icon: "type", tip: "Keep text to 3–5 bold words maximum" },
            { icon: "crop", tip: "Ensure the main subject fills at least 60% of frame" },
            { icon: "zap", tip: "Use Photorealistic style for educational / tutorial content" },
            { icon: "sparkles", tip: "Regenerate multiple times to find the perfect shot" },
            { icon: "monitor", tip: "Test how it looks at small size (mobile view)" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <I name={item.icon} size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThumbnailMaker;

import { useState, useRef } from "react";
import { useI18n } from "../utils/i18n.js";
import I from "./Icons.jsx";

const STYLES = [
  { id: "flux-realism",  label: "Photorealistic",  desc: "Real photography",     emoji: "📷" },
  { id: "flux",          label: "AI Art",           desc: "Creative & artistic",  emoji: "🎨" },
  { id: "flux-3d",       label: "3D Render",        desc: "3D CGI style",         emoji: "🎮" },
  { id: "flux-anime",    label: "Anime",            desc: "Japanese anime",       emoji: "🌸" },
  { id: "sana",          label: "Sana",             desc: "High detail AI",       emoji: "✨" },
  { id: "turbo",         label: "Turbo",            desc: "Fastest generation",   emoji: "⚡" },
];

const SIZES = [
  { id: "landscape", label: "Landscape",  w: 1280, h: 720,  icon: "monitor",    desc: "16:9 — YouTube / Desktop" },
  { id: "portrait",  label: "Portrait",   w: 768,  h: 1344, icon: "smartphone", desc: "9:16 — TikTok / Reels" },
  { id: "square",    label: "Square",     w: 1024, h: 1024, icon: "square",     desc: "1:1 — Instagram Post" },
  { id: "banner",    label: "Wide Banner",w: 1792, h: 512,  icon: "film",       desc: "3.5:1 — Twitter / FB Cover" },
];

const PROMPT_PRESETS = [
  { label: "Epic Fantasy Castle", prompt: "A majestic medieval castle perched on a misty mountain peak, surrounded by ancient dragons flying in the stormy sky, golden sunrise breaking through the clouds, ultra-detailed fantasy concept art" },
  { label: "Cyberpunk City Night", prompt: "A rain-soaked neon-lit cyberpunk metropolis at night, flying cars between glass skyscrapers, vibrant pink and blue neon reflections on wet streets, cinematic atmosphere, 8K detail" },
  { label: "Peaceful Forest Path", prompt: "A sunlit enchanted forest path in autumn, golden leaves falling, rays of light filtering through ancient tall trees, serene and magical atmosphere, photorealistic" },
  { label: "Space Galaxy Scene", prompt: "Astronaut floating in deep space surrounded by a swirling colorful nebula, distant galaxies and stars, Earth visible in background, cinematic space photography style" },
  { label: "Flowing Lava Volcano", prompt: "Active volcano erupting at night, glowing orange lava flowing down dark basalt rock, reflected light in steam clouds, dramatic and powerful natural scene, photorealistic" },
  { label: "Abstract Color Flow", prompt: "Beautiful abstract art with flowing liquid metallic paint swirls of gold, platinum and emerald, macro photography style, vivid high contrast colors, stunning digital art" },
];

function ImageCreator() {
  const t = useI18n();
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegative, setShowNegative] = useState(false);
  const [style, setStyle] = useState("flux-realism");
  const [size, setSize] = useState("landscape");
  const [generating, setGenerating] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 999999));
  const [lockedSeed, setLockedSeed] = useState(false);

  const getSizeConfig = () => SIZES.find((s) => s.id === size) || SIZES[0];

  const buildFinalPrompt = () => {
    let base = prompt.trim();
    if (!base) return "";
    if (negativePrompt.trim() && !showNegative) return base;
    return base;
  };

  const handleGenerate = (overrideStyle) => {
    const finalPrompt = buildFinalPrompt();
    if (!finalPrompt) {
      setError("Please enter an image prompt first");
      return;
    }
    const newSeed = lockedSeed ? seed : Math.floor(Math.random() * 999999);
    if (!lockedSeed) setSeed(newSeed);

    const { w, h } = getSizeConfig();
    setGenerating(true);
    setImageLoading(true);
    setError(null);
    setRetryCount(0);

    const activeStyle = overrideStyle || style;
    const encoded = encodeURIComponent(finalPrompt);
    const negEnc = negativePrompt.trim() ? `&negative=${encodeURIComponent(negativePrompt.trim())}` : "";
    const url = `https://image.pollinations.ai/prompt/${encoded}?model=${activeStyle}&width=${w}&height=${h}&seed=${newSeed}&nologo=true&enhance=true${negEnc}`;
    setImageUrl(url);
    setGenerating(false);
  };

  const handleImageError = () => {
    if (retryCount < 2) {
      setRetryCount((c) => c + 1);
      const newSeed = Math.floor(Math.random() * 999999);
      setSeed(newSeed);
      const { w, h } = getSizeConfig();
      const encoded = encodeURIComponent(buildFinalPrompt());
      const url = `https://image.pollinations.ai/prompt/${encoded}?model=${style}&width=${w}&height=${h}&seed=${newSeed}&nologo=true&enhance=true`;
      setImageUrl(url);
    } else {
      setImageLoading(false);
      setError("Generation failed after 3 attempts. Try a different prompt or style.");
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `ai-image-${seed}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  const handleImageLoaded = () => {
    setImageLoading(false);
    if (imageUrl) {
      setHistory((prev) => [{ url: imageUrl, prompt: prompt.slice(0, 60), seed, style }, ...prev].slice(0, 6));
    }
  };

  const loadPreset = (preset) => {
    setPrompt(preset.prompt);
    setError(null);
  };

  const { w, h } = getSizeConfig();

  return (
    <div className="page-container wide">
      <div className="page-header">
        <h2>AI Image Creator</h2>
        <p>Generate stunning images from any text description — powered by Pollinations AI, 100% free, no account needed</p>
      </div>

      {error && (
        <div className="error-banner">
          <I name="alert" size={16} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24 }}>
        {/* Left: Controls */}
        <div>
          <div className="card glow">
            <div className="card-title"><I name="sparkles" size={18} /> Create Image</div>

            {/* Prompt */}
            <div className="form-group">
              <label className="form-label">Image Description (Prompt)</label>
              <textarea
                className="text-input"
                style={{ minHeight: 110, resize: "vertical" }}
                placeholder="Describe what you want to create...&#10;&#10;Example: A majestic wolf howling at a full moon over a snowy mountain, cinematic epic composition, 4K detail"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            {/* Negative Prompt Toggle */}
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: showNegative ? 8 : 0 }}>
                <input type="checkbox" checked={showNegative} onChange={(e) => setShowNegative(e.target.checked)} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Add negative prompt (what to avoid)</span>
              </label>
              {showNegative && (
                <input
                  className="text-input"
                  placeholder="e.g. blurry, low quality, watermark, nsfw..."
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                />
              )}
            </div>

            {/* Style */}
            <div className="form-group">
              <label className="form-label">Art Style</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `2px solid ${style === s.id ? "var(--accent)" : "var(--border)"}`,
                      background: style === s.id ? "var(--accent-glow)" : "var(--bg-input)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{s.emoji}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: style === s.id ? "var(--accent)" : "var(--text-primary)" }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="form-group">
              <label className="form-label">Output Size</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SIZES.map((sz) => (
                  <button
                    key={sz.id}
                    onClick={() => setSize(sz.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `2px solid ${size === sz.id ? "var(--accent)" : "var(--border)"}`,
                      background: size === sz.id ? "var(--accent-glow)" : "var(--bg-input)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: size === sz.id ? "var(--accent)" : "var(--text-primary)" }}>
                      <I name={sz.icon} size={12} style={{ marginRight: 6 }} />
                      {sz.label} — {sz.w}×{sz.h}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sz.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Seed */}
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Seed (variation control)</span>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 400, fontSize: 12 }}>
                  <input type="checkbox" checked={lockedSeed} onChange={(e) => setLockedSeed(e.target.checked)} style={{ width: 14, height: 14 }} />
                  Lock seed
                </label>
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  className="text-input"
                  type="number"
                  value={seed}
                  onChange={(e) => { setSeed(parseInt(e.target.value) || 0); setLockedSeed(true); }}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-secondary" onClick={() => { setSeed(Math.floor(Math.random() * 999999)); setLockedSeed(false); }} style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                  🎲 Random
                </button>
              </div>
            </div>

            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
            >
              {generating
                ? <><span className="spinner" style={{ width: 20, height: 20, margin: 0 }}></span>&nbsp;Generating...</>
                : <><I name="sparkles" size={18} />&nbsp;Generate Image ({w}×{h})</>}
            </button>
          </div>

          {/* Prompt Presets */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title"><I name="lightbulb" size={18} /> Quick Inspiration</div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>Click any preset to load its prompt:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {PROMPT_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  className="btn btn-secondary"
                  style={{ textAlign: "left", fontSize: 12, padding: "9px 14px", justifyContent: "flex-start" }}
                  onClick={() => loadPreset(preset)}
                >
                  <I name="sparkles" size={13} style={{ marginRight: 8, flexShrink: 0 }} />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Output */}
        <div>
          {imageUrl ? (
            <div className="card glow">
              <div className="card-title"><I name="image" size={18} /> Generated Image — {w}×{h}</div>

              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#111", minHeight: 200 }}>
                {imageLoading && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", zIndex: 2, minHeight: 200 }}>
                    <div className="spinner" style={{ width: 44, height: 44, marginBottom: 14 }} />
                    <div style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 600 }}>Generating with Pollinations AI...</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 8 }}>Usually takes 5–20 seconds</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>Style: {STYLES.find((s) => s.id === style)?.label} • {w}×{h}</div>
                  </div>
                )}
                <img
                  src={imageUrl}
                  alt="AI generated image"
                  style={{ width: "100%", display: "block", borderRadius: 12, opacity: imageLoading ? 0 : 1, transition: "opacity 0.4s" }}
                  onLoad={handleImageLoaded}
                  onError={handleImageError}
                />
              </div>

              {!imageLoading && (
                <>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
                    Seed: <code style={{ background: "var(--bg-input)", padding: "2px 6px", borderRadius: 4 }}>{seed}</code> — Copy this seed to recreate the same image later
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    <button className="btn btn-primary" onClick={handleDownload}>
                      <I name="download" size={16} />&nbsp;Download
                    </button>
                    <button className="btn btn-secondary" onClick={handleGenerate}>
                      <I name="refresh" size={16} />&nbsp;Regenerate
                    </button>
                    <button className="btn btn-secondary" onClick={() => window.open(imageUrl, "_blank")} style={{ fontSize: 12 }}>
                      <I name="externalLink" size={14} />&nbsp;Open Full Size
                    </button>
                  </div>

                  {/* Quick style switcher */}
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10 }}>Same prompt, different style:</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {STYLES.filter((s) => s.id !== style).slice(0, 4).map((s) => (
                        <button
                          key={s.id}
                          className="btn btn-secondary"
                          style={{ fontSize: 11, padding: "7px 12px" }}
                          onClick={() => { setStyle(s.id); handleGenerate(s.id); }}
                        >
                          {s.emoji} {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, textAlign: "center" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎨</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Your Image Will Appear Here</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 300, lineHeight: 1.6 }}>
                Enter a description in the prompt box and click Generate. Powered by Pollinations AI — completely free.
              </p>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title"><I name="clock" size={18} /> Recent Creations</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                {history.map((item, i) => (
                  <div
                    key={i}
                    style={{ borderRadius: 8, overflow: "hidden", cursor: "pointer", border: "2px solid var(--border)", transition: "border-color 0.2s" }}
                    onClick={() => setImageUrl(item.url)}
                    title={item.prompt}
                  >
                    <img src={item.url} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                    <div style={{ padding: "6px 8px", fontSize: 10, color: "var(--text-muted)", background: "var(--bg-input)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.prompt || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Tips */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title"><I name="info" size={18} /> Prompt Writing Tips for Best Results</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginTop: 10 }}>
          {[
            { tip: "Be specific about lighting: golden hour, soft diffused light, neon glow, candlelight" },
            { tip: "Add camera terms: close-up, wide angle, aerial view, bokeh, depth of field" },
            { tip: "Specify quality: ultra-detailed, 8K, photorealistic, professional photography" },
            { tip: "Describe the mood: dramatic, serene, mysterious, vibrant, ethereal" },
            { tip: "Use art references: oil painting, watercolor, concept art, digital illustration" },
            { tip: "Lock the seed and change style to compare the same scene in different looks" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }}>✦</span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ImageCreator;

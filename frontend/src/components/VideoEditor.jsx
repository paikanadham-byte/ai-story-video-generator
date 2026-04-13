import { useState, useRef } from "react";
import { io } from "socket.io-client";
import { uploadVideo, startTransform } from "../api/client.js";

const TOOLS = [
  { id: "subtitles", icon: "💬", name: "Auto Subtitles", desc: "Generate & burn subtitles" },
  { id: "revoice", icon: "🎙️", name: "Re-Voice", desc: "Replace audio with AI voice" },
  { id: "resize", icon: "📐", name: "Resize", desc: "Resize for TikTok/Reels/Shorts" },
  { id: "trim", icon: "✂️", name: "Trim & Cut", desc: "Trim start/end of video" },
  { id: "music", icon: "🎵", name: "Add Music", desc: "Add background music track" },
  { id: "speed", icon: "⚡", name: "Speed", desc: "Speed up or slow down" },
  { id: "filter", icon: "🎨", name: "Filters", desc: "Apply color filters & effects" },
  { id: "flip", icon: "🔄", name: "Mirror/Flip", desc: "Flip video horizontally" },
  { id: "watermark", icon: "✏️", name: "Text Overlay", desc: "Add custom text on video" },
  { id: "volume", icon: "🔊", name: "Volume", desc: "Adjust audio volume level" },
  { id: "pitch", icon: "🎛️", name: "Pitch", desc: "Change audio pitch" },
  { id: "overlay", icon: "🖼️", name: "Overlay", desc: "Add image overlay on video" },
  { id: "transition", icon: "🔀", name: "Transitions", desc: "Add transition effects" },
  { id: "voicechanger", icon: "🗣️", name: "Voice Changer", desc: "Apply voice effects" },
  { id: "watermark_remove", icon: "🧹", name: "Remove Watermark", desc: "Remove watermarks from video" },
  { id: "bg_remove", icon: "🖼️", name: "Remove BG", desc: "Remove video background" },
];

const PLATFORMS = [
  { id: "youtube", label: "YouTube (16:9)", ratio: "1920x1080" },
  { id: "tiktok", label: "TikTok (9:16)", ratio: "1080x1920" },
  { id: "reels", label: "Reels (9:16)", ratio: "1080x1920" },
  { id: "shorts", label: "Shorts (9:16)", ratio: "1080x1920" },
  { id: "square", label: "Square (1:1)", ratio: "1080x1080" },
];

function VideoEditor() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoSrc, setVideoSrc] = useState(null);
  const [serverPath, setServerPath] = useState(null);
  const [fileName, setFileName] = useState("");
  const [activeTool, setActiveTool] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [platform, setPlatform] = useState("youtube");
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressDetail, setProgressDetail] = useState("");
  const [error, setError] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);

  // Tool-specific options state
  const [speedValue, setSpeedValue] = useState("1.25");
  const [filterValue, setFilterValue] = useState("cinematic");
  const [watermarkText, setWatermarkText] = useState("");
  const [trimStart, setTrimStart] = useState("0");
  const [trimEnd, setTrimEnd] = useState("30");
  const [revoiceVoice, setRevoiceVoice] = useState("male_deep");
  const [volumeValue, setVolumeValue] = useState("1.0");
  const [pitchValue, setPitchValue] = useState("1.0");
  const [transitionType, setTransitionType] = useState("fade");
  const [voiceEffect, setVoiceEffect] = useState("deep");

  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("video/")) return;
    setVideoFile(file);
    setFileName(file.name);
    setVideoSrc(URL.createObjectURL(file));
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
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleUrlLoad = () => {
    if (!urlInput.trim()) return;
    setVideoSrc(urlInput.trim());
    setFileName(urlInput.trim().split("/").pop() || "External video");
    setVideoUrl(urlInput.trim());
    setServerPath(null); // URL-based, no server upload
    setError(null);
    setResultUrl(null);
  };

  const getToolOptions = () => {
    const opts = {};
    if (activeTool === "speed") opts.speed = speedValue;
    if (activeTool === "filter") opts.filter = filterValue;
    if (activeTool === "resize") {
      const p = PLATFORMS.find((pp) => pp.id === platform);
      opts.platform = p?.ratio || "1920x1080";
    }
    if (activeTool === "watermark") opts.watermarkText = watermarkText;
    if (activeTool === "trim") {
      opts.trimStart = trimStart;
      opts.trimEnd = trimEnd;
    }
    if (activeTool === "revoice") opts.voiceStyle = revoiceVoice;
    if (activeTool === "volume") opts.volume = volumeValue;
    if (activeTool === "pitch") opts.pitch = pitchValue;
    if (activeTool === "transition") opts.transition = transitionType;
    if (activeTool === "voicechanger") opts.voiceEffect = voiceEffect;
    return opts;
  };

  const handleApplyTool = async () => {
    if (!activeTool) return;
    if (!serverPath) {
      setError("Please upload a video file first (URL-only mode does not support editing yet).");
      return;
    }

    setProcessing(true);
    setProgressPct(0);
    setProgressDetail("Starting...");
    setError(null);
    setResultUrl(null);

    try {
      const options = getToolOptions();
      const { jobId } = await startTransform(serverPath, [activeTool], options);

      // Listen for progress via WebSocket
      const socket = io({ transports: ["websocket", "polling"] });
      socket.on("connect", () => socket.emit("subscribe", jobId));

      socket.on("progress", (data) => {
        setProgressPct(data.progress || 0);
        setProgressDetail(data.detail || "");
      });

      socket.on("complete", (data) => {
        setProgressPct(100);
        setProgressDetail("Done!");
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

  return (
    <div className="page-container wide">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Video Editor</h2>
            <p>Upload or paste a video link to edit with AI-powered tools</p>
          </div>
          {videoSrc && (
            <button className="btn btn-secondary" onClick={() => { setVideoSrc(null); setVideoFile(null); setFileName(""); setActiveTool(null); setServerPath(null); setResultUrl(null); setError(null); }}>
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
          <div className="upload-icon">📁</div>
          <div className="upload-title">Drop your video here or click to browse</div>
          <div className="upload-subtitle">Supports MP4, MOV, AVI, MKV — up to 2GB</div>

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

          {/* Video Preview */}
          <div className="card">
            <div className="editor-preview">
              <video src={resultUrl || videoSrc} controls style={{ width: "100%", maxHeight: 380, borderRadius: 12, background: "#000" }} />
              <div className="editor-filename">
                {resultUrl ? "✅ Transformed output" : fileName}
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

          {/* Tools Grid */}
          {!processing && (
            <div className="card">
              <div className="card-title"><span>🛠️</span> Editing Tools</div>
              <div className="editor-tools-grid">
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    className={`editor-tool-card ${activeTool === tool.id ? "active" : ""}`}
                    onClick={() => setActiveTool(tool.id === activeTool ? null : tool.id)}
                  >
                    <div className="tool-icon">{tool.icon}</div>
                    <div className="tool-name">{tool.name}</div>
                    <div className="tool-desc">{tool.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tool options panel */}
          {activeTool && !processing && (
            <div className="card glow">
              <div className="card-title">
                <span>{TOOLS.find(t => t.id === activeTool)?.icon}</span>
                {TOOLS.find(t => t.id === activeTool)?.name} Settings
              </div>

              {activeTool === "resize" && (
                <div className="form-group">
                  <label className="form-label">Target Platform</label>
                  <div className="option-grid">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        className={`option-button ${platform === p.id ? "active" : ""}`}
                        onClick={() => setPlatform(p.id)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTool === "subtitles" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  AI will burn subtitles directly into the video.
                  Style: white text with black outline, bottom-centered.
                </p>
              )}

              {activeTool === "revoice" && (
                <div className="form-group">
                  <label className="form-label">New Voice</label>
                  <select className="select-input" value={revoiceVoice} onChange={(e) => setRevoiceVoice(e.target.value)}>
                    <option value="male_deep">Male (Deep)</option>
                    <option value="male_warm">Male (Warm)</option>
                    <option value="female_warm">Female (Warm)</option>
                    <option value="female_bright">Female (Bright)</option>
                    <option value="storyteller">Storyteller</option>
                  </select>
                  <p style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 6 }}>
                    AI will re-generate voiceover with the selected voice style.
                  </p>
                </div>
              )}

              {activeTool === "speed" && (
                <div className="form-group">
                  <label className="form-label">Playback Speed</label>
                  <select className="select-input" value={speedValue} onChange={(e) => setSpeedValue(e.target.value)}>
                    <option value="0.5">0.5x (Slow)</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x (Normal)</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x (Fast)</option>
                  </select>
                </div>
              )}

              {activeTool === "filter" && (
                <div className="option-grid">
                  {[
                    { id: "cinematic", label: "Cinematic" },
                    { id: "warm", label: "Warm" },
                    { id: "cool", label: "Cool" },
                    { id: "bw", label: "B&W" },
                    { id: "vintage", label: "Vintage" },
                    { id: "high_contrast", label: "High Contrast" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      className={`option-button ${filterValue === f.id ? "active" : ""}`}
                      onClick={() => setFilterValue(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}

              {activeTool === "watermark" && (
                <div className="form-group">
                  <label className="form-label">Text Content</label>
                  <input className="text-input" placeholder="Your text here..." value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} />
                </div>
              )}

              {activeTool === "trim" && (
                <div className="options-row">
                  <div className="form-group">
                    <label className="form-label">Start Time (seconds)</label>
                    <input className="text-input" type="number" placeholder="0" min="0" value={trimStart} onChange={(e) => setTrimStart(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time (seconds)</label>
                    <input className="text-input" type="number" placeholder="30" min="0" value={trimEnd} onChange={(e) => setTrimEnd(e.target.value)} />
                  </div>
                </div>
              )}

              {activeTool === "volume" && (
                <div className="form-group">
                  <label className="form-label">Volume Level</label>
                  <input type="range" min="0" max="3" step="0.1" value={volumeValue} onChange={(e) => setVolumeValue(e.target.value)} className="range-input" />
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, textAlign: "center" }}>{(volumeValue * 100).toFixed(0)}%</div>
                </div>
              )}

              {activeTool === "pitch" && (
                <div className="form-group">
                  <label className="form-label">Pitch Adjustment</label>
                  <input type="range" min="0.5" max="2" step="0.1" value={pitchValue} onChange={(e) => setPitchValue(e.target.value)} className="range-input" />
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, textAlign: "center" }}>{pitchValue}x</div>
                </div>
              )}

              {activeTool === "transition" && (
                <div className="option-grid">
                  {[
                    { id: "fade", label: "Fade" },
                    { id: "dissolve", label: "Dissolve" },
                    { id: "wipe", label: "Wipe" },
                    { id: "slide", label: "Slide" },
                    { id: "zoom", label: "Zoom" },
                    { id: "blur", label: "Blur" },
                  ].map((t) => (
                    <button key={t.id} className={`option-button ${transitionType === t.id ? "active" : ""}`} onClick={() => setTransitionType(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {activeTool === "voicechanger" && (
                <div className="option-grid">
                  {[
                    { id: "deep", label: "🔊 Deep" },
                    { id: "high", label: "🎵 High Pitch" },
                    { id: "robot", label: "🤖 Robot" },
                    { id: "echo", label: "🏔️ Echo" },
                    { id: "whisper", label: "🤫 Whisper" },
                    { id: "radio", label: "📻 Radio" },
                  ].map((v) => (
                    <button key={v.id} className={`option-button ${voiceEffect === v.id ? "active" : ""}`} onClick={() => setVoiceEffect(v.id)}>
                      {v.label}
                    </button>
                  ))}
                </div>
              )}

              {activeTool === "overlay" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  Upload an image to overlay on your video. The overlay will be centered and semi-transparent.
                </p>
              )}

              {activeTool === "music" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  A royalty-free background music track will be mixed into your video at a lower volume behind the original audio.
                </p>
              )}

              {activeTool === "flip" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  The video will be flipped horizontally (mirrored), useful for copyright safety or visual variety.
                </p>
              )}

              {activeTool === "watermark_remove" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  AI will attempt to detect and remove watermarks from the video. Works best with small, static watermarks.
                </p>
              )}

              {activeTool === "bg_remove" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  AI will remove the background from the video, keeping only the main subject. Best for videos with a single subject.
                </p>
              )}

              <div style={{ marginTop: 16 }}>
                <button className="btn btn-primary btn-lg" onClick={handleApplyTool} disabled={processing || uploading || !serverPath}>
                  {uploading ? "Uploading..." : processing ? "Processing..." : `Apply ${TOOLS.find(t => t.id === activeTool)?.name}`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default VideoEditor;

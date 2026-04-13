import { useState, useRef } from "react";
import { io } from "socket.io-client";
import { uploadVideo, startTransform } from "../api/client.js";
import { useI18n } from "../utils/i18n.js";

const TOOL_DEFS = [
  { id: "subtitles", icon: "💬", nameKey: "tool_subtitles", descKey: "tool_subtitlesDesc" },
  { id: "revoice", icon: "🎙️", nameKey: "tool_revoice", descKey: "tool_revoiceDesc" },
  { id: "resize", icon: "📐", nameKey: "tool_resize", descKey: "tool_resizeDesc" },
  { id: "trim", icon: "✂️", nameKey: "tool_trim", descKey: "tool_trimDesc" },
  { id: "music", icon: "🎵", nameKey: "tool_music", descKey: "tool_musicDesc" },
  { id: "speed", icon: "⚡", nameKey: "tool_speed", descKey: "tool_speedDesc" },
  { id: "filter", icon: "🎨", nameKey: "tool_filter", descKey: "tool_filterDesc" },
  { id: "flip", icon: "🔄", nameKey: "tool_flip", descKey: "tool_flipDesc" },
  { id: "watermark", icon: "✏️", nameKey: "tool_watermark", descKey: "tool_watermarkDesc" },
  { id: "volume", icon: "🔊", nameKey: "tool_volume", descKey: "tool_volumeDesc" },
  { id: "pitch", icon: "🎛️", nameKey: "tool_pitch", descKey: "tool_pitchDesc" },
  { id: "overlay", icon: "🖼️", nameKey: "tool_overlay", descKey: "tool_overlayDesc" },
  { id: "transition", icon: "🔀", nameKey: "tool_transition", descKey: "tool_transitionDesc" },
  { id: "voicechanger", icon: "🗣️", nameKey: "tool_voicechanger", descKey: "tool_voicechangerDesc" },
  { id: "watermark_remove", icon: "🧹", nameKey: "tool_watermark_remove", descKey: "tool_watermark_removeDesc" },
  { id: "bg_remove", icon: "🖼️", nameKey: "tool_bg_remove", descKey: "tool_bg_removeDesc" },
];

const PLATFORMS = [
  { id: "youtube", labelKey: "ep_youtube", ratio: "1920x1080" },
  { id: "tiktok", labelKey: "ep_tiktok", ratio: "1080x1920" },
  { id: "reels", labelKey: "ep_reels", ratio: "1080x1920" },
  { id: "shorts", labelKey: "ep_shorts", ratio: "1080x1920" },
  { id: "square", labelKey: "ep_square", ratio: "1080x1080" },
];

function VideoEditor() {
  const t = useI18n();
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
            <h2>{t.videoEditor}</h2>
            <p>{t.videoEditorDesc}</p>
          </div>
          {videoSrc && (
            <button className="btn btn-secondary" onClick={() => { setVideoSrc(null); setVideoFile(null); setFileName(""); setActiveTool(null); setServerPath(null); setResultUrl(null); setError(null); }}>
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
          <div className="upload-icon">📁</div>
          <div className="upload-title">{t.dropVideo}</div>
          <div className="upload-subtitle">{t.dropVideoSub}</div>

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

          {/* Video Preview */}
          <div className="card">
            <div className="editor-preview">
              <video src={resultUrl || videoSrc} controls style={{ width: "100%", maxHeight: 380, borderRadius: 12, background: "#000" }} />
              <div className="editor-filename">
                {resultUrl ? t.transformedOutput : fileName}
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

          {/* Tools Grid */}
          {!processing && (
            <div className="card">
              <div className="card-title"><span>🛠️</span> {t.editingTools}</div>
              <div className="editor-tools-grid">
                {TOOL_DEFS.map((tool) => (
                  <button
                    key={tool.id}
                    className={`editor-tool-card ${activeTool === tool.id ? "active" : ""}`}
                    onClick={() => setActiveTool(tool.id === activeTool ? null : tool.id)}
                  >
                    <div className="tool-icon">{tool.icon}</div>
                    <div className="tool-name">{t[tool.nameKey]}</div>
                    <div className="tool-desc">{t[tool.descKey]}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tool options panel */}
          {activeTool && !processing && (
            <div className="card glow">
              <div className="card-title">
                <span>{TOOL_DEFS.find(tl => tl.id === activeTool)?.icon}</span>
                {t[TOOL_DEFS.find(tl => tl.id === activeTool)?.nameKey]} — {t.toolSettings}
              </div>

              {activeTool === "resize" && (
                <div className="form-group">
                  <label className="form-label">{t.targetPlatform}</label>
                  <div className="option-grid">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        className={`option-button ${platform === p.id ? "active" : ""}`}
                        onClick={() => setPlatform(p.id)}
                      >
                        {t[p.labelKey]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTool === "subtitles" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  {t.subtitlesHint}
                </p>
              )}

              {activeTool === "revoice" && (
                <div className="form-group">
                  <label className="form-label">{t.newVoice}</label>
                  <select className="select-input" value={revoiceVoice} onChange={(e) => setRevoiceVoice(e.target.value)}>
                    <option value="male_deep">{t.v_male_deep}</option>
                    <option value="male_warm">{t.v_male_warm}</option>
                    <option value="female_warm">{t.v_female_warm}</option>
                    <option value="female_bright">{t.v_female_bright}</option>
                    <option value="storyteller">{t.v_storyteller}</option>
                  </select>
                  <p style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 6 }}>
                    {t.revoiceHint}
                  </p>
                </div>
              )}

              {activeTool === "speed" && (
                <div className="form-group">
                  <label className="form-label">{t.playbackSpeed}</label>
                  <select className="select-input" value={speedValue} onChange={(e) => setSpeedValue(e.target.value)}>
                    <option value="0.5">{t.sp_05}</option>
                    <option value="0.75">{t.sp_075}</option>
                    <option value="1">{t.sp_1}</option>
                    <option value="1.25">{t.sp_125}</option>
                    <option value="1.5">{t.sp_15}</option>
                    <option value="2">{t.sp_2}</option>
                  </select>
                </div>
              )}

              {activeTool === "filter" && (
                <div className="option-grid">
                  {[
                    { id: "cinematic", labelKey: "f_cinematic" },
                    { id: "warm", labelKey: "f_warm" },
                    { id: "cool", labelKey: "f_cool" },
                    { id: "bw", labelKey: "f_bw" },
                    { id: "vintage", labelKey: "f_vintage" },
                    { id: "high_contrast", labelKey: "f_highContrast" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      className={`option-button ${filterValue === f.id ? "active" : ""}`}
                      onClick={() => setFilterValue(f.id)}
                    >
                      {t[f.labelKey]}
                    </button>
                  ))}
                </div>
              )}

              {activeTool === "watermark" && (
                <div className="form-group">
                  <label className="form-label">{t.textContent}</label>
                  <input className="text-input" placeholder={t.textContentPlaceholder} value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} />
                </div>
              )}

              {activeTool === "trim" && (
                <div className="options-row">
                  <div className="form-group">
                    <label className="form-label">{t.startTime}</label>
                    <input className="text-input" type="number" placeholder="0" min="0" value={trimStart} onChange={(e) => setTrimStart(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t.endTime}</label>
                    <input className="text-input" type="number" placeholder="30" min="0" value={trimEnd} onChange={(e) => setTrimEnd(e.target.value)} />
                  </div>
                </div>
              )}

              {activeTool === "volume" && (
                <div className="form-group">
                  <label className="form-label">{t.volumeLevel}</label>
                  <input type="range" min="0" max="3" step="0.1" value={volumeValue} onChange={(e) => setVolumeValue(e.target.value)} className="range-input" />
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, textAlign: "center" }}>{(volumeValue * 100).toFixed(0)}%</div>
                </div>
              )}

              {activeTool === "pitch" && (
                <div className="form-group">
                  <label className="form-label">{t.pitchAdjustment}</label>
                  <input type="range" min="0.5" max="2" step="0.1" value={pitchValue} onChange={(e) => setPitchValue(e.target.value)} className="range-input" />
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, textAlign: "center" }}>{pitchValue}x</div>
                </div>
              )}

              {activeTool === "transition" && (
                <div className="option-grid">
                  {[
                    { id: "fade", labelKey: "tr_fade" },
                    { id: "dissolve", labelKey: "tr_dissolve" },
                    { id: "wipe", labelKey: "tr_wipe" },
                    { id: "slide", labelKey: "tr_slide" },
                    { id: "zoom", labelKey: "tr_zoom" },
                    { id: "blur", labelKey: "tr_blur" },
                  ].map((tr) => (
                    <button key={tr.id} className={`option-button ${transitionType === tr.id ? "active" : ""}`} onClick={() => setTransitionType(tr.id)}>
                      {t[tr.labelKey]}
                    </button>
                  ))}
                </div>
              )}

              {activeTool === "voicechanger" && (
                <div className="option-grid">
                  {[
                    { id: "deep", labelKey: "vc_deep" },
                    { id: "high", labelKey: "vc_high" },
                    { id: "robot", labelKey: "vc_robot" },
                    { id: "echo", labelKey: "vc_echo" },
                    { id: "whisper", labelKey: "vc_whisper" },
                    { id: "radio", labelKey: "vc_radio" },
                  ].map((v) => (
                    <button key={v.id} className={`option-button ${voiceEffect === v.id ? "active" : ""}`} onClick={() => setVoiceEffect(v.id)}>
                      {t[v.labelKey]}
                    </button>
                  ))}
                </div>
              )}

              {activeTool === "overlay" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  {t.overlayHint}
                </p>
              )}

              {activeTool === "music" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  {t.musicHint}
                </p>
              )}

              {activeTool === "flip" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  {t.flipHint}
                </p>
              )}

              {activeTool === "watermark_remove" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  {t.watermarkRemoveHint}
                </p>
              )}

              {activeTool === "bg_remove" && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  {t.bgRemoveHint}
                </p>
              )}

              <div style={{ marginTop: 16 }}>
                <button className="btn btn-primary btn-lg" onClick={handleApplyTool} disabled={processing || uploading || !serverPath}>
                  {uploading ? t.loading : processing ? t.loading : `${t.apply} ${t[TOOL_DEFS.find(tl => tl.id === activeTool)?.nameKey]}`}
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

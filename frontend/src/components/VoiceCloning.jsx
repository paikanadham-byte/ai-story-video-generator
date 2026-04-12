import { useState, useRef, useEffect } from "react";
import { cloneVoice, getClonedVoices, deleteClonedVoice, previewVoice } from "../api/client.js";

function VoiceCloning() {
  const [audioFile, setAudioFile] = useState(null);
  const [audioSrc, setAudioSrc] = useState(null);
  const [fileName, setFileName] = useState("");
  const [cloneName, setCloneName] = useState("");
  const [gender, setGender] = useState("male");
  const [style, setStyle] = useState("warm");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [clonedVoices, setClonedVoices] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [previewPlaying, setPreviewPlaying] = useState(null);
  const fileRef = useRef(null);
  const mediaRef = useRef(null);
  const timerRef = useRef(null);
  const audioPreviewRef = useRef(null);

  useEffect(() => { loadVoices(); }, []);

  const loadVoices = async () => {
    try {
      const { voices } = await getClonedVoices();
      setClonedVoices(voices || []);
    } catch (err) {
      console.error("Failed to load voices:", err);
    }
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("audio/")) return;
    setAudioFile(file);
    setAudioSrc(URL.createObjectURL(file));
    setFileName(file.name);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioFile(blob);
        setAudioSrc(URL.createObjectURL(blob));
        setFileName("recording.webm");
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state === "recording") {
      mediaRef.current.stop();
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleClone = async () => {
    if (!audioFile || !cloneName.trim()) return;
    setProcessing(true);
    setError(null);
    try {
      const { voice } = await cloneVoice(audioFile, cloneName.trim(), gender, style);
      setClonedVoices((prev) => [...prev, voice]);
      setAudioFile(null);
      setAudioSrc(null);
      setFileName("");
      setCloneName("");
    } catch (err) {
      setError(err.message || "Failed to clone voice");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (voiceId) => {
    try {
      await deleteClonedVoice(voiceId);
      setClonedVoices((prev) => prev.filter((v) => v.id !== voiceId));
    } catch (err) {
      setError("Failed to delete voice: " + err.message);
    }
  };

  const handlePreview = async (voiceId) => {
    try {
      setPreviewPlaying(voiceId);
      const blob = await previewVoice(voiceId, "Hello! This is a preview of my cloned voice. I can narrate any story for you.");
      const url = URL.createObjectURL(blob);
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
      const audio = new Audio(url);
      audioPreviewRef.current = audio;
      audio.onended = () => setPreviewPlaying(null);
      audio.onerror = () => setPreviewPlaying(null);
      audio.play();
    } catch (err) {
      setPreviewPlaying(null);
      setError("Preview failed: " + err.message);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>AI Voice Cloning 🧬</h2>
        <p>Clone your voice from a 30-second sample and use it in all your videos</p>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: 16 }}>
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
      )}

      <div className="card glow">
        <div className="card-title">
          <span>🎤</span> Voice Sample
          <span className="badge" style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: "var(--gradient-accent)", color: "white", fontWeight: 700, marginLeft: 8 }}>PRO</span>
        </div>

        {!audioSrc ? (
          <>
            <div
              className={`editor-upload-zone ${dragging ? "dragging" : ""}`}
              style={{ marginBottom: 16 }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isRecording && fileRef.current?.click()}
            >
              <div className="upload-icon">🎙️</div>
              <div className="upload-title">
                {isRecording ? `Recording... ${recordingTime}s` : "Upload a voice sample"}
              </div>
              <div className="upload-subtitle">
                {isRecording
                  ? "Speak clearly for at least 30 seconds"
                  : "MP3, WAV, or M4A — at least 30 seconds of clear speech"}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {!isRecording ? (
                <button className="btn btn-accent btn-lg" onClick={startRecording}>
                  🎤 Record Voice Sample
                </button>
              ) : (
                <button className="btn btn-lg" onClick={stopRecording} style={{ background: "var(--error)", color: "white", border: "none" }}>
                  ⏹️ Stop Recording ({recordingTime}s)
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <audio src={audioSrc} controls style={{ width: "100%", borderRadius: 8 }} />
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, textAlign: "center" }}>
                {fileName}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Voice Clone Name</label>
              <input
                className="text-input"
                placeholder="e.g. My Voice, Studio Voice, Deep Narrator..."
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
              />
            </div>

            <div className="options-row" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Voice Gender</label>
                <select className="select-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Voice Style</label>
                <select className="select-input" value={style} onChange={(e) => setStyle(e.target.value)}>
                  <option value="warm">Warm</option>
                  <option value="deep">Deep</option>
                  <option value="narrator">Narrator</option>
                  <option value="casual">Casual</option>
                  <option value="neutral">Neutral</option>
                  <option value="bright">Bright</option>
                  <option value="confident">Confident</option>
                  <option value="cheerful">Cheerful</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleClone}
                disabled={processing || !cloneName.trim()}
                style={{ flex: 1 }}
              >
                {processing ? "🧬 Cloning Voice..." : "🧬 Clone This Voice"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setAudioFile(null); setAudioSrc(null); setFileName(""); setError(null); }}
              >
                ← Re-record
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <span>🗣️</span> Your Cloned Voices
        </div>
        {clonedVoices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🧬</div>
            <p>No cloned voices yet. Upload a sample above to get started!</p>
          </div>
        ) : (
          <div className="cloned-voices-list">
            {clonedVoices.map((v) => (
              <div key={v.id} className="cloned-voice-card">
                <div className="voice-avatar">🗣️</div>
                <div className="voice-info">
                  <h4>{v.name}</h4>
                  <p>
                    {v.gender} • {v.style} •{" "}
                    {v.sampleDuration ? `${v.sampleDuration}s sample` : "Ready"} •{" "}
                    {new Date(v.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => handlePreview(v.id)}
                    disabled={previewPlaying === v.id}
                  >
                    {previewPlaying === v.id ? "🔊 Playing..." : "▶️ Preview"}
                  </button>
                  <button
                    className="btn"
                    style={{ padding: "6px 12px", fontSize: 12, background: "var(--error)", color: "white", border: "none" }}
                    onClick={() => handleDelete(v.id)}
                  >
                    🗑️
                  </button>
                  <div className="voice-status ready">✅ Ready</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {clonedVoices.length > 0 && (
          <div style={{ marginTop: 12, padding: 12, background: "rgba(139, 92, 246, 0.1)", borderRadius: 8, fontSize: 13 }}>
            💡 <strong>Tip:</strong> Your cloned voices appear in the voice dropdown when creating a new video. Select one to narrate with your custom voice!
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <span>💡</span> How Voice Cloning Works
        </div>
        <div className="how-it-works">
          <div className="how-step">
            <div className="how-step-num">1</div>
            <div>
              <h4>Record or Upload</h4>
              <p>Provide at least 30 seconds of clear speech in a quiet environment</p>
            </div>
          </div>
          <div className="how-step">
            <div className="how-step-num">2</div>
            <div>
              <h4>AI Analyzes</h4>
              <p>Our AI extracts your voice characteristics and matches the best synthesis profile</p>
            </div>
          </div>
          <div className="how-step">
            <div className="how-step-num">3</div>
            <div>
              <h4>Use Everywhere</h4>
              <p>Select your cloned voice when creating videos — it appears alongside the default voices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceCloning;

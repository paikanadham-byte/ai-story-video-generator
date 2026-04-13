import { useState, useEffect } from "react";
import { getStoryIdeas, getLanguages, getClonedVoices } from "../api/client.js";

const CONTENT_TYPES = [
  { id: "story", label: "📖 Story / Narrative" },
  { id: "educational", label: "🎓 Educational" },
  { id: "tutorial", label: "📐 Tutorial / How-To" },
  { id: "product", label: "🛍️ Product Promo" },
  { id: "news", label: "📰 News / Explainer" },
  { id: "social", label: "📱 Social Media" },
  { id: "vlog", label: "🎤 Vlog Style" },
  { id: "meditation", label: "🧘 Meditation / ASMR" },
];

const GENRES = [
  { id: "cinematic", label: "🎥 Cinematic" },
  { id: "horror", label: "👻 Horror" },
  { id: "romance", label: "❤️ Romance" },
  { id: "documentary", label: "🎞️ Documentary" },
  { id: "motivational", label: "🔥 Motivational" },
  { id: "comedy", label: "😂 Comedy" },
  { id: "scifi", label: "🚀 Sci-Fi" },
  { id: "thriller", label: "🔪 Thriller" },
  { id: "fantasy", label: "🧙 Fantasy" },
  { id: "action", label: "💥 Action" },
];

const VOICES = [
  { id: "storyteller", label: "Storyteller" },
  { id: "male_deep", label: "Male (Deep)" },
  { id: "male_warm", label: "Male (Warm)" },
  { id: "male_casual", label: "Male (Casual)" },
  { id: "male_narrator", label: "Male (Narrator)" },
  { id: "female_warm", label: "Female (Warm)" },
  { id: "female_bright", label: "Female (Bright)" },
  { id: "female_confident", label: "Female (Confident)" },
  { id: "female_cheerful", label: "Female (Cheerful)" },
  { id: "neutral", label: "Neutral" },
];

const DURATIONS = [
  { id: 1, label: "~1 min (Short)" },
  { id: 2, label: "~2 min" },
  { id: 3, label: "~3 min" },
  { id: 5, label: "~5 min" },
  { id: 10, label: "~10 min" },
  { id: 15, label: "~15 min" },
  { id: 30, label: "~30 min" },
  { id: 60, label: "~60 min (Long)" },
];

const MUSIC_MOODS = [
  { id: "", label: "None" },
  { id: "calm", label: "🎵 Calm" },
  { id: "epic", label: "🎵 Epic" },
  { id: "dark", label: "🎵 Dark" },
  { id: "upbeat", label: "🎵 Upbeat" },
  { id: "romantic", label: "🎵 Romantic" },
];

const LANGUAGES = [
  { code: "en", name: "🇺🇸 English" },
  { code: "fa", name: "🇮🇷 Persian (فارسی)" },
  { code: "es", name: "🇪🇸 Spanish" },
  { code: "fr", name: "🇫🇷 French" },
  { code: "de", name: "🇩🇪 German" },
  { code: "hi", name: "🇮🇳 Hindi" },
  { code: "ar", name: "🇸🇦 Arabic" },
  { code: "pt", name: "🇧🇷 Portuguese" },
  { code: "ja", name: "🇯🇵 Japanese" },
  { code: "ko", name: "🇰🇷 Korean" },
  { code: "zh", name: "🇨🇳 Chinese" },
  { code: "it", name: "🇮🇹 Italian" },
  { code: "ru", name: "🇷🇺 Russian" },
  { code: "tr", name: "🇹🇷 Turkish" },
  { code: "nl", name: "🇳🇱 Dutch" },
  { code: "pl", name: "🇵🇱 Polish" },
  { code: "sv", name: "🇸🇪 Swedish" },
  { code: "th", name: "🇹🇭 Thai" },
  { code: "vi", name: "🇻🇳 Vietnamese" },
  { code: "id", name: "🇮🇩 Indonesian" },
  { code: "uk", name: "🇺🇦 Ukrainian" },
];

const PLATFORMS = [
  { id: "landscape", label: "🖥️ YouTube (16:9)", ratio: "16:9" },
  { id: "portrait", label: "📱 TikTok / Reels (9:16)", ratio: "9:16" },
  { id: "square", label: "⬛ Instagram Post (1:1)", ratio: "1:1" },
  { id: "classic", label: "🎬 Cinema (21:9)", ratio: "21:9" },
];

function CreateVideo({ onGenerate, error }) {
  const [storyIdea, setStoryIdea] = useState("");
  const [contentType, setContentType] = useState("story");
  const [genre, setGenre] = useState("cinematic");
  const [voiceStyle, setVoiceStyle] = useState("storyteller");
  const [targetDuration, setTargetDuration] = useState(2);
  const [resolution, setResolution] = useState("1080p");
  const [platform, setPlatform] = useState("landscape");
  const [musicMood, setMusicMood] = useState("");
  const [language, setLanguage] = useState("en");
  const [priorityRender, setPriorityRender] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [clonedVoices, setClonedVoices] = useState([]);

  useEffect(() => {
    getClonedVoices()
      .then(({ voices }) => setClonedVoices(voices || []))
      .catch(() => {});
  }, []);

  const estimatedScenes = Math.max(10, Math.min(60, Math.round((targetDuration * 60) / 4.5)));

  const handleGetIdeas = async () => {
    setLoadingIdeas(true);
    try {
      const { ideas: newIdeas } = await getStoryIdeas(genre, targetDuration);
      setIdeas(newIdeas || []);
    } catch (err) {
      console.error("Failed to get ideas:", err);
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleSubmit = async () => {
    if (storyIdea.trim().length < 10) return;
    setLoading(true);
    try {
      await onGenerate({
        storyIdea: storyIdea.trim(),
        contentType,
        genre,
        voiceStyle,
        targetDuration,
        resolution,
        platform: PLATFORMS.find(p => p.id === platform)?.ratio || "16:9",
        musicMood: musicMood || null,
        language,
        priorityRender,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Create AI Video</h2>
        <p>Turn any idea into a professional video — stories, tutorials, promos, and more</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Content Type */}
      <div className="card">
        <div className="card-title"><span>🎯</span> Content Type</div>
        <div className="option-grid">
          {CONTENT_TYPES.map((t) => (
            <button
              key={t.id}
              className={`option-button ${contentType === t.id ? "active" : ""}`}
              onClick={() => setContentType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Story Input */}
      <div className="card">
        <div className="card-title">
          <span>✍️</span> {contentType === "story" ? "Story Idea" : "Video Description"}
        </div>
        <div className="form-group">
          <textarea
            className="textarea-input"
            placeholder={contentType === "story"
              ? "Describe your story idea in detail...\n\nExample: A lonely astronaut discovers a mysterious signal from a dead planet."
              : contentType === "tutorial"
              ? "Describe what you want to teach...\n\nExample: How to build a simple website using HTML & CSS in 5 minutes."
              : contentType === "product"
              ? "Describe your product or service...\n\nExample: Our new wireless earbuds combine premium audio with 36-hour battery life."
              : "Describe your video idea in detail...\n\nExample: Top 10 fascinating facts about the deep ocean that will blow your mind."}
            value={storyIdea}
            onChange={(e) => setStoryIdea(e.target.value)}
            maxLength={5000}
          />
          <div className="char-count">{storyIdea.length} / 5000</div>
        </div>

        <button
          className="idea-btn"
          onClick={handleGetIdeas}
          disabled={loadingIdeas}
          type="button"
        >
          {loadingIdeas ? "Generating ideas..." : "✨ Give Me Story Ideas"}
        </button>

        {ideas.length > 0 && (
          <div className="ideas-grid">
            {ideas.map((idea, i) => (
              <button
                key={i}
                className="idea-card"
                onClick={() => {
                  setStoryIdea(idea.idea || idea.description || "");
                  setIdeas([]);
                }}
              >
                <div className="idea-title">{idea.title}</div>
                <div className="idea-text">{idea.idea || idea.description}</div>
                {idea.tags && (
                  <div className="idea-tags">
                    {idea.tags.map((t, j) => (
                      <span key={j} className="idea-tag">#{t}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Genre */}
      <div className="card">
        <div className="card-title"><span>🎭</span> Genre</div>
        <div className="option-grid">
          {GENRES.map((g) => (
            <button
              key={g.id}
              className={`option-button ${genre === g.id ? "active" : ""}`}
              onClick={() => setGenre(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform / Aspect Ratio */}
      <div className="card">
        <div className="card-title"><span>📐</span> Platform / Size</div>
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

      {/* Settings */}
      <div className="card">
        <div className="card-title"><span>⚙️</span> Settings</div>

        <div className="options-row">
          <div className="form-group">
            <label className="form-label">Voice Style</label>
            <select className="select-input" value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)}>
              {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              {clonedVoices.length > 0 && <option disabled>── Cloned Voices ──</option>}
              {clonedVoices.map((v) => <option key={v.id} value={v.id}>🧬 {v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Resolution</label>
            <select className="select-input" value={resolution} onChange={(e) => setResolution(e.target.value)}>
              <option value="720p">720p (Faster)</option>
              <option value="1080p">1080p (Higher Quality)</option>
              <option value="4k">4K Ultra HD 💎</option>
            </select>
          </div>
        </div>

        <div className="options-row">
          <div className="form-group">
            <label className="form-label">Video Duration</label>
            <select className="select-input" value={targetDuration} onChange={(e) => setTargetDuration(Number(e.target.value))}>
              {DURATIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              ~{estimatedScenes} scenes will be generated
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Background Music</label>
            <select className="select-input" value={musicMood} onChange={(e) => setMusicMood(e.target.value)}>
              {MUSIC_MOODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="options-row">
          <div className="form-group">
            <label className="form-label">🌐 Language</label>
            <select className="select-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">🚀 Priority Rendering</label>
            <button
              className={`option-button ${priorityRender ? "active" : ""}`}
              onClick={() => setPriorityRender(!priorityRender)}
              style={{ width: "100%" }}
            >
              {priorityRender ? "⚡ Priority ON — 5x Faster" : "Standard Queue"}
            </button>
          </div>
        </div>
      </div>

      <button
        className="generate-btn"
        onClick={handleSubmit}
        disabled={loading || storyIdea.trim().length < 10}
      >
        {loading ? <>Generating...</> : <>🎬 Generate Video</>}
      </button>

      <div style={{ height: 24 }} />
    </div>
  );
}

export default CreateVideo;

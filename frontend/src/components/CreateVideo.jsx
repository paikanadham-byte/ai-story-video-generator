import { useState, useEffect } from "react";
import { getStoryIdeas, getLanguages, getClonedVoices } from "../api/client.js";
import { useI18n } from "../utils/i18n.js";

const CONTENT_TYPES = [
  { id: "story", labelKey: "ct_story" },
  { id: "educational", labelKey: "ct_educational" },
  { id: "tutorial", labelKey: "ct_tutorial" },
  { id: "product", labelKey: "ct_productPromo" },
  { id: "news", labelKey: "ct_news" },
  { id: "social", labelKey: "ct_social" },
  { id: "vlog", labelKey: "ct_vlog" },
  { id: "meditation", labelKey: "ct_meditation" },
];

const GENRES = [
  { id: "cinematic", labelKey: "g_cinematic" },
  { id: "horror", labelKey: "g_horror" },
  { id: "romance", labelKey: "g_romance" },
  { id: "documentary", labelKey: "g_documentary" },
  { id: "motivational", labelKey: "g_motivational" },
  { id: "comedy", labelKey: "g_comedy" },
  { id: "scifi", labelKey: "g_scifi" },
  { id: "thriller", labelKey: "g_thriller" },
  { id: "fantasy", labelKey: "g_fantasy" },
  { id: "action", labelKey: "g_action" },
];

const VOICES = [
  { id: "storyteller", labelKey: "v_storyteller" },
  { id: "male_deep", labelKey: "v_male_deep" },
  { id: "male_warm", labelKey: "v_male_warm" },
  { id: "male_casual", labelKey: "v_male_casual" },
  { id: "male_narrator", labelKey: "v_male_narrator" },
  { id: "female_warm", labelKey: "v_female_warm" },
  { id: "female_bright", labelKey: "v_female_bright" },
  { id: "female_confident", labelKey: "v_female_confident" },
  { id: "female_cheerful", labelKey: "v_female_cheerful" },
  { id: "neutral", labelKey: "v_neutral" },
];

const DURATIONS = [
  { id: 1, labelKey: "d_1min" },
  { id: 2, labelKey: "d_2min" },
  { id: 3, labelKey: "d_3min" },
  { id: 5, labelKey: "d_5min" },
  { id: 10, labelKey: "d_10min" },
  { id: 15, labelKey: "d_15min" },
  { id: 30, labelKey: "d_30min" },
  { id: 60, labelKey: "d_60min" },
];

const MUSIC_MOODS = [
  { id: "", labelKey: "m_none" },
  { id: "calm", labelKey: "m_calm" },
  { id: "epic", labelKey: "m_epic" },
  { id: "dark", labelKey: "m_dark" },
  { id: "upbeat", labelKey: "m_upbeat" },
  { id: "romantic", labelKey: "m_romantic" },
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
  { id: "landscape", labelKey: "p_youtube", ratio: "16:9" },
  { id: "portrait", labelKey: "p_tiktok", ratio: "9:16" },
  { id: "square", labelKey: "p_instagram", ratio: "1:1" },
  { id: "classic", labelKey: "p_cinema", ratio: "21:9" },
];

function CreateVideo({ onGenerate, error }) {
  const t = useI18n();
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
        <h2>{t.createVideoTitle}</h2>
        <p>{t.createVideoDesc}</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Content Type */}
      <div className="card">
        <div className="card-title"><span>🎯</span> {t.contentType}</div>
        <div className="option-grid">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct.id}
              className={`option-button ${contentType === ct.id ? "active" : ""}`}
              onClick={() => setContentType(ct.id)}
            >
              {t[ct.labelKey]}
            </button>
          ))}
        </div>
      </div>

      {/* Story Input */}
      <div className="card">
        <div className="card-title">
          <span>✍️</span> {contentType === "story" ? t.storyIdea : t.videoDescription}
        </div>
        <div className="form-group">
          <textarea
            className="textarea-input"
            placeholder={contentType === "story"
              ? t.storyPlaceholder
              : contentType === "tutorial"
              ? t.tutorialPlaceholder
              : contentType === "product"
              ? t.productPlaceholder
              : t.defaultPlaceholder}
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
          {loadingIdeas ? t.generatingIdeas : t.giveMeIdeas}
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
                    {idea.tags.map((tag, j) => (
                      <span key={j} className="idea-tag">#{tag}</span>
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
        <div className="card-title"><span>🎭</span> {t.genre}</div>
        <div className="option-grid">
          {GENRES.map((g) => (
            <button
              key={g.id}
              className={`option-button ${genre === g.id ? "active" : ""}`}
              onClick={() => setGenre(g.id)}
            >
              {t[g.labelKey]}
            </button>
          ))}
        </div>
      </div>

      {/* Platform / Aspect Ratio */}
      <div className="card">
        <div className="card-title"><span>📐</span> {t.platformSize}</div>
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

      {/* Settings */}
      <div className="card">
        <div className="card-title"><span>⚙️</span> {t.settingsTitle}</div>

        <div className="options-row">
          <div className="form-group">
            <label className="form-label">{t.voiceStyle}</label>
            <select className="select-input" value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)}>
              {VOICES.map((v) => <option key={v.id} value={v.id}>{t[v.labelKey]}</option>)}
              {clonedVoices.length > 0 && <option disabled>{t.clonedVoices}</option>}
              {clonedVoices.map((v) => <option key={v.id} value={v.id}>🧬 {v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t.resolution}</label>
            <select className="select-input" value={resolution} onChange={(e) => setResolution(e.target.value)}>
              <option value="720p">{t.r_720} {t.r_720desc}</option>
              <option value="1080p">{t.r_1080} {t.r_1080desc}</option>
              <option value="4k">{t.r_4k}</option>
            </select>
          </div>
        </div>

        <div className="options-row">
          <div className="form-group">
            <label className="form-label">{t.videoDuration}</label>
            <select className="select-input" value={targetDuration} onChange={(e) => setTargetDuration(Number(e.target.value))}>
              {DURATIONS.map((d) => <option key={d.id} value={d.id}>{t[d.labelKey]}</option>)}
            </select>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              ~{estimatedScenes} {t.scenesGenerated}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t.backgroundMusic}</label>
            <select className="select-input" value={musicMood} onChange={(e) => setMusicMood(e.target.value)}>
              {MUSIC_MOODS.map((m) => <option key={m.id} value={m.id}>{t[m.labelKey]}</option>)}
            </select>
          </div>
        </div>

        <div className="options-row">
          <div className="form-group">
            <label className="form-label">🌐 {t.language}</label>
            <select className="select-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">🚀 {t.priorityRendering}</label>
            <button
              className={`option-button ${priorityRender ? "active" : ""}`}
              onClick={() => setPriorityRender(!priorityRender)}
              style={{ width: "100%" }}
            >
              {priorityRender ? t.priorityOn : t.standardQueue}
            </button>
          </div>
        </div>
      </div>

      <button
        className="generate-btn"
        onClick={handleSubmit}
        disabled={loading || storyIdea.trim().length < 10}
      >
        {loading ? <>{t.generating}</> : <>{t.generateVideo}</>}
      </button>

      <div style={{ height: 24 }} />
    </div>
  );
}

export default CreateVideo;

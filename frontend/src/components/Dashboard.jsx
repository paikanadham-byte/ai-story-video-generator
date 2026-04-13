import { useI18n } from "../utils/i18n.js";

function Dashboard({ onNavigate }) {
  const t = useI18n();
  return (
    <div className="page-container wide">
      <div className="page-header">
        <h2>{t.welcomeTo}</h2>
        <p>{t.welcomeDesc}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">🎬</div>
          <div className="stat-value">∞</div>
          <div className="stat-label">{t.unlimitedRenders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">🎙️</div>
          <div className="stat-value">10+</div>
          <div className="stat-label">{t.aiVoicesCloning}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink">🌐</div>
          <div className="stat-value">20</div>
          <div className="stat-label">{t.languages}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">💎</div>
          <div className="stat-value">{t.pro}</div>
          <div className="stat-label">{t.allFeaturesUnlocked}</div>
        </div>
      </div>

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>{t.quickActions}</h2>
      </div>

      <div className="quick-actions">
        <button className="quick-action" onClick={() => onNavigate("create")}>
          <div className="quick-action-icon">✨</div>
          <h3>{t.createAIVideo}</h3>
          <p>{t.createAIVideoDesc}</p>
        </button>

        <button className="quick-action" onClick={() => onNavigate("editor")}>
          <div className="quick-action-icon">🎞️</div>
          <h3>{t.videoEditorTitle}</h3>
          <p>{t.videoEditorDesc}</p>
        </button>

        <button className="quick-action" onClick={() => onNavigate("copyright")}>
          <div className="quick-action-icon">🛡️</div>
          <h3>{t.copyrightTransformer}</h3>
          <p>{t.copyrightTransformerDesc}</p>
        </button>
      </div>

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>{t.proQuickActions}</h2>
      </div>

      <div className="quick-actions">
        <button className="quick-action" onClick={() => onNavigate("voice-clone")}>
          <div className="quick-action-icon">🧬</div>
          <h3>{t.voiceCloningTitle}</h3>
          <p>{t.voiceCloningDesc}</p>
        </button>

        <button className="quick-action" onClick={() => onNavigate("api")}>
          <div className="quick-action-icon">📱</div>
          <h3>{t.apiAccessTitle}</h3>
          <p>{t.apiAccessDesc}</p>
        </button>

        <button className="quick-action" onClick={() => onNavigate("pro")}>
          <div className="quick-action-icon">💎</div>
          <h3>{t.allFeaturesBtn}</h3>
          <p>{t.allFeaturesDesc}</p>
        </button>
      </div>

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>{t.allFeaturesTitle}</h2>
      </div>

      <div className="features-grid">
        {[
          { icon: "📝", key: "feat_aiScriptWriter", descKey: "feat_aiScriptWriterDesc", isFree: true },
          { icon: "🎙️", key: "feat_10aiVoices", descKey: "feat_10aiVoicesDesc", isFree: true },
          { icon: "📷", key: "feat_stockMedia", descKey: "feat_stockMediaDesc", isFree: true },
          { icon: "💬", key: "feat_autoSubtitles", descKey: "feat_autoSubtitlesDesc", isFree: true },
          { icon: "💡", key: "feat_ideaGenerator", descKey: "feat_ideaGeneratorDesc", isFree: true },
          { icon: "🔄", key: "feat_copyrightTransformerFeat", descKey: "feat_copyrightTransformerFeatDesc", isFree: true },
          { icon: "🎨", key: "feat_4kExport", descKey: "feat_4kExportDesc", isFree: false },
          { icon: "🧬", key: "feat_voiceCloning", descKey: "feat_voiceCloningDesc", isFree: false },
          { icon: "🚀", key: "feat_priorityRendering", descKey: "feat_priorityRenderingDesc", isFree: false },
          { icon: "♾️", key: "feat_unlimitedRenders", descKey: "feat_unlimitedRendersDesc", isFree: false },
          { icon: "🌐", key: "feat_multiLanguage", descKey: "feat_multiLanguageDesc", isFree: false },
          { icon: "📱", key: "feat_apiAccess", descKey: "feat_apiAccessDesc", isFree: false },
        ].map((f, i) => (
          <div key={i} className="feature-card">
            <span className={`pro-label ${f.isFree ? "free" : "unlocked"}`}>{f.isFree ? t.free : t.unlocked}</span>
            <div className="feature-icon">{f.icon}</div>
            <h3>{t[f.key]}</h3>
            <p>{t[f.descKey]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;

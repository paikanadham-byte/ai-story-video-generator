import { useI18n } from "../utils/i18n.js";
import I from "./Icons.jsx";

function ProFeatures() {
  const t = useI18n();
  const features = [
    { icon: "sparkles", nameKey: "feat_aiVideoGeneration", descKey: "feat_aiVideoGenerationDesc", free: true },
    { icon: "mic", nameKey: "feat_10aiVoices", descKey: "feat_10aiVoicesDesc", free: true },
    { icon: "type", nameKey: "feat_autoSubtitles", descKey: "feat_autoSubtitlesDesc", free: true },
    { icon: "lightbulb", nameKey: "feat_ideaGenerator", descKey: "feat_ideaGeneratorDesc", free: true },
    { icon: "film", nameKey: "feat_videoEditorPro", descKey: "feat_videoEditorProDesc", free: true },
    { icon: "shield", nameKey: "feat_copyrightPro", descKey: "feat_copyrightProDesc", free: true },
    { icon: "monitor", nameKey: "feat_multiPlatformResize", descKey: "feat_multiPlatformResizeDesc", free: true },
    { icon: "music", nameKey: "feat_backgroundMusicPro", descKey: "feat_backgroundMusicProDesc", free: true },
    { icon: "barChart", nameKey: "feat_hdExport", descKey: "feat_hdExportDesc", free: true },
    { icon: "palette", nameKey: "feat_4kUltraHd", descKey: "feat_4kUltraHdDesc", free: false },
    { icon: "dna", nameKey: "feat_voiceCloning", descKey: "feat_voiceCloningDesc", free: false },
    { icon: "rocket", nameKey: "feat_priorityRendering", descKey: "feat_priorityRenderingDesc", free: false },
    { icon: "infinity", nameKey: "feat_unlimitedRenders", descKey: "feat_unlimitedRendersDesc", free: false },
    { icon: "globe", nameKey: "feat_multiLanguage", descKey: "feat_multiLanguageDesc", free: false },
    { icon: "cpu", nameKey: "feat_aiThumbnailPro", descKey: "feat_aiThumbnailProDesc", free: false },
    { icon: "smartphone", nameKey: "feat_apiAccess", descKey: "feat_apiAccessDesc", free: false },
    { icon: "link", nameKey: "feat_directUploadPro", descKey: "feat_directUploadProDesc", free: false },
    { icon: "barChart", nameKey: "feat_seoTitlePro", descKey: "feat_seoTitleProDesc", free: false },
  ];

  const freeFeatures = features.filter(f => f.free);
  const proFeatures = features.filter(f => !f.free);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t.proFeaturesTitle}</h2>
        <p>{t.proFeaturesDesc}</p>
      </div>

      <div className="card glow" style={{ textAlign: "center", marginBottom: 28 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
          {t.proUnlockedBanner}
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 500, margin: "0 auto" }}>
          {t.proUnlockedBannerDesc}
        </p>
      </div>

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16 }}><I name="check" size={16} /> {t.freeFeatures} ({freeFeatures.length})</h2>
      </div>

      <div className="features-grid" style={{ marginBottom: 32 }}>
        {freeFeatures.map((f, i) => (
          <div key={i} className="feature-card">
            <span className="pro-label free">{t.free}</span>
            <div className="feature-icon"><I name={f.icon} size={28} /></div>
            <h3>{t[f.nameKey]}</h3>
            <p>{t[f.descKey]}</p>
          </div>
        ))}
      </div>

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16 }}><I name="gem" size={16} /> {t.proFeaturesUnlocked} ({proFeatures.length})</h2>
      </div>

      <div className="features-grid">
        {proFeatures.map((f, i) => (
          <div key={i} className="feature-card">
            <span className="pro-label unlocked">{t.unlocked}</span>
            <div className="feature-icon"><I name={f.icon} size={28} /></div>
            <h3>{t[f.nameKey]}</h3>
            <p>{t[f.descKey]}</p>
          </div>
        ))}
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}

export default ProFeatures;

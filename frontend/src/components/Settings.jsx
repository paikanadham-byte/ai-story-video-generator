import { useState } from "react";
import { supabase } from "../utils/supabase.js";
import { useI18n } from "../utils/i18n.js";

const APP_LANGUAGES = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "fa", name: "فارسی", dir: "rtl" },
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "tr", name: "Türkçe", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
  { code: "fr", name: "Français", dir: "ltr" },
  { code: "de", name: "Deutsch", dir: "ltr" },
  { code: "hi", name: "हिन्दी", dir: "ltr" },
  { code: "pt", name: "Português", dir: "ltr" },
  { code: "ja", name: "日本語", dir: "ltr" },
  { code: "ko", name: "한국어", dir: "ltr" },
  { code: "zh", name: "中文", dir: "ltr" },
  { code: "ru", name: "Русский", dir: "ltr" },
];

function Settings({ user, onSignOut, appLang, onChangeLang }) {
  const t = useI18n();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  const avatar = user?.user_metadata?.avatar_url;
  const provider = user?.app_metadata?.provider || "email";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t.settingsPage}</h2>
        <p>{t.settingsDesc}</p>
      </div>

      {/* Profile */}
      <div className="card">
        <div className="card-title"><span>👤</span> {t.profile}</div>
        <div className="settings-profile">
          <div className="settings-avatar">
            {avatar ? (
              <img src={avatar} alt={displayName} referrerPolicy="no-referrer" />
            ) : (
              <span>{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="settings-profile-info">
            <h3>{displayName}</h3>
            <p>{email}</p>
            <span className="settings-provider-badge">
              {provider === "google" ? "🔗 Google" : provider === "github" ? "🔗 GitHub" : "📧 Email"}
            </span>
          </div>
        </div>
      </div>

      {/* App Language */}
      <div className="card">
        <div className="card-title"><span>🌐</span> {t.appLanguage}</div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
          {t.appLanguageDesc}
        </p>
        <div className="settings-lang-grid">
          {APP_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`settings-lang-btn ${appLang === lang.code ? "active" : ""}`}
              onClick={() => onChangeLang(lang.code)}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="card">
        <div className="card-title"><span>🎨</span> {t.theme}</div>
        <div className="option-grid">
          <button className="option-button active">{t.dark}</button>
          <button className="option-button" disabled style={{ opacity: 0.4 }}>{t.lightComingSoon}</button>
        </div>
      </div>

      {/* Logout */}
      <div className="card">
        <div className="card-title"><span>🚪</span> {t.account}</div>
        {!confirmLogout ? (
          <button className="btn settings-logout-btn" onClick={() => setConfirmLogout(true)}>
            {t.signOut}
          </button>
        ) : (
          <div className="settings-confirm-logout">
            <p>{t.confirmLogout}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmLogout(false)}>{t.cancel}</button>
              <button className="btn settings-logout-btn-confirm" onClick={handleLogout}>{t.yesSignOut}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;

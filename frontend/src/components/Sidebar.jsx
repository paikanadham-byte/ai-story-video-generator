import { useI18n } from "../utils/i18n.js";
import Logo from "./Logo.jsx";

function Sidebar({ activePage, onNavigate, user, onSignOut, mobileOpen, onCloseMobile }) {
  const t = useI18n();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  const avatar = user?.user_metadata?.avatar_url;

  const nav = (page) => {
    onNavigate(page);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onCloseMobile} />}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-inner">
          <div className="brand-icon"><Logo size={34} /></div>
          <div className="brand-text">
            <h1>PM Studio</h1>
            <p>AI Video Generator</p>
          </div>
        </div>
        <button className="sidebar-close-btn" onClick={onCloseMobile}>✕</button>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">
          {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : displayName.charAt(0).toUpperCase()}
        </div>
        <div className="user-info">
          <span className="user-name">{displayName}</span>
          <span className="user-email">{email}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">{t.main}</div>

        <button className={`nav-item ${activePage === "dashboard" ? "active" : ""}`} onClick={() => nav("dashboard")}>
          <span className="nav-icon">🏠</span> {t.dashboard}
        </button>

        <button className={`nav-item ${activePage === "create" ? "active" : ""}`} onClick={() => nav("create")}>
          <span className="nav-icon">✨</span> {t.createVideo}
        </button>

        <div className="nav-section-label">{t.tools}</div>

        <button className={`nav-item ${activePage === "editor" ? "active" : ""}`} onClick={() => nav("editor")}>
          <span className="nav-icon">🎞️</span> {t.videoEditor}
          <span className="nav-badge">{t.new}</span>
        </button>

        <button className={`nav-item ${activePage === "copyright" ? "active" : ""}`} onClick={() => nav("copyright")}>
          <span className="nav-icon">🛡️</span> {t.copyrightFix}
          <span className="nav-badge">{t.hot}</span>
        </button>

        <div className="nav-section-label">{t.proFeatures}</div>

        <button className={`nav-item ${activePage === "voice-clone" ? "active" : ""}`} onClick={() => nav("voice-clone")}>
          <span className="nav-icon">🧬</span> {t.voiceCloning}
          <span className="nav-badge pro">{t.pro}</span>
        </button>

        <button className={`nav-item ${activePage === "api" ? "active" : ""}`} onClick={() => nav("api")}>
          <span className="nav-icon">📱</span> {t.apiAccess}
          <span className="nav-badge pro">{t.pro}</span>
        </button>

        <button className={`nav-item ${activePage === "pro" ? "active" : ""}`} onClick={() => nav("pro")}>
          <span className="nav-icon">💎</span> {t.allFeatures}
        </button>

        <div className="nav-section-label">{t.more}</div>

        <button className={`nav-item ${activePage === "feedback" ? "active" : ""}`} onClick={() => nav("feedback")}>
          <span className="nav-icon">💬</span> {t.feedback}
        </button>

        <button className={`nav-item ${activePage === "settings" ? "active" : ""}`} onClick={() => nav("settings")}>
          <span className="nav-icon">⚙️</span> {t.settings}
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="pro-banner unlocked">
          <h4>{t.proUnlocked}</h4>
          <p>{t.allPremiumActive}</p>
          <div className="pro-badge-row">
            <span className="pro-active-badge">✅ {t.active}</span>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}

export default Sidebar;

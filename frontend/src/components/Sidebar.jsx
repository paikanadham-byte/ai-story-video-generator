function Sidebar({ activePage, onNavigate, user, onSignOut, mobileOpen, onCloseMobile }) {
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
          <div className="brand-icon">🎬</div>
          <div className="brand-text">
            <h1>StoryForge AI</h1>
            <p>Video Generator Studio</p>
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
        <div className="nav-section-label">Main</div>

        <button className={`nav-item ${activePage === "dashboard" ? "active" : ""}`} onClick={() => nav("dashboard")}>
          <span className="nav-icon">🏠</span> Dashboard
        </button>

        <button className={`nav-item ${activePage === "create" ? "active" : ""}`} onClick={() => nav("create")}>
          <span className="nav-icon">✨</span> Create Video
        </button>

        <div className="nav-section-label">Tools</div>

        <button className={`nav-item ${activePage === "editor" ? "active" : ""}`} onClick={() => nav("editor")}>
          <span className="nav-icon">🎞️</span> Video Editor
          <span className="nav-badge">NEW</span>
        </button>

        <button className={`nav-item ${activePage === "copyright" ? "active" : ""}`} onClick={() => nav("copyright")}>
          <span className="nav-icon">🛡️</span> Copyright Fix
          <span className="nav-badge">HOT</span>
        </button>

        <div className="nav-section-label">Pro Features</div>

        <button className={`nav-item ${activePage === "voice-clone" ? "active" : ""}`} onClick={() => nav("voice-clone")}>
          <span className="nav-icon">🧬</span> Voice Cloning
          <span className="nav-badge pro">PRO</span>
        </button>

        <button className={`nav-item ${activePage === "api" ? "active" : ""}`} onClick={() => nav("api")}>
          <span className="nav-icon">📱</span> API Access
          <span className="nav-badge pro">PRO</span>
        </button>

        <button className={`nav-item ${activePage === "pro" ? "active" : ""}`} onClick={() => nav("pro")}>
          <span className="nav-icon">💎</span> All Features
        </button>

        <div className="nav-section-label">More</div>

        <button className={`nav-item ${activePage === "feedback" ? "active" : ""}`} onClick={() => nav("feedback")}>
          <span className="nav-icon">💬</span> Feedback
        </button>

        <button className={`nav-item ${activePage === "settings" ? "active" : ""}`} onClick={() => nav("settings")}>
          <span className="nav-icon">⚙️</span> Settings
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="pro-banner unlocked">
          <h4>💎 Pro Unlocked</h4>
          <p>All premium features active</p>
          <div className="pro-badge-row">
            <span className="pro-active-badge">✅ Active</span>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}

export default Sidebar;

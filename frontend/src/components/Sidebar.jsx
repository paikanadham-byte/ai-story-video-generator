function Sidebar({ activePage, onNavigate, user, onSignOut }) {
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-inner">
          <div className="brand-icon">🎬</div>
          <div className="brand-text">
            <h1>StoryForge AI</h1>
            <p>Video Generator Studio</p>
          </div>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{displayName.charAt(0).toUpperCase()}</div>
        <div className="user-info">
          <span className="user-name">{displayName}</span>
          <span className="user-email">{email}</span>
        </div>
        <button className="user-signout" onClick={onSignOut} title="Sign Out">⏻</button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main</div>

        <button className={`nav-item ${activePage === "dashboard" ? "active" : ""}`} onClick={() => onNavigate("dashboard")}>
          <span className="nav-icon">🏠</span> Dashboard
        </button>

        <button className={`nav-item ${activePage === "create" ? "active" : ""}`} onClick={() => onNavigate("create")}>
          <span className="nav-icon">✨</span> Create Video
        </button>

        <div className="nav-section-label">Tools</div>

        <button className={`nav-item ${activePage === "editor" ? "active" : ""}`} onClick={() => onNavigate("editor")}>
          <span className="nav-icon">🎞️</span> Video Editor
          <span className="nav-badge">NEW</span>
        </button>

        <button className={`nav-item ${activePage === "copyright" ? "active" : ""}`} onClick={() => onNavigate("copyright")}>
          <span className="nav-icon">🛡️</span> Copyright Fix
          <span className="nav-badge">HOT</span>
        </button>

        <div className="nav-section-label">Pro Features</div>

        <button className={`nav-item ${activePage === "voice-clone" ? "active" : ""}`} onClick={() => onNavigate("voice-clone")}>
          <span className="nav-icon">🧬</span> Voice Cloning
          <span className="nav-badge pro">PRO</span>
        </button>

        <button className={`nav-item ${activePage === "api" ? "active" : ""}`} onClick={() => onNavigate("api")}>
          <span className="nav-icon">📱</span> API Access
          <span className="nav-badge pro">PRO</span>
        </button>

        <button className={`nav-item ${activePage === "pro" ? "active" : ""}`} onClick={() => onNavigate("pro")}>
          <span className="nav-icon">💎</span> All Features
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="pro-banner unlocked">
          <h4>💎 Pro Unlocked</h4>
          <p>All 9 premium features are active on your account</p>
          <div className="pro-badge-row">
            <span className="pro-active-badge">✅ Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

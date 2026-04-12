function Dashboard({ onNavigate }) {
  return (
    <div className="page-container wide">
      <div className="page-header">
        <h2>Welcome to StoryForge AI</h2>
        <p>Create stunning cinematic videos from text with the power of AI</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">🎬</div>
          <div className="stat-value">∞</div>
          <div className="stat-label">Unlimited Renders</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">🎙️</div>
          <div className="stat-value">10+</div>
          <div className="stat-label">AI Voices + Cloning</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink">🌐</div>
          <div className="stat-value">20</div>
          <div className="stat-label">Languages</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">💎</div>
          <div className="stat-value">PRO</div>
          <div className="stat-label">All Features Unlocked</div>
        </div>
      </div>

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>Quick Actions</h2>
      </div>

      <div className="quick-actions">
        <button className="quick-action" onClick={() => onNavigate("create")}>
          <div className="quick-action-icon">✨</div>
          <h3>Create AI Video</h3>
          <p>Turn any story idea into a full cinematic video with AI voiceover and stock footage</p>
        </button>

        <button className="quick-action" onClick={() => onNavigate("editor")}>
          <div className="quick-action-icon">🎞️</div>
          <h3>Video Editor</h3>
          <p>Upload or paste a video link to add subtitles, change voice, resize for social platforms</p>
        </button>

        <button className="quick-action" onClick={() => onNavigate("copyright")}>
          <div className="quick-action-icon">🛡️</div>
          <h3>Copyright Transformer</h3>
          <p>Make any video copyright-safe by re-voicing, flipping, adding effects & new music</p>
        </button>
      </div>

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>Pro Quick Actions</h2>
      </div>

      <div className="quick-actions">
        <button className="quick-action" onClick={() => onNavigate("voice-clone")}>
          <div className="quick-action-icon">🧬</div>
          <h3>Voice Cloning</h3>
          <p>Clone your own voice from a 30-second sample and use it as narrator</p>
        </button>

        <button className="quick-action" onClick={() => onNavigate("api")}>
          <div className="quick-action-icon">📱</div>
          <h3>API Access</h3>
          <p>Full REST API to integrate video generation into your own apps</p>
        </button>

        <button className="quick-action" onClick={() => onNavigate("pro")}>
          <div className="quick-action-icon">💎</div>
          <h3>All 18 Features</h3>
          <p>View all free and pro features — everything is unlocked for you</p>
        </button>
      </div>

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>All Features</h2>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <span className="pro-label free">FREE</span>
          <div className="feature-icon">📝</div>
          <h3>AI Script Writer</h3>
          <p>Generate structured cinematic scripts from any text prompt with scene-by-scene breakdowns</p>
        </div>
        <div className="feature-card">
          <span className="pro-label free">FREE</span>
          <div className="feature-icon">🎙️</div>
          <h3>10 AI Voices</h3>
          <p>Male, female, narrator and storyteller voices powered by edge AI text-to-speech</p>
        </div>
        <div className="feature-card">
          <span className="pro-label free">FREE</span>
          <div className="feature-icon">📷</div>
          <h3>Stock Media Fetcher</h3>
          <p>Auto-fetches matching video clips and images from Pexels, Pixabay, and Unsplash</p>
        </div>
        <div className="feature-card">
          <span className="pro-label free">FREE</span>
          <div className="feature-icon">💬</div>
          <h3>Auto Subtitles</h3>
          <p>Subtitles are automatically burned into video and exported as SRT file</p>
        </div>
        <div className="feature-card">
          <span className="pro-label free">FREE</span>
          <div className="feature-icon">💡</div>
          <h3>AI Idea Generator</h3>
          <p>Get viral story ideas tailored to your genre and duration — fresh every time</p>
        </div>
        <div className="feature-card">
          <span className="pro-label free">FREE</span>
          <div className="feature-icon">🔄</div>
          <h3>Copyright Transformer</h3>
          <p>Transform existing videos to be copyright-safe for re-uploading on any platform</p>
        </div>
        <div className="feature-card">
          <span className="pro-label unlocked">UNLOCKED</span>
          <div className="feature-icon">🎨</div>
          <h3>4K Export</h3>
          <p>Export in 4K ultra-high definition for maximum quality on large screens</p>
        </div>
        <div className="feature-card">
          <span className="pro-label unlocked">UNLOCKED</span>
          <div className="feature-icon">🧬</div>
          <h3>AI Voice Cloning</h3>
          <p>Clone your own voice and use it for narration in all your generated videos</p>
        </div>
        <div className="feature-card">
          <span className="pro-label unlocked">UNLOCKED</span>
          <div className="feature-icon">🚀</div>
          <h3>Priority Rendering</h3>
          <p>Skip the queue with dedicated GPU servers for 5x faster rendering</p>
        </div>
        <div className="feature-card">
          <span className="pro-label unlocked">UNLOCKED</span>
          <div className="feature-icon">♾️</div>
          <h3>Unlimited Renders</h3>
          <p>No daily limits — generate as many videos as you want per day</p>
        </div>
        <div className="feature-card">
          <span className="pro-label unlocked">UNLOCKED</span>
          <div className="feature-icon">🌐</div>
          <h3>Multi-Language</h3>
          <p>Generate scripts and voiceovers in 20+ languages</p>
        </div>
        <div className="feature-card">
          <span className="pro-label unlocked">UNLOCKED</span>
          <div className="feature-icon">📱</div>
          <h3>API Access</h3>
          <p>Full REST API to integrate video generation into your own apps</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

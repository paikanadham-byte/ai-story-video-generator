function ProFeatures() {
  const features = [
    { icon: "✨", name: "AI Video Generation", desc: "Create full cinematic videos from text prompts with AI scripting, stock footage, and voiceover", free: true },
    { icon: "🎙️", name: "10 AI Voices", desc: "Access all 10 AI narrator voices including deep, warm, bright, and storyteller styles", free: true },
    { icon: "💬", name: "Auto Subtitles", desc: "Subtitles burned into video + downloadable SRT file", free: true },
    { icon: "💡", name: "AI Idea Generator", desc: "Get unlimited AI-generated viral story ideas for any genre and duration", free: true },
    { icon: "🎞️", name: "Video Editor", desc: "Upload videos to add subtitles, change voice, resize, trim, add music and effects", free: true },
    { icon: "🛡️", name: "Copyright Transformer", desc: "Make videos copyright-safe with mirror, re-voice, color grade, and music replacement", free: true },
    { icon: "📐", name: "Multi-Platform Resize", desc: "One-click resize for YouTube, TikTok, Instagram Reels, Shorts, and square formats", free: true },
    { icon: "🎵", name: "Background Music", desc: "Add mood-based background music to your generated videos", free: true },
    { icon: "📊", name: "HD Export (1080p)", desc: "Export videos in full 1080p HD resolution", free: true },
    { icon: "🎨", name: "4K Ultra HD Export", desc: "Export in 4K resolution for maximum quality on large screens and TVs", free: false },
    { icon: "🧬", name: "AI Voice Cloning", desc: "Clone your own voice from a 30-second sample and use it in all videos", free: false },
    { icon: "🚀", name: "Priority Rendering", desc: "Skip the queue with dedicated GPU servers for 5x faster rendering", free: false },
    { icon: "♾️", name: "Unlimited Renders", desc: "No daily limits — generate as many videos as you want per day", free: false },
    { icon: "🌐", name: "Multi-Language", desc: "Generate scripts and voiceovers in 20+ languages including Spanish, French, Hindi, Arabic", free: false },
    { icon: "🤖", name: "AI Thumbnail Generator", desc: "Auto-generate click-worthy YouTube thumbnails from your video content", free: false },
    { icon: "📱", name: "API Access", desc: "Full REST API to integrate video generation into your own apps and workflows", free: false },
    { icon: "🔗", name: "Direct Upload", desc: "Upload generated videos directly to YouTube, TikTok, and Instagram from dashboard", free: false },
    { icon: "📈", name: "SEO Title & Description", desc: "AI generates optimized titles, descriptions, and tags for maximum reach", free: false },
  ];

  const freeFeatures = features.filter(f => f.free);
  const proFeatures = features.filter(f => !f.free);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>All Features 💎</h2>
        <p>Everything included in your Pro plan — all 18 features active</p>
      </div>

      <div className="card glow" style={{ textAlign: "center", marginBottom: 28 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
          💎 Pro Unlocked — All Features Active!
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 500, margin: "0 auto" }}>
          You have full access to every feature including 4K export, voice cloning,
          unlimited renders, multi-language, API access, and more.
        </p>
      </div>

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16 }}>✅ Free Features ({freeFeatures.length})</h2>
      </div>

      <div className="features-grid" style={{ marginBottom: 32 }}>
        {freeFeatures.map((f, i) => (
          <div key={i} className="feature-card">
            <span className="pro-label free">FREE</span>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.name}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16 }}>💎 Pro Features — Unlocked ({proFeatures.length})</h2>
      </div>

      <div className="features-grid">
        {proFeatures.map((f, i) => (
          <div key={i} className="feature-card">
            <span className="pro-label unlocked">UNLOCKED</span>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.name}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}

export default ProFeatures;

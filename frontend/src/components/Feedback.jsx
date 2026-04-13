import { useState } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

function Feedback() {
  const [type, setType] = useState("feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim(), email: email.trim() }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setSent(true);
      setMessage("");
    } catch {
      setError("Failed to send feedback. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Feedback 💬</h2>
        <p>Help us improve — report bugs, request features, or just say hi!</p>
      </div>

      {sent ? (
        <div className="card glow" style={{ textAlign: "center", padding: 44 }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>✅</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Thank You!</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
            Your feedback has been received. We appreciate your input!
          </p>
          <button className="btn btn-primary" onClick={() => setSent(false)}>Send Another</button>
        </div>
      ) : (
        <>
          {error && (
            <div className="error-banner">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <div className="card">
            <div className="card-title"><span>📝</span> Type</div>
            <div className="option-grid">
              {[
                { id: "feedback", label: "💡 General Feedback" },
                { id: "bug", label: "🐛 Bug Report" },
                { id: "feature", label: "✨ Feature Request" },
                { id: "question", label: "❓ Question" },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`option-button ${type === t.id ? "active" : ""}`}
                  onClick={() => setType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span>✍️</span> Your Message</div>
            <div className="form-group">
              <textarea
                className="textarea-input"
                placeholder="Tell us what you think, describe a bug, or suggest a feature..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={3000}
              />
              <div className="char-count">{message.length} / 3000</div>
            </div>

            <div className="form-group">
              <label className="form-label">Email (optional)</label>
              <input
                className="text-input"
                type="email"
                placeholder="your@email.com — so we can respond"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button
            className="generate-btn"
            onClick={handleSend}
            disabled={sending || !message.trim()}
          >
            {sending ? "Sending..." : "📨 Send Feedback"}
          </button>
        </>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}

export default Feedback;

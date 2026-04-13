import { useState } from "react";
import { useI18n } from "../utils/i18n.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

function Feedback() {
  const t = useI18n();
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
        <h2>{t.feedbackTitle}</h2>
        <p>{t.feedbackDesc}</p>
      </div>

      {sent ? (
        <div className="card glow" style={{ textAlign: "center", padding: 44 }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>✅</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t.thankYou}</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
            {t.feedbackReceived}
          </p>
          <button className="btn btn-primary" onClick={() => setSent(false)}>{t.sendAnother}</button>
        </div>
      ) : (
        <>
          {error && (
            <div className="error-banner">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <div className="card">
            <div className="card-title"><span>📝</span> {t.type}</div>
            <div className="option-grid">
              {[
                { id: "feedback", label: t.generalFeedback },
                { id: "bug", label: t.bugReport },
                { id: "feature", label: t.featureRequest },
                { id: "question", label: t.question },
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
            <div className="card-title"><span>✍️</span> {t.yourMessage}</div>
            <div className="form-group">
              <textarea
                className="textarea-input"
                placeholder={t.messagePlaceholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={3000}
              />
              <div className="char-count">{message.length} / 3000</div>
            </div>

            <div className="form-group">
              <label className="form-label">{t.emailOptional}</label>
              <input
                className="text-input"
                type="email"
                placeholder={t.emailPlaceholder}
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
            {sending ? t.sending : t.sendFeedback}
          </button>
        </>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}

export default Feedback;

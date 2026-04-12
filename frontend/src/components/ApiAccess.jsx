import { useState, useEffect } from "react";
import { getApiKeyInfo } from "../api/client.js";

function ApiAccess() {
  const [apiInfo, setApiInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    getApiKeyInfo()
      .then(setApiInfo)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div className="spinner" />
          <p style={{ color: "var(--text-secondary)" }}>Loading API info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>API Access 📱</h2>
        <p>Use the REST API to integrate video generation into your own apps</p>
      </div>

      <div className="card glow">
        <div className="card-title">
          <span>🔑</span> Your API Key
        </div>
        <div className="api-key-box">
          <code className="api-key-value">
            {showKey ? apiInfo?.apiKey : "sfai_local_••••••••••••"}
          </code>
          <div className="api-key-actions">
            <button className="btn btn-secondary" onClick={() => setShowKey(!showKey)}>
              {showKey ? "🙈 Hide" : "👁️ Show"}
            </button>
            <button className="btn btn-primary" onClick={() => handleCopy(apiInfo?.apiKey, "key")}>
              {copied === "key" ? "✅ Copied!" : "📋 Copy"}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>🌐</span> Base URL
        </div>
        <div className="api-key-box">
          <code className="api-key-value">{apiInfo?.baseUrl}</code>
          <button className="btn btn-secondary" onClick={() => handleCopy(apiInfo?.baseUrl, "url")}>
            {copied === "url" ? "✅ Copied!" : "📋 Copy"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>📚</span> API Endpoints
        </div>
        <div className="api-endpoints">
          {(apiInfo?.endpoints || []).map((ep, i) => (
            <div key={i} className="api-endpoint-row">
              <span className={`api-method ${ep.method.toLowerCase()}`}>{ep.method}</span>
              <code className="api-path">{ep.path}</code>
              <span className="api-desc">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>💻</span> Quick Start Example
        </div>
        <div className="code-block">
          <div className="code-header">
            <span>JavaScript / Node.js</span>
            <button className="copy-btn" onClick={() => handleCopy(`const res = await fetch("${apiInfo?.baseUrl}/generate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${apiInfo?.apiKey}"
  },
  body: JSON.stringify({
    storyIdea: "A robot discovers emotions for the first time",
    genre: "cinematic",
    voiceStyle: "storyteller",
    targetDuration: 2,
    resolution: "1080p"
  })
});

const { jobId } = await res.json();
console.log("Generation started:", jobId);`, "code")}>
              {copied === "code" ? "✅" : "📋"}
            </button>
          </div>
          <pre className="code-content">{`const res = await fetch("${apiInfo?.baseUrl}/generate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${apiInfo?.apiKey}"
  },
  body: JSON.stringify({
    storyIdea: "A robot discovers emotions for the first time",
    genre: "cinematic",
    voiceStyle: "storyteller",
    targetDuration: 2,
    resolution: "1080p"
  })
});

const { jobId } = await res.json();
console.log("Generation started:", jobId);`}</pre>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>📊</span> Usage
        </div>
        <div className="stats-grid" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-icon purple">♾️</div>
            <div className="stat-value">∞</div>
            <div className="stat-label">Requests / Day</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon cyan">⚡</div>
            <div className="stat-value">∞</div>
            <div className="stat-label">Rate Limit</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pink">🎬</div>
            <div className="stat-value">∞</div>
            <div className="stat-label">Video Renders</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">📱</div>
            <div className="stat-value">11</div>
            <div className="stat-label">Endpoints</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiAccess;

import { useState, useEffect } from "react";
import { getApiKeyInfo } from "../api/client.js";
import { useI18n } from "../utils/i18n.js";
import I from "./Icons.jsx";

function ApiAccess() {
  const t = useI18n();
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
          <p style={{ color: "var(--text-secondary)" }}>{t.loadingApiInfo}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t.apiPageTitle}</h2>
        <p>{t.apiPageDesc}</p>
      </div>

      <div className="card glow">
        <div className="card-title">
          <I name="key" size={18} /> {t.yourApiKey}
        </div>
        <div className="api-key-box">
          <code className="api-key-value">
            {showKey ? apiInfo?.apiKey : "sfai_local_••••••••••••"}
          </code>
          <div className="api-key-actions">
            <button className="btn btn-secondary" onClick={() => setShowKey(!showKey)}>
              {showKey ? t.hide : t.show}
            </button>
            <button className="btn btn-primary" onClick={() => handleCopy(apiInfo?.apiKey, "key")}>
              {copied === "key" ? t.copied : t.copy}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <I name="globe" size={18} /> {t.baseUrl}
        </div>
        <div className="api-key-box">
          <code className="api-key-value">{apiInfo?.baseUrl}</code>
          <button className="btn btn-secondary" onClick={() => handleCopy(apiInfo?.baseUrl, "url")}>
            {copied === "url" ? t.copied : t.copy}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <I name="bookOpen" size={18} /> {t.apiEndpoints}
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
          <I name="code" size={18} /> {t.quickStartExample}
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
              {copied === "code" ? <I name="check" size={14} /> : <I name="copy" size={14} />}
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
          <I name="barChart" size={18} /> {t.usage}
        </div>
        <div className="stats-grid" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-icon purple"><I name="infinity" size={20} /></div>
            <div className="stat-value">∞</div>
            <div className="stat-label">{t.requestsPerDay}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon cyan"><I name="zap" size={20} /></div>
            <div className="stat-value">∞</div>
            <div className="stat-label">{t.rateLimit}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pink"><I name="clapperboard" size={20} /></div>
            <div className="stat-value">∞</div>
            <div className="stat-label">{t.videoRenders}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><I name="smartphone" size={20} /></div>
            <div className="stat-value">11</div>
            <div className="stat-label">{t.endpoints}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiAccess;

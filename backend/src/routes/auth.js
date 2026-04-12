import { Router } from "express";
import { getSupabase } from "../utils/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/signup — email + password signup
router.post("/signup", async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: "Auth service not configured" });

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || "" } },
  });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data.user, session: data.session });
});

// POST /api/auth/login — email + password login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: "Auth service not configured" });

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
  res.json({ user: data.user, session: data.session });
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json({ ok: true });

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    // Server-side sign out isn't strictly needed for JWTs,
    // but we call it in case Supabase needs to revoke the session
    await sb.auth.signOut().catch(() => {});
  }
  res.json({ ok: true });
});

// GET /api/auth/me — get current user from token
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// GET /oauth/consent — handles the OAuth callback redirect
// Supabase redirects here after OAuth sign-in with tokens in the URL hash.
// This serves a small HTML page that extracts the tokens and sends them
// to the frontend app.
router.get("/oauth/consent", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Completing Sign In...</title>
  <style>
    body { background: #06060b; color: #f1f1f8; font-family: Inter, sans-serif;
           display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(139,92,246,0.2);
               border-top-color: #8b5cf6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 18px; margin-bottom: 6px; }
    p { color: #8b8ba3; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Completing Sign In</h2>
    <p>Redirecting you back to StoryForge AI...</p>
  </div>
  <script>
    // Supabase puts tokens in the URL hash fragment after OAuth redirect
    // e.g. #access_token=...&refresh_token=...&type=recovery etc.
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    
    if (accessToken) {
      // Store tokens so the main app can pick them up
      localStorage.setItem("sb-auth-token", JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        provider_token: params.get("provider_token") || null,
        token_type: params.get("token_type") || "bearer",
      }));
    }
    // Redirect to main app
    window.location.replace("/");
  </script>
</body>
</html>`);
});

export default router;

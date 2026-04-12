import { getSupabase } from "../utils/supabase.js";

/**
 * Express middleware: verify Supabase JWT from Authorization header.
 * Attaches req.user on success.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.slice(7);
  const sb = getSupabase();
  if (!sb) {
    // Supabase not configured — skip auth in dev
    return next();
  }

  try {
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = data.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Authentication failed" });
  }
}

/**
 * Optional auth — attaches req.user if token present, but doesn't block.
 */
export async function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);
  const sb = getSupabase();
  if (!sb) return next();

  try {
    const { data } = await sb.auth.getUser(token);
    if (data?.user) req.user = data.user;
  } catch {
    // Ignore — optional
  }
  next();
}

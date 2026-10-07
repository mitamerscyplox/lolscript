/**
 * Cloudflare Turnstile bot check for the sign-in, sign-up and password-reset forms.
 * Active only when both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are set.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileSiteKey() {
  return process.env.TURNSTILE_SITE_KEY?.trim() && process.env.TURNSTILE_SECRET_KEY?.trim()
    ? process.env.TURNSTILE_SITE_KEY.trim()
    : "";
}

/** A token is single-use and bound to the widget's action, so one solved form can't be replayed on another. */
export async function verifyTurnstile(token, ip, action) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!turnstileSiteKey()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(8000) });
    const data = await res.json().catch(() => ({}));
    if (data.success !== true) return false;
    return !action || !data.action || data.action === action;
  } catch (error) {
    console.error("[turnstile] verify failed", error?.message || error);
    return false;
  }
}

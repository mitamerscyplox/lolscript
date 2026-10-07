/**
 * Google / Discord sign-in (OAuth 2 authorization code + PKCE). Each provider is enabled only when its
 * client id and secret are set; the redirect URI is {origin}/api/auth/oauth/{provider}/callback.
 */

import { createHash, randomBytes } from "node:crypto";

const env = (name) => () => process.env[name]?.trim() || "";

async function getJson(url, accessToken) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  return res.ok ? res.json().catch(() => null) : null;
}

const PROVIDERS = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
    extraParams: { prompt: "select_account" },
    profile: async (token) => {
      const data = await getJson("https://openidconnect.googleapis.com/v1/userinfo", token);
      if (!data?.sub) return null;
      return {
        subject: String(data.sub),
        email: String(data.email || ""),
        emailVerified: data.email_verified === true || data.email_verified === "true",
        name: String(data.name || data.given_name || ""),
      };
    },
  },
  discord: {
    authorizeUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scope: "identify email",
    clientId: env("DISCORD_OAUTH_CLIENT_ID"),
    clientSecret: env("DISCORD_OAUTH_CLIENT_SECRET"),
    extraParams: { prompt: "none" },
    profile: async (token) => {
      const data = await getJson("https://discord.com/api/users/@me", token);
      if (!data?.id) return null;
      return {
        subject: String(data.id),
        email: String(data.email || ""),
        emailVerified: data.verified === true,
        name: String(data.global_name || data.username || ""),
      };
    },
  },
};

export function isOAuthProvider(value) {
  return value === "google" || value === "discord";
}

export function oauthEnabled(provider) {
  const p = PROVIDERS[provider];
  return Boolean(p && p.clientId() && p.clientSecret());
}

export function enabledOAuthProviders() {
  return Object.keys(PROVIDERS).filter(oauthEnabled);
}

export const redirectUri = (origin, provider) => `${origin.replace(/\/+$/, "")}/api/auth/oauth/${provider}/callback`;

export function createPkce() {
  const verifier = randomBytes(48).toString("base64url");
  return {
    state: randomBytes(24).toString("base64url"),
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}

export function authorizeUrl(provider, origin, state, challenge) {
  const p = PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: p.clientId(),
    redirect_uri: redirectUri(origin, provider),
    response_type: "code",
    scope: p.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    ...p.extraParams,
  });
  return `${p.authorizeUrl}?${params}`;
}

export async function exchangeCode(provider, origin, code, verifier) {
  const p = PROVIDERS[provider];
  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(origin, provider),
      client_id: p.clientId(),
      client_secret: p.clientSecret(),
      code_verifier: verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) {
    console.warn(`[oauth] ${provider} token exchange failed`, res.status, data?.error || "");
    return null;
  }
  return p.profile(data.access_token);
}

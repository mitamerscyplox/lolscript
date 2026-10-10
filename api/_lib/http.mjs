import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { kvIncr } from "./kv-store.mjs";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function readBody(req) {
  if (req.body != null) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const BOT_CLIENT_MAX_SKEW_MS = 60_000;

/**
 * Checkouts the Discord bot opens for a member all come from the bot's one IP. The bot signs the member's
 * Discord ID with the shared Binance API secret (hex HMAC-SHA256 of `${ts}.client.${id}`), so rate limits
 * and failed-attempt blocks apply to that member instead of to every bot customer at once.
 */
function botClientId(req) {
  const secret = process.env.BINANCE_API_SECRET?.trim();
  const user = String(req.headers?.["x-bot-user"] || "");
  const ts = String(req.headers?.["x-bot-ts"] || "");
  const signature = String(req.headers?.["x-bot-sig"] || "");
  if (!secret || !/^\d{15,22}$/.test(user) || !signature || Math.abs(Date.now() - Number(ts)) > BOT_CLIENT_MAX_SKEW_MS) return null;
  const expected = createHmac("sha256", secret).update(`${ts}.client.${user}`).digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected) ? `discord:${user}` : null;
}

export function clientIp(req) {
  const botClient = botClientId(req);
  if (botClient) return botClient;
  const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.headers?.["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

export function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 32);
}

/** Counts a request in a fixed window; returns seconds to wait once `limit` is used up. */
export async function throttle(kind, key, limit, windowSeconds) {
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const count = await kvIncr(`ls:rate:${kind}:${key}:${bucket}`, windowSeconds + 5);
  if (count <= limit) return 0;
  return windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);
}

function tokenSecret() {
  const explicit = process.env.CHECKOUT_TOKEN_SECRET?.trim();
  return explicit || createHash("sha256").update(`lolscript-checkout:${process.env.SELLHUB_API_TOKEN || ""}`).digest("hex");
}

/** Signed, expiring token so only the buyer's browser can read an order's status and keys. */
export function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", tokenSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readToken(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", tokenSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return data?.x > Date.now() ? data : null;
  } catch {
    return null;
  }
}

/**
 * Binance Gift Card redemption (POST /sapi/v1/giftcard/redeemCode).
 * Redeemed funds land in the funding wallet of the account behind BINANCE_API_KEY.
 * Binance rejects US servers, so on Vercel the Discord bot redeems the code (giftcard-bot.mjs);
 * locally the call goes straight to Binance.
 */

import { createHash, createHmac } from "node:crypto";
import { redeemViaBot } from "./giftcard-bot.mjs";

const API = "https://api.binance.com";

export function binanceConfigured() {
  const key = process.env.BINANCE_API_KEY?.trim() || "";
  const secret = process.env.BINANCE_API_SECRET?.trim() || "";
  return key.length >= 20 && secret.length >= 20;
}

/** Short, non-reversible id of the Binance account, used to key its rate-limit cooldown. */
export function binanceAccountId() {
  const key = binanceConfigured() ? process.env.BINANCE_API_KEY.trim() : "none";
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}

/** Normalises user input to a bare redemption code, or "" when it cannot be one. */
export function normalizeGiftCardCode(raw) {
  let code = String(raw || "").trim().replace(/^code-/i, "").replace(/\s+/g, "");
  if (code.length < 10 || code.length > 40 || !/^[A-Za-z0-9]+$/.test(code)) return "";
  if (!/[0-9]/.test(code) || !/[A-Za-z]/.test(code)) return "";
  return code;
}

export function maskCode(code) {
  const c = String(code || "");
  return c.length <= 8 ? "****" : `${c.slice(0, 4)}…${c.slice(-4)}`;
}

async function serverTime() {
  try {
    const res = await fetch(`${API}/api/v3/time`, { cache: "no-store" });
    const data = await res.json();
    if (Number(data?.serverTime) > 0) return Number(data.serverTime);
  } catch {}
  return Date.now();
}

/**
 * Returns one of:
 *  { ok: true, amount, token, referenceNo }
 *  { ok: false, kind: "invalid" | "used" | "config" | "unavailable", message, apiCode }
 * On Vercel (US servers, rejected by Binance) the Discord bot redeems the code instead.
 */
export async function redeemGiftCard(code, externalUid) {
  if (!binanceConfigured()) {
    return { ok: false, kind: "config", message: "Binance API is not configured." };
  }
  if (process.env.VERCEL) return redeemViaBot(code, externalUid);
  return { ...(await redeemGiftCardDirect(code, externalUid)), region: "local" };
}

async function redeemGiftCardDirect(code, externalUid) {

  const params = new URLSearchParams({ code, recvWindow: "10000", timestamp: String(await serverTime()) });
  if (externalUid) params.set("externalUid", externalUid);
  const query = params.toString();
  const signature = createHmac("sha256", process.env.BINANCE_API_SECRET.trim()).update(query).digest("hex");

  let res;
  let data;
  try {
    res = await fetch(`${API}/sapi/v1/giftcard/redeemCode?${query}&signature=${signature}`, {
      method: "POST",
      headers: { "X-MBX-APIKEY": process.env.BINANCE_API_KEY.trim() },
    });
    data = await res.json().catch(() => ({}));
  } catch (error) {
    return { ok: false, kind: "unavailable", message: String(error?.message || error) };
  }

  const success = data?.success === true || String(data?.code) === "000000";
  const payload = data?.data && typeof data.data === "object" ? data.data : data;
  if (res.ok && success && payload?.amount != null) {
    return {
      ok: true,
      amount: Number(payload.amount) || 0,
      token: String(payload.token || "").toUpperCase(),
      referenceNo: String(payload.referenceNo || ""),
    };
  }

  const apiCode = data?.code;
  const message = String(data?.msg || data?.message || `HTTP ${res.status}`);
  const lower = message.toLowerCase();
  if (lower.includes("already") || lower.includes("redeemed")) {
    return { ok: false, kind: "used", message, apiCode };
  }
  if (
    res.status === 451 ||
    lower.includes("restricted location") ||
    [-1021, -1022, -2008, -2014, -2015].includes(Number(apiCode)) ||
    res.status === 401 ||
    res.status === 403
  ) {
    return { ok: false, kind: "config", message, apiCode };
  }
  if (res.status === 429 || res.status === 418 || Number(apiCode) === -1003) {
    const retryAfter = Number(res.headers.get("retry-after")) || 0;
    return { ok: false, kind: "unavailable", rateLimited: true, banned: res.status === 418, retryAfter, message, apiCode };
  }
  if (res.status >= 500) {
    return { ok: false, kind: "unavailable", message, apiCode };
  }
  return { ok: false, kind: "invalid", message, apiCode };
}

/**
 * Crypto payments straight into the Binance account behind BINANCE_API_KEY.
 * Each order gets its own amount per coin (a few thousandths above the price), so a deposit in
 * Binance's deposit history can be matched to exactly one order. Binance rejects US servers and
 * Sellhub rejects some EU ones, so on Vercel the signed Binance calls go through
 * api/binance-relay.js, which runs in Frankfurt (see vercel.json regions).
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { binanceConfigured } from "./binance-giftcard.mjs";
import { kvDel, kvGet, kvSet, kvSetNx } from "./kv-store.mjs";

const API = "https://api.binance.com";
const MARKET_API = "https://data-api.binance.vision";

/** `decimals` sets the step the amount is varied by, e.g. 3 → 0.001 USDT. */
export const CRYPTO_COINS = [
  { id: "usdt-trc20", coin: "USDT", network: "TRX", ticker: "USDT", name: "Tether", networkName: "Tron (TRC20)", decimals: 3, stable: true },
  { id: "usdt-bep20", coin: "USDT", network: "BSC", ticker: "USDT", name: "Tether", networkName: "BNB Smart Chain (BEP20)", decimals: 3, stable: true },
  { id: "ltc", coin: "LTC", network: "LTC", ticker: "LTC", name: "Litecoin", networkName: "Litecoin", decimals: 6 },
  { id: "btc", coin: "BTC", network: "BTC", ticker: "BTC", name: "Bitcoin", networkName: "Bitcoin", decimals: 8 },
  { id: "eth", coin: "ETH", network: "ETH", ticker: "ETH", name: "Ethereum", networkName: "Ethereum (ERC20)", decimals: 6 },
  { id: "trx", coin: "TRX", network: "TRX", ticker: "TRX", name: "Tron", networkName: "Tron", decimals: 3 },
  { id: "sol", coin: "SOL", network: "SOL", ticker: "SOL", name: "Solana", networkName: "Solana", decimals: 6 },
];

const OFFSET_SLOTS = 99;
const ADDRESS_TTL = 24 * 60 * 60;
const HISTORY_CACHE_SECONDS = 10;
const HISTORY_WINDOW_MS = 8 * 60 * 60 * 1000;

export function binanceDepositsEnabled() {
  const mode = (process.env.CRYPTO_PROVIDER || "binance").trim().toLowerCase();
  return mode === "binance" && binanceConfigured();
}

function sign(query) {
  return createHmac("sha256", process.env.BINANCE_API_SECRET.trim()).update(query).digest("hex");
}

export const RELAY_PATHS = ["/sapi/v1/capital/deposit/address", "/sapi/v1/capital/deposit/hisrec"];

function relayKey() {
  return createHash("sha256").update(`lolscript-binance-relay:${process.env.BINANCE_API_SECRET?.trim() || ""}`).digest();
}

export function relaySignature(ts, body) {
  return createHmac("sha256", relayKey()).update(`${ts}.${body}`).digest("hex");
}

export function relaySignatureValid(ts, body, signature) {
  const sentAt = Number(ts);
  if (!binanceConfigured() || !Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > 60_000) return false;
  const a = Buffer.from(String(signature || ""));
  const b = Buffer.from(relaySignature(ts, body));
  return a.length === b.length && timingSafeEqual(a, b);
}

async function viaRelay(path, params) {
  const base = (process.env.SITE_URL || "https://www.lolscript.store").replace(/\/+$/, "");
  const body = JSON.stringify({ path, params });
  const ts = String(Date.now());
  try {
    const res = await fetch(`${base}/api/binance-relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Relay-Ts": ts, "X-Relay-Sig": relaySignature(ts, body) },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => null);
    if (!data || typeof data.ok !== "boolean") return { ok: false, status: res.status, data: { msg: `Relay HTTP ${res.status}` }, restricted: false };
    return data;
  } catch (error) {
    return { ok: false, status: 0, data: { msg: `Relay: ${error?.message || error}` }, restricted: false };
  }
}

/** Signed GET against /sapi; returns { ok, status, data, restricted }. */
function sapiGet(path, params) {
  return process.env.VERCEL && !process.env.BINANCE_RELAY_DIRECT ? viaRelay(path, params) : sapiGetDirect(path, params);
}

export async function sapiGetDirect(path, params) {
  const query = new URLSearchParams({ ...params, recvWindow: "10000", timestamp: String(Date.now()) }).toString();
  try {
    const res = await fetch(`${API}${path}?${query}&signature=${sign(query)}`, {
      headers: { "X-MBX-APIKEY": process.env.BINANCE_API_KEY.trim() },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => null);
    const message = String(data?.msg || "").toLowerCase();
    return { ok: res.ok, status: res.status, data, restricted: res.status === 451 || message.includes("restricted location") };
  } catch (error) {
    return { ok: false, status: 0, data: { msg: String(error?.message || error) }, restricted: false };
  }
}

export async function depositAddress(coin) {
  const cacheKey = `ls:cpay:addr:${coin.id}`;
  const cached = await kvGet(cacheKey);
  if (cached) return String(cached);
  const r = await sapiGet("/sapi/v1/capital/deposit/address", { coin: coin.coin, network: coin.network });
  const address = r.ok && typeof r.data?.address === "string" ? r.data.address.trim() : "";
  // Coins that need a memo/tag cannot be matched by amount alone.
  if (!address || r.data?.tag) return { error: r.data?.msg || `HTTP ${r.status}`, restricted: r.restricted };
  await kvSet(cacheKey, address, ADDRESS_TTL);
  return address;
}

let priceCache = { at: 0, prices: {} };

export async function usdPrices() {
  if (Date.now() - priceCache.at < 30_000) return priceCache.prices;
  const symbols = CRYPTO_COINS.filter((c) => !c.stable).map((c) => `${c.coin}USDT`);
  const res = await fetch(`${MARKET_API}/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Binance prices HTTP ${res.status}`);
  const prices = {};
  for (const row of await res.json()) prices[String(row.symbol).replace(/USDT$/, "")] = Number(row.price);
  priceCache = { at: Date.now(), prices };
  return prices;
}

export const formatAmount = (coin, value) => Number(value).toFixed(coin.decimals);

/**
 * Picks a free amount just above `baseAmount` and reserves it for `orderId`.
 * Returns the amount string, or null when every slot is taken.
 */
export async function reserveAmount(coin, baseAmount, orderId, ttlSeconds) {
  const step = 10 ** -coin.decimals;
  const base = Math.ceil(baseAmount / step - 1e-6) * step;
  const tried = new Set();
  for (let i = 0; i < 25; i++) {
    const slot = 1 + Math.floor(Math.random() * OFFSET_SLOTS);
    if (tried.has(slot)) continue;
    tried.add(slot);
    const amount = formatAmount(coin, base + slot * step);
    if (await kvSetNx(amountKey(coin, amount), orderId, ttlSeconds)) return amount;
  }
  return null;
}

export const amountKey = (coin, amount) => `ls:cpay:amt:${coin.id}:${amount}`;

/**
 * Recent deposits (last few hours), shared across requests for a few seconds to stay far below
 * Binance rate limits. Returns { deposits } or { error, restricted }.
 */
async function cachedDeposits() {
  const cached = await kvGet("ls:cpay:history");
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export async function recentDeposits() {
  const cached = await cachedDeposits();
  if (cached) return { deposits: cached };
  // One request refreshes the cache; the others wait briefly for it instead of all hitting Binance.
  if (!(await kvSetNx("ls:cpay:history:lock", "1", 8))) {
    for (let i = 0; i < 6; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const fresh = await cachedDeposits();
      if (fresh) return { deposits: fresh };
    }
    return { error: "Deposit history refresh in progress" };
  }
  const now = Date.now();
  const r = await sapiGet("/sapi/v1/capital/deposit/hisrec", {
    startTime: String(now - HISTORY_WINDOW_MS),
    endTime: String(now),
    limit: "1000",
  });
  if (!r.ok || !Array.isArray(r.data)) {
    await kvDel("ls:cpay:history:lock");
    return { error: r.data?.msg || `HTTP ${r.status}`, restricted: r.restricted };
  }
  const deposits = r.data.map((d) => ({
    id: String(d.id || ""),
    coin: String(d.coin || "").toUpperCase(),
    network: String(d.network || "").toUpperCase(),
    amount: String(d.amount || "0"),
    status: Number(d.status),
    txId: String(d.txId || ""),
    insertTime: Number(d.insertTime) || 0,
  }));
  await kvSet("ls:cpay:history", JSON.stringify(deposits), HISTORY_CACHE_SECONDS);
  await kvDel("ls:cpay:history:lock");
  return { deposits };
}

/** 1 = success, 6 = credited but locked: both mean the money is in the account. */
export const isCredited = (deposit) => deposit.status === 1 || deposit.status === 6;
export const isIncoming = (deposit) => deposit.status === 0 || deposit.status === 8;

export const normalizeTxId = (value) => String(value || "").trim().replace(/^0x/i, "").toLowerCase();

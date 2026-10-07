/**
 * Shopier REST API (https://developer.shopier.com) used with a Personal Access Token.
 * Customers pay on Shopier product pages; the order.created webhook triggers Sellhub delivery.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const API_URL = "https://api.shopier.com/v1";

function pat() {
  return process.env.SHOPIER_PAT?.trim() || "";
}

export function shopierWebhookToken() {
  return process.env.SHOPIER_WEBHOOK_TOKEN?.trim() || "";
}

export function shopierDeliveryEnabled() {
  return Boolean(shopierWebhookToken() && pat());
}

function safeEqual(expected, received) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Shopier signs the raw body with HMAC-SHA256 using the webhook token (hex or base64). */
export function verifyShopierSignature(rawBody, signature) {
  const token = shopierWebhookToken();
  const received = String(signature || "").trim();
  if (!token || !received) return false;
  const hmac = () => createHmac("sha256", token).update(rawBody, "utf8");
  return safeEqual(hmac().digest("hex"), received) || safeEqual(hmac().digest("base64"), received);
}

export async function shopierApi(path, init = {}) {
  const token = pat();
  if (!token) return { ok: false, status: 0, data: { message: "SHOPIER_PAT not configured" } };
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: { message: error.message } };
  }
}

function apiError(result) {
  return result.data?.message || result.data?.error || `Shopier API ${result.status}`;
}

/** The order as Shopier has it on record; delivery trusts this, never the webhook body alone. */
export async function getShopierOrder(orderId) {
  const result = await shopierApi(`/orders/${encodeURIComponent(orderId)}`);
  if (!result.ok || !result.data?.id) return { error: apiError(result) };
  return { order: result.data };
}

const STORE_URL = "https://www.shopier.com";
const STORE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

/**
 * Products from the public Shopier store page, shaped like the REST API's product objects.
 * Used when the account's /products API is blocked (Shopier answers 403 regardless of token scopes).
 */
async function listShopierStoreProducts() {
  const store = process.env.SHOPIER_STORE?.trim() || "mitamers";
  try {
    const page = await fetch(`${STORE_URL}/${store}`, { headers: { "User-Agent": STORE_UA } });
    if (!page.ok) return { error: `Shopier store page ${page.status}` };
    const csrf = (await page.text()).match(/name="csrf-token" content="([^"]+)"/)?.[1];
    if (!csrf) return { error: "Shopier store page has no csrf token" };
    const cookie = page.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    const res = await fetch(`${STORE_URL}/s/api/v1/search_product/${store}`, {
      method: "POST",
      headers: {
        "User-Agent": STORE_UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRF-TOKEN": csrf,
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${STORE_URL}/${store}`,
        Cookie: cookie,
      },
      body: "start=500&offset=0&filter=0&sort=0&filterMinPrice=&filterMaxPrice=&datesort=-1&pricesort=-1&value=",
    });
    if (!res.ok) return { error: `Shopier store search ${res.status}` };
    const products = ((await res.json())?.products || [])
      .filter((p) => p.id && p.name)
      .map((p) => ({
        id: String(p.id),
        title: String(p.name),
        url: p.link || `${STORE_URL}/${store}/${p.id}`,
        priceData: { price: Number(p.price?.masterpass_amount) / 100 || null, currency: "TRY" },
        stockStatus: "inStock",
      }));
    return { products };
  } catch (error) {
    return { error: error.message };
  }
}

/** Every product listed on the Shopier account (the API pages at most 50 per request). */
export async function listShopierProducts() {
  const products = [];
  for (let page = 1; page <= 20; page++) {
    const result = await shopierApi(`/products?limit=50&page=${page}`);
    if (!result.ok || !Array.isArray(result.data)) {
      if (page === 1) return result.status === 403 ? listShopierStoreProducts() : { error: apiError(result) };
      break;
    }
    products.push(...result.data);
    if (result.data.length < 50) break;
  }
  return { products };
}

/** Marks a digital order as delivered on Shopier so it does not stay open in the seller panel. */
export async function fulfillShopierOrder(orderId, note) {
  const result = await shopierApi(`/orders/${encodeURIComponent(orderId)}`, {
    method: "PUT",
    body: JSON.stringify({ fulfillments: { productType: "digital", note } }),
  });
  return result.ok ? { ok: true } : { error: apiError(result) };
}

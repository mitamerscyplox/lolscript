/**
 * Shopier catalog from the Shopier REST API: links each Sellhub variant to the Shopier product
 * with the same product name and duration, e.g. Sellhub "LoL Script" + "7 DAY KEY" <-> Shopier
 * "LoL Script 7 Gün". Matching is exact (no fuzzy guesses) so a listing can never deliver the
 * wrong product.
 */

import { fetchSellhubProducts } from "./sellhub-core.mjs";
import { listShopierProducts } from "./shopier.mjs";

const CACHE_MS = 5 * 60 * 1000;

const NOISE = new Set(["licence", "license", "lisans", "key", "keys", "anahtar", "of", "legends", "league", "vanguard", "perm"]);
const ALIASES = { "one time": "onetime", "life time": "lifetime", "league of legends": "lol", "ömür boyu": "lifetime", "tek seferlik": "onetime" };

/** Shopier titles that belong to this site; orders without them are left to other stores on the account. */
export const LOL_TITLE_RE = /\b(lol|league\s+of\s+legends)\b/i;

function duration(text) {
  const s = String(text || "").toLowerCase();
  if (/\blife\s*time\b|ömür\s*boyu/.test(s)) return "lifetime";
  if (/\bone\s*time\b|tek\s*seferlik/.test(s)) return "onetime";
  const n = s.match(/(\d+)\s*(day|gün|gun|week|hafta|month|ay)s?\b/);
  if (!n) return null;
  const mult = ["month", "ay"].includes(n[2]) ? 30 : ["week", "hafta"].includes(n[2]) ? 7 : 1;
  return `${Number(n[1]) * mult}day`;
}

/** Product identity without filler words or durations, e.g. "LoL Vanguard Emulator 7 Day" -> "emulator lol vanguard". */
function baseKey(text) {
  let s = ` ${String(text || "").toLowerCase().replace(/[^a-z0-9ğüşöçı]+/g, " ")} `;
  for (const [from, to] of Object.entries(ALIASES)) s = s.replaceAll(` ${from} `, ` ${to} `);
  s = s
    .replace(/\blife\s*time\b|\bone\s*time\b/g, " ")
    .replace(/\b\d+\s*(days?|gün|gun|weeks?|hafta|months?|ay)\b/g, " ");
  return s
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w))
    .sort()
    .join(" ");
}

function listingKey(name, variantName) {
  const d = duration(variantName || name);
  const base = baseKey(name);
  return d && base ? `${base}|${d}` : null;
}

function toListing(product) {
  const price = product.priceData?.discount ? product.priceData.discountedPrice : product.priceData?.price;
  return {
    id: String(product.id),
    name: String(product.title || "").trim(),
    url: String(product.url || `https://www.shopier.com/${product.id}`),
    price: Number(price) || null,
    currency: product.priceData?.currency || "TRY",
    inStock: product.stockStatus !== "outOfStock",
  };
}

let cache = null;
let inflight = null;

/** LoL products on the Shopier account, cached for 5 minutes; keeps the last good list if the API fails. */
export async function getShopierListings() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.listings;
  inflight ??= listShopierProducts()
    .then(({ products, error }) => {
      if (error) throw new Error(error);
      const listings = products.map(toListing).filter((l) => l.name && LOL_TITLE_RE.test(l.name));
      cache = { at: Date.now(), listings };
      return listings;
    })
    .catch((error) => {
      console.warn("[shopier] product list failed:", error.message);
      return cache?.listings ?? [];
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function sellhubVariantsByKey() {
  const byKey = new Map();
  for (const product of await fetchSellhubProducts()) {
    for (const variant of product.variants || []) {
      const variantName = variant.title || variant.name || "";
      const key = listingKey(product.name, variantName);
      if (!key) continue;
      byKey.set(key, [
        ...(byKey.get(key) || []),
        {
          productId: product.id,
          variantId: String(variant.id),
          variantName,
          variantPrice: Number(variant.price),
          label: [product.name, variantName].filter(Boolean).join(" · "),
        },
      ]);
    }
  }
  return byKey;
}

/** Sellhub variants that have exactly one Shopier product with the same name and duration. */
export async function getShopierVariantLinks() {
  const [listings, variantsByKey] = await Promise.all([getShopierListings(), sellhubVariantsByKey()]);

  const listingsByKey = new Map();
  for (const listing of listings) {
    const key = listingKey(listing.name, listing.name);
    if (key) listingsByKey.set(key, [...(listingsByKey.get(key) || []), listing]);
  }

  const links = [];
  for (const [key, variants] of variantsByKey) {
    const matches = listingsByKey.get(key) || [];
    if (matches.length !== 1 || variants.length !== 1) continue;
    const m = matches[0];
    links.push({ ...variants[0], shopierId: m.id, url: m.url, price: m.price, currency: m.currency, inStock: m.inStock });
  }
  return links;
}

/** Sellhub variant for a Shopier order line: by product ID first, then by the ordered title. */
export async function findVariantForShopierLine(shopierProductId, title) {
  const byId = (await getShopierVariantLinks()).find((l) => l.shopierId === shopierProductId);
  if (byId) return byId;
  if (!title || !LOL_TITLE_RE.test(title)) return null;
  const key = listingKey(title, title);
  if (!key) return null;
  const candidates = (await sellhubVariantsByKey()).get(key) || [];
  return candidates.length === 1 ? candidates[0] : null;
}

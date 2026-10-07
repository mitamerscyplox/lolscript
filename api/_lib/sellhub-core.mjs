/**
 * Sellhub client (adapted from Mitamers lib/sellhub.ts)
 * Docs: https://docs.sellhub.cx
 */

import {
  extractShowcaseVideoUrl,
  filterProductImages,
  isEmbedVideoUrl,
} from "./sellhub-video.mjs";

const DEFAULT_API = "https://dash.sellhub.cx/api/sellhub";

/** Sellhub sometimes hangs for minutes; abort so the serverless function can answer before its own timeout. */
function sellhubFetch(url, init = {}, ms = 12000) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
}

const timedOut = (error) => error?.name === "TimeoutError" || error?.name === "AbortError";

export const STORE_SLUGS = ["lol-script", "lol-vanguard-emulator", "lol-perm-spoofer"];

const SLUG_MATCHERS = {
  "lol-script": ["lol-script", "lol script", "script"],
  "lol-vanguard-emulator": ["vanguard", "emulator", "bolt"],
  "lol-perm-spoofer": ["spoofer", "perm", "hwid"],
};

function envPrice(key, fallback) {
  const raw = process.env[key];
  if (raw == null || String(raw).trim() === "") return fallback;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function variant(id, name, price) {
  return { id, name, title: name, price, stock: 100 };
}

function buildFallback() {
  const scriptVariants = [
    variant("lol-script-1-day", "1 Day Key", envPrice("FALLBACK_LOL_SCRIPT_1_DAY", 3.99)),
    variant("lol-script-7-day", "7 Day Key", envPrice("FALLBACK_LOL_SCRIPT_7_DAY", 11.99)),
    variant("lol-script-30-day", "30 Day Key", envPrice("FALLBACK_LOL_SCRIPT_30_DAY", 27.99)),
  ];
  const vanguardVariants = [
    variant("lol-vanguard-7-day", "7 Day Key", envPrice("FALLBACK_VANGUARD_7_DAY", 79.99)),
    variant("lol-vanguard-30-day", "30 Day Key", envPrice("FALLBACK_VANGUARD_30_DAY", 199.99)),
    variant("lol-vanguard-lifetime", "Lifetime Key", envPrice("FALLBACK_VANGUARD_LIFETIME", 449.99)),
  ];
  const spooferVariants = [
    variant("lol-spoofer-onetime", "Onetime Key", envPrice("FALLBACK_SPOOFER_ONETIME", 19.99)),
    variant("lol-spoofer-lifetime", "Lifetime Key", envPrice("FALLBACK_SPOOFER_LIFETIME", 49.99)),
  ];

  const cheapest = (variants) => Math.min(...variants.map((v) => v.price));

  return {
    "lol-script": {
      name: "LoL Script",
      price: cheapest(scriptVariants),
      currency: "usd",
      variants: scriptVariants,
    },
    "lol-vanguard-emulator": {
      name: "LoL Vanguard Emulator",
      price: cheapest(vanguardVariants),
      currency: "usd",
      variants: vanguardVariants,
    },
    "lol-perm-spoofer": {
      name: "LoL Perm Spoofer",
      price: cheapest(spooferVariants),
      currency: "usd",
      variants: spooferVariants,
    },
  };
}

const FALLBACK = buildFallback();

function normalizeStoreUrl(raw) {
  const url = String(raw || "").trim().replace(/\/+$/, "");
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getConfig() {
  return {
    storeUrl: normalizeStoreUrl(process.env.SELLHUB_STORE_URL),
    apiUrl: (process.env.SELLHUB_API_URL || DEFAULT_API).replace(/\/+$/, ""),
    token: process.env.SELLHUB_API_TOKEN || "",
  };
}

export function sellhubAuthHeaders(token) {
  const key = token.replace(/^Bearer\s+/i, "").replace(/^Basic\s+/i, "").trim();
  return { Authorization: key, "Content-Type": "application/json" };
}

function parsePrice(val) {
  if (val == null) return 0;
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]/g, "");
    const n = parseFloat(cleaned);
    if (!Number.isNaN(n)) return n;
    const asInt = parseInt(cleaned, 10);
    return Number.isNaN(asInt) ? 0 : asInt / 100;
  }
  if (typeof val === "object") {
    const o = val;
    if ("amount" in o) return parsePrice(o.amount);
    if ("priceInCents" in o) return Number(o.priceInCents) / 100;
  }
  return 0;
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractSlug(p) {
  const urlOrSlug = p.slug ?? p.url;
  if (!urlOrSlug) return slugify(p.name || p.id || "");
  const s = String(urlOrSlug);
  if (s.startsWith("http")) {
    try {
      const segment = new URL(s).pathname.split("/").filter(Boolean).pop();
      return slugify(segment || s);
    } catch {
      return slugify(s);
    }
  }
  return slugify(s);
}

function parseVariantFromApi(v, fallbackPrice, productId, index) {
  if (v.hidden === true || v.enabled === false) return null;
  const id = String(v.id ?? v.variantId ?? "").trim() || `${productId}-v${index}`;
  const variantPrice = parsePrice(
    v.price ?? v.priceSlash ?? v.priceslash ?? v.itemCost ?? v.amount ?? fallbackPrice
  );
  const dur = v.basewarrantyDuration ?? v.baseWarrantyDuration ?? v.duration;
  let label = String(v.name ?? v.title ?? v.shortDescription ?? "Standard");
  if (dur && typeof dur === "object") {
    const unit = String(dur.unit ?? "days");
    const num = Number(dur.duration ?? 1);
    if (num === 1 && unit === "days") label = "1 Day";
    else if (num === 7 && unit === "days") label = "7 Days";
    else if (num === 30 && unit === "days") label = "30 Days";
    else if (num === 90 && unit === "days") label = "90 Days";
    else if (num === 365 && unit === "days") label = "1 Year";
    else if (label === "Standard") label = `${num} ${unit}`;
  }
  const delivery = v.delivery;
  const unlimitedStock = delivery?.unlimitedStock === true;
  const serialKeys = Array.isArray(delivery?.serialKeys) ? delivery.serialKeys : [];
  const stock = unlimitedStock ? 999 : Number(v.stock ?? v.inStock ?? serialKeys.length ?? 100);
  return { id, name: label, title: label, price: variantPrice || fallbackPrice, stock };
}

function parseVariants(p, price, productId) {
  const v = p.variants ?? p.subscriptionVariants;
  if (!v) return [];

  if (Array.isArray(v)) {
    const first = v[0];
    if (typeof first === "string") {
      return [{ id: first || productId, name: "Standard", title: "Standard", price: price || 0, stock: 100 }];
    }
    return v
      .map((x, i) => parseVariantFromApi(x, price, productId, i))
      .filter(Boolean);
  }

  if (typeof v === "object") {
    return Object.entries(v)
      .map(([id, data], i) => parseVariantFromApi({ ...data, id }, price, productId, i))
      .filter(Boolean);
  }
  return [];
}

async function fetchVariantsForProduct(productId, fallbackPrice, apiUrl, token) {
  try {
    const url = `${apiUrl}/products/variants?productId=${encodeURIComponent(productId)}`;
    const res = await sellhubFetch(url, { headers: sellhubAuthHeaders(token), cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.data ?? data;
    const arr = raw?.variants ?? raw?.subscriptionVariants ?? (Array.isArray(data) ? data : []);
    if (!Array.isArray(arr) || !arr.length) return null;
    const parsed = arr
      .map((x, i) => parseVariantFromApi(x, fallbackPrice, productId, i))
      .filter(Boolean);
    return parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeProduct(raw) {
  const id = String(raw.id || "");
  const rawUrl = String(raw.slug ?? raw.url ?? "").trim();
  const sellhubSlug = extractSlug(raw);
  const pageSlug = rawUrl && !rawUrl.startsWith("http")
    ? rawUrl.replace(/^\/+/, "")
    : sellhubSlug;
  const rawPrice = parsePrice(
    raw.cheapestSubscription ?? raw.price ?? raw.displayPrice ?? raw.minPrice ?? 0
  );
  let variants = parseVariants(raw, rawPrice, id);
  const price = rawPrice || (variants.length ? Math.min(...variants.map((v) => v.price)) : 0);
  const rawImages = Array.isArray(raw.images) ? raw.images : [];
  const images = filterProductImages(rawImages);
  const rawImage = String(raw.image || "").trim();
  const image = rawImage && !isEmbedVideoUrl(rawImage) ? rawImage : images[0] || "";
  const showcaseVideo = extractShowcaseVideoUrl(raw, rawImages, String(raw.description || ""));

  return {
    id,
    name: String(raw.name || ""),
    description: String(raw.description || ""),
    shortDescription: String(raw.shortDescription || ""),
    sellhubSlug,
    pageSlug,
    price,
    currency: String(raw.currency || "USD").toLowerCase(),
    hidden: Boolean(raw.hidden),
    inStock: !String(raw.displayedStatus || "").toLowerCase().includes("out of stock"),
    displayedStatus: raw.displayedStatus,
    image,
    images,
    showcaseVideo,
    variants: variants.length
      ? variants
      : [{ id, name: "Standard", title: "Standard", price: price || 0, stock: 100 }],
    _needsVariantFetch: variants.length <= 1 && variants[0]?.name === "Standard",
  };
}

async function enrichWithVariants(products, apiUrl, token) {
  const results = await Promise.all(
    products.map(async (p) => {
      const parsed = await fetchVariantsForProduct(p.id, p.price, apiUrl, token);
      if (parsed?.length) {
        return { ...p, variants: parsed, price: Math.min(...parsed.map((v) => v.price)) };
      }
      return p;
    })
  );
  return results.map(({ _needsVariantFetch, ...rest }) => rest);
}

export async function fetchSellhubProducts() {
  const { apiUrl, token } = getConfig();
  if (!token) return [];

  const res = await sellhubFetch(`${apiUrl}/products`, {
    headers: sellhubAuthHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Sellhub ${res.status}`);
  const data = await res.json();
  const raw = data?.data?.products ?? data?.products ?? [];
  if (!Array.isArray(raw) || !raw.length) return [];

  let products = raw.map((p) => normalizeProduct(p));
  products = await enrichWithVariants(products, apiUrl, token);
  return products.filter((p) => !p.hidden);
}

function matchesStoreSlug(product, storeSlug) {
  const keywords = SLUG_MATCHERS[storeSlug] || [storeSlug];
  const haystack = `${product.name} ${product.sellhubSlug} ${product.id}`.toLowerCase();
  const normalizedStore = storeSlug.toLowerCase();
  if (product.sellhubSlug === normalizedStore) return true;
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

export function buildPageUrl(product, storeUrl) {
  const raw = String(product?.pageSlug || product?.sellhubSlug || product?.url || "").trim();
  if (!raw) return storeUrl || "#products";
  if (/^https?:\/\//i.test(raw)) return raw;
  const slug = raw.replace(/^\/+/, "");
  return storeUrl ? `${storeUrl}/products/${slug}` : `#products`;
}

export function mapProductsToStore(products) {
  const { storeUrl } = getConfig();
  const mapped = {};

  for (const storeSlug of STORE_SLUGS) {
    const fallback = FALLBACK[storeSlug];
    const product = products.find((p) => matchesStoreSlug(p, storeSlug));

    if (!product) {
      mapped[storeSlug] = {
        name: fallback.name,
        price: fallback.price,
        currency: fallback.currency,
        url: storeUrl || "#products",
        inStock: true,
        variants: fallback.variants || [],
        error: "not found on Sellhub",
      };
      continue;
    }

    const liveVariants = (product.variants || []).filter((v) => Number(v.price) > 0);
    const useFallbackVariants = !liveVariants.length;
    const variants = useFallbackVariants ? fallback.variants || [] : liveVariants;
    const cheapest = variants.length
      ? Math.min(...variants.map((v) => v.price))
      : product.price;

    mapped[storeSlug] = {
      ...(useFallbackVariants ? {} : { productId: product.id }),
      sellhubSlug: product.sellhubSlug,
      name: product.name || fallback.name,
      price: cheapest || fallback.price,
      currency: product.currency || fallback.currency,
      url: buildPageUrl(product, storeUrl),
      inStock: product.inStock,
      image: product.image || "",
      images: product.images || [],
      showcaseVideo: product.showcaseVideo || "",
      variants,
    };
  }

  return mapped;
}

export function getProductByStoreSlug(products, storeSlug) {
  return products.find((p) => matchesStoreSlug(p, storeSlug)) || null;
}

function normalizeCheckoutUrl(url, storeUrl, sessionId) {
  const base = storeUrl.replace(/\/+$/, "");
  const pathPrefix = (process.env.SELLHUB_CHECKOUT_PATH || "checkout").replace(/^\/|\/$/g, "") || "checkout";
  const buildUrl = (id) => `${base}/${pathPrefix}/${id}`;

  if (sessionId) return buildUrl(sessionId);
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/(?:order|invoice|checkout)[/]([a-f0-9-]+)/i);
    const id = match?.[1];
    if (id && parsed.hostname.includes("sellhub.")) return buildUrl(id);
    if (parsed.pathname.includes("/invoice/")) {
      const idMatch = parsed.pathname.match(/[/]([a-f0-9-]{32,})/i);
      if (idMatch?.[1]) return buildUrl(idMatch[1]);
    }
  } catch {}
  return url;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function createCheckoutSession(payload) {
  const { storeUrl } = getConfig();
  if (!storeUrl) return { error: "SELLHUB_STORE_URL not configured" };

  const validItems = (payload.items || []).filter((item) => item.productId && item.variantId);
  if (!validItems.length) {
    return { error: "Valid product variant not found." };
  }

  const body = {
    email: payload.email,
    currency: "usd",
    returnUrl: payload.returnUrl,
    cartBundles: [],
    methodName: payload.methodName || "",
    bundleIds: [],
    customFieldValues: [],
    cart: {
      items: validItems.map((item) => ({
        id: item.productId,
        variant: {
          id: String(item.variantId),
          name: item.variantName || "",
          price: String(Number(item.variantPrice).toFixed(2)),
        },
        quantity: item.quantity || 1,
        coupon: payload.coupon || "",
        name: "",
        addons: [],
      })),
      bundles: [],
    },
  };

  let res;
  try {
    res = await sellhubFetch(`${storeUrl}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return { error: timedOut(error) ? "Sellhub checkout timed out" : `Sellhub unreachable: ${error?.message || error}` };
  }

  const data = await readJson(res);
  if (!res.ok) {
    return { error: data?.message || data?.error || `Checkout failed: ${res.status}` };
  }
  return { data, session: data?.session || data, storeUrl };
}

export async function processCheckoutSession(sessionId, methodName) {
  const { storeUrl } = getConfig();
  let res;
  try {
    res = await sellhubFetch(
      `${storeUrl}/api/processCheckout`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sessionId, methodName }) },
      25000
    );
  } catch (error) {
    return { error: timedOut(error) ? "Sellhub processCheckout timed out" : `Sellhub unreachable: ${error?.message || error}` };
  }
  const data = await readJson(res);
  const invoiceId = data?.invoiceId || data?.data?.invoiceId || data?.invoice?.id;
  if (!res.ok || !invoiceId) {
    return { error: data?.message || data?.error || `processCheckout failed: ${res.status}` };
  }
  return { invoiceId: String(invoiceId) };
}

export async function getInvoice(invoiceId) {
  const { apiUrl, token } = getConfig();
  let res;
  try {
    res = await sellhubFetch(`${apiUrl}/invoices/${encodeURIComponent(invoiceId)}`, {
      headers: sellhubAuthHeaders(token),
      cache: "no-store",
    });
  } catch (error) {
    return { error: timedOut(error) ? "Get invoice timed out" : `Sellhub unreachable: ${error?.message || error}` };
  }
  const data = await readJson(res);
  if (!res.ok) return { error: data?.message || data?.error || `Get invoice failed: ${res.status}` };
  return { invoice: data?.data?.invoice || data?.invoice || data?.data || null };
}

export async function completeInvoice(invoiceId) {
  const { apiUrl, token } = getConfig();
  const res = await fetch(`${apiUrl}/invoices/${encodeURIComponent(invoiceId)}/complete`, {
    method: "POST",
    headers: sellhubAuthHeaders(token),
  });
  const data = await readJson(res);
  if (!res.ok) return { error: data?.message || data?.error || `Complete invoice failed: ${res.status}` };
  return { ok: true };
}

/** Creates a pending Sellhub invoice for a non-Sellhub payment method (e.g. Binance gift card). */
export async function createPendingInvoice(payload, methodName) {
  const created = await createCheckoutSession(payload);
  if (created.error) return created;
  const sessionId = created.session?.id;
  if (!sessionId) return { error: "Sellhub did not return a checkout session." };
  const processed = await processCheckoutSession(sessionId, methodName);
  if (processed.error) return { ...processed, sessionId };
  return { sessionId, invoiceId: processed.invoiceId };
}

export function invoiceKeys(invoice) {
  return (invoice?.invoiceItems || [])
    .flatMap((item) => (Array.isArray(item.activationKey) ? item.activationKey : [item.activationKey]))
    .map((key) => (key && typeof key === "object" ? key.key ?? key.value : key))
    .filter((key) => typeof key === "string" && key.trim())
    .map((key) => key.trim());
}

export function isPaidInvoiceStatus(status) {
  return ["completed", "complete", "paid", "delivered"].includes(String(status || "").toLowerCase());
}

export async function findLiveVariant(productId, variantId) {
  const products = await fetchSellhubProducts();
  const product = products.find((p) => p.id === productId);
  const variant = product?.variants?.find((v) => String(v.id) === String(variantId));
  if (!product || !variant) return null;
  return { product, variant };
}

export async function createCheckout(payload) {
  const created = await createCheckoutSession(payload);
  if (created.error) return created;
  const { data, session, storeUrl } = created;
  const sessionId = session?.id;
  let checkoutUrl =
    session?.paymentUrl ||
    session?.url ||
    data?.paymentUrl ||
    data?.url ||
    data?.checkoutUrl ||
    data?.redirectUrl;

  if (!checkoutUrl && sessionId) {
    const template = process.env.CHECKOUT_REDIRECT_URL;
    const pathPrefix = process.env.SELLHUB_CHECKOUT_PATH || "checkout";
    checkoutUrl = template
      ? template.replace("{sessionId}", sessionId).replace("{id}", sessionId)
      : `${storeUrl}/${pathPrefix.replace(/^\/|\/$/g, "")}/${sessionId}`;
  }

  if (checkoutUrl) {
    return { url: normalizeCheckoutUrl(checkoutUrl, storeUrl, sessionId) };
  }
  return { error: "Could not get checkout URL." };
}

export { FALLBACK, getConfig };

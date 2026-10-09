// Creates the store's Sellhub products that do not exist yet (matched by Sellhub URL slug = site slug).
// Dry run by default; pass --create to send the requests. Needs SELLHUB_API_TOKEN in the environment or .env.
// Variant settings (payment methods, redirect, Discord, delivery note) are copied from an existing live product.
// Keys are delivered by hand: each stock unit is a "contact us on Discord" message. --restock tops existing
// variants up to --stock=N (default 50) units; add --reset to replace the existing stock instead.
import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { STORE_PRODUCTS, exactStoreSlug } from "../api/_lib/store-catalog.mjs";
import { PRODUCTS } from "./products.mjs";

const SITE = "https://www.lolscript.store";
const API = (process.env.SELLHUB_API_URL || "https://dash.sellhub.cx/api/sellhub").replace(/\/+$/, "");
const CREATE = process.argv.includes("--create");
const TEMPLATE_SLUG = "lol-script";
const SKIP = new Set(["lol-script", "lol-vanguard-emulator", "lol-perm-spoofer"]);
// Older deployments map the original products by keyword ("script", "emulator", "vanguard", "spoofer", "perm", "hwid")
// in the Sellhub name/url, so these use a catalog alias without those words.
const SELLHUB_NAMES = {
  "pvlol-script": ["Pvlol", "pvlol"],
  "bgx-script": ["BGX", "bgx"],
  "noi-vanguard-emulator": ["NOI Bypass", "noi-bypass"],
  "seraph-vanguard-emulator": ["Seraph Bypass", "seraph-bypass"],
  "oxa-vanguard-emulator": ["OXA Bypass", "oxa-bypass"],
  "soyuz-vanguard-emulator": ["Soyuz Bypass", "soyuz-bypass"],
};
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const RESTOCK = process.argv.includes("--restock");
const STOCK = Number(process.argv.find((a) => a.startsWith("--stock="))?.slice(8)) || 50;
const RESET = process.argv.includes("--reset");
// The invite code changes; this site route always redirects to the current one.
const DISCORD = "lolscript.store/discord";

const deliveryMessage = (productName, planName) =>
  `Thank you for purchasing ${productName} (${planName})! To receive your key, join our Discord ${DISCORD}, ` +
  "open a ticket and send your order ID. Our team will deliver your key as soon as possible.";

const stockKeys = (productName, planName, count) =>
  Array.from({ length: count }, () => ({ key: deliveryMessage(productName, planName) }));

function envToken() {
  if (process.env.SELLHUB_API_TOKEN?.trim()) return process.env.SELLHUB_API_TOKEN.trim();
  const file = new URL("../.env", import.meta.url);
  if (!existsSync(file)) return "";
  const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => /^\s*SELLHUB_API_TOKEN\s*=/.test(l));
  return line ? line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") : "";
}

const token = envToken().replace(/^(Bearer|Basic)\s+/i, "");
const headers = { Authorization: token, "Content-Type": "application/json" };

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers, signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 300); }
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} -> ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

const stripHtml = (html) => String(html || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const clip = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

function description(page) {
  const features = (page.features || []).map(([, title, html]) => `- **${title}:** ${stripHtml(html)}`);
  const notes = (page.notes || []).map((n) => `- ${stripHtml(n)}`);
  return [
    stripHtml(page.lead),
    features.length ? `\n**Features**\n${features.join("\n")}` : "",
    notes.length ? `\n**Before you buy**\n${notes.join("\n")}` : "",
    `\nSetup guide and FAQ: ${SITE}/${page.slug}`,
  ].filter(Boolean).join("\n");
}

// The variants endpoint returns flat fields; the create endpoint nests delivery settings.
function variantFrom(t, plan, page, order) {
  t = t || {};
  return {
    hidden: false,
    enabled: true,
    disabledMessage: "",
    name: plan.name,
    price: plan.price,
    priceSlash: 0,
    priceSellerPaysForItem: plan.price,
    order,
    disabledPaymentMethods: [],
    description: `${page.name} - ${plan.name}`,
    shortDescription: plan.name,
    stockVisible: t.stockVisible ?? false,
    baseWarranty: false,
    baseWarrantyDuration: { unit: "days", duration: 1 },
    delivery: {
      method: t.deliveryMethod || "automatic",
      allowDuplicatedKeys: t.allowDuplicatedKeys ?? true,
      note: t.note || "",
      serialKeys: [],
      files: [],
      serviceType: t.serviceType || "activationKey",
      deliveryTime: t.deliveryTime || "instant",
      unlimitedStock: false,
    },
    currency: t.currency || "usd",
    itemCost: plan.price,
    minOrderQuantity: 1,
    maxOrderQuantity: 99999,
    minOrderTotal: 0,
    maxOrderTotal: 99999,
    bulkDiscounts: [],
    allowBulkDiscountsWithCoupons: false,
    discordIntegration: t.discordIntegration || "disabled",
    tabs: {},
    customFields: [],
    discordServers: [],
    ...(t.redirectToUrl ? { redirectToUrl: t.redirectToUrl } : {}),
  };
}

async function main() {
  if (!token && CREATE) throw new Error("SELLHUB_API_TOKEN is not set (environment or .env).");
  if (!token) console.log("No SELLHUB_API_TOKEN: offline preview, existing Sellhub products are not checked.");

  const list = token ? await api("/products") : {};
  const existing = list?.data?.products ?? list?.products ?? [];
  const bySlug = new Map(existing.map((p) => [String(p.url || p.slug || "").toLowerCase(), p]));
  for (const p of existing) {
    const claimed = exactStoreSlug({ name: p.name });
    if (claimed && !bySlug.has(claimed)) bySlug.set(claimed, p);
  }
  if (token) console.log(`Sellhub has ${existing.length} products.`);

  let template = null;
  const templateProduct = bySlug.get(TEMPLATE_SLUG);
  if (templateProduct?.id) {
    const res = await api(`/products/variants?productId=${encodeURIComponent(templateProduct.id)}`);
    const arr = res?.data?.variants ?? res?.variants ?? [];
    template = arr[0] || null;
  }
  console.log(template ? `Variant settings copied from "${TEMPLATE_SLUG}".` : "No template product found; using defaults.");

  const pages = new Map(PRODUCTS.map((p) => [p.slug, p]));
  for (const product of STORE_PRODUCTS) {
    if (SKIP.has(product.slug) || (ONLY && !ONLY.includes(product.slug))) continue;
    const page = pages.get(product.slug);
    if (!page) { console.log(`skip ${product.slug}: no page data`); continue; }
    if (bySlug.has(product.slug)) {
      if (RESTOCK) await restock(bySlug.get(product.slug), page);
      else console.log(`exists ${product.slug}`);
      continue;
    }
    if (RESTOCK) { console.log(`missing ${product.slug} (create it first)`); continue; }

    const variants = Object.fromEntries(product.fallback.map((plan, i) => [randomUUID(), variantFrom(template, plan, page, i)]));
    const image = `${SITE}/assets/products/${product.slug}.webp`;
    const [sellhubName, sellhubUrl] = SELLHUB_NAMES[product.slug] || [product.name, product.slug];
    const body = {
      name: sellhubName,
      hidden: false,
      isFeatured: false,
      capStock: false,
      payWhatYouWantEnabled: false,
      liveStats: false,
      liveStatsDuration: { unit: "days", duration: 7 },
      variants,
      description: description(page),
      shortDescription: clip(stripHtml(page.card), 255),
      displayedStatus: "Undetected",
      images: [image],
      imageAspectRatio: 16 / 9,
      url: sellhubUrl,
      metadata: { title: page.title, description: clip(page.metaDescription, 255), image: `${SITE}/assets/og/${product.slug}.png` },
      upsoldProducts: [],
    };

    const plans = product.fallback.map((p) => `${p.name} $${p.price}`).join(", ");
    if (!CREATE) { console.log(`would create ${product.slug} (${plans})`); continue; }
    const res = await api("/products", { method: "POST", body: JSON.stringify(body) });
    console.log(`created ${product.slug} -> ${res?.productId || "ok"} (${plans})`);
    if (res?.productId) await restock({ id: res.productId }, page);
  }
  if (!CREATE) console.log("\nDry run. Re-run with --create to apply.");
}

async function restock(sellhubProduct, page) {
  const res = await api(`/products/variants?productId=${encodeURIComponent(sellhubProduct.id)}`);
  for (const v of res?.data?.variants ?? res?.variants ?? []) {
    if (RESET && Number(v.stock) > 0) {
      if (!CREATE) console.log(`would clear ${v.stock} from ${page.slug} / ${v.name}`);
      else await api(`/products/variants/${encodeURIComponent(v.id)}/stock/remove/all`, { method: "DELETE" });
    }
    const missing = STOCK - (RESET ? 0 : Number(v.stock) || 0);
    if (missing <= 0) { console.log(`stocked ${page.slug} / ${v.name} (${v.stock})`); continue; }
    if (!CREATE) { console.log(`would add ${missing} to ${page.slug} / ${v.name}`); continue; }
    await api(`/products/variants/${encodeURIComponent(v.id)}/stock/add`, {
      method: "POST",
      body: JSON.stringify({ serials: stockKeys(page.name, v.name, missing) }),
    });
    console.log(`added ${missing} to ${page.slug} / ${v.name}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

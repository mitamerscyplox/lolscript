/**
 * Order history for a signed-in customer, read from Sellhub's customer record.
 * Every payment path (card, crypto, Shopier, gift card) ends as a Sellhub invoice, so this is the full history.
 */

import { getConfig, getInvoice, invoiceKeys, sellhubAuthHeaders } from "./sellhub-core.mjs";

const PRODUCT_PAGES = [
  ["lol-vanguard-emulator", /vanguard|emulator/i],
  ["lol-perm-spoofer", /spoofer/i],
  ["lol-script", /script/i],
];

function pageSlug(name) {
  return PRODUCT_PAGES.find(([, re]) => re.test(name || ""))?.[0] || null;
}

/** Raw Sellhub invoices for one exact email (the API filter also matches look-alike addresses). */
export async function fetchCustomerInvoices(email) {
  const target = email.trim().toLowerCase();
  const { apiUrl, token } = getConfig();
  if (!token) return { invoices: [], error: "not_configured" };
  try {
    const res = await fetch(`${apiUrl}/customers?email=${encodeURIComponent(target)}`, {
      headers: sellhubAuthHeaders(token),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { invoices: [], error: `sellhub_${res.status}` };
    const data = await res.json().catch(() => null);
    return {
      invoices: (data?.data?.customers || [])
        .filter((c) => (c.email || "").trim().toLowerCase() === target)
        .flatMap((c) => c.invoices || []),
    };
  } catch {
    return { invoices: [], error: "sellhub_unreachable" };
  }
}

function mapStatus(raw) {
  const s = String(raw || "").toLowerCase();
  if (s === "completed") return "completed";
  if (["pending", "processing", "partially_paid", "partiallypaid"].includes(s)) return "pending";
  if (["expired", "cancelled", "canceled"].includes(s)) return "expired";
  if (s === "disputed") return "disputed";
  if (s === "refunded") return "refunded";
  return "other";
}

const keysOf = (raw) => invoiceKeys({ invoiceItems: [{ activationKey: raw }] });

function mapInvoice(inv) {
  if (!inv.id) return null;
  const status = mapStatus(inv.status);
  return {
    id: inv.id,
    status,
    createdAt: inv.createdAt || "",
    totalUsd: Number(inv.totalInUsd) || 0,
    paymentMethod: inv.paymentMethod || "",
    items: (inv.invoiceItems || []).map((item) => {
      const product = item.productVariant?.product;
      const name = product?.name || item.productVariant?.name || "";
      const slug = pageSlug(name);
      return {
        name,
        variant: item.productVariant?.name || "",
        quantity: Math.max(1, Number(item.quantity) || 1),
        image: slug ? `/assets/products/${slug}.webp` : product?.images?.find((src) => typeof src === "string" && src.startsWith("https://")) || null,
        slug,
        keys: status === "completed" ? keysOf(item.activationKey) : [],
      };
    }),
  };
}

/** The customer listing can lag behind delivery; the single-invoice endpoint carries the keys as soon as they exist. */
async function fillMissingKeys(orders) {
  const missing = orders.filter((o) => o.status === "completed" && o.items.every((i) => i.keys.length === 0)).slice(0, 10);
  await Promise.all(
    missing.map(async (order) => {
      const { invoice } = await getInvoice(order.id).catch(() => ({ invoice: null }));
      (invoice?.invoiceItems || []).forEach((raw, idx) => {
        const target = order.items[idx] ?? order.items[0];
        if (target) target.keys.push(...keysOf(raw.activationKey));
      });
    })
  );
}

const CACHE_MS = 30_000;
const cache = new Map();

/** The email must already be verified by the caller — this returns license keys. */
export async function getOrdersForEmail(email, fresh = false) {
  const target = email.trim().toLowerCase();
  const hit = cache.get(target);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return { orders: hit.orders };

  const { invoices, error } = await fetchCustomerInvoices(target);
  if (error) return { orders: [], error };
  const orders = invoices
    .map(mapInvoice)
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await fillMissingKeys(orders);
  cache.set(target, { at: Date.now(), orders });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return { orders };
}

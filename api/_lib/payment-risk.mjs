/**
 * Chargeback guard: an email with a disputed Sellhub order (or listed in PAYMENT_BLOCKLIST) may not pay
 * with reversible methods (Sellhub card/crypto checkout, automatic Shopier delivery).
 * Binance gift cards are irreversible and stay allowed.
 */

import { fetchCustomerInvoices } from "./account-orders.mjs";
import { kvGet, kvSet } from "./kv-store.mjs";

const DISPUTE_STATUSES = new Set(["disputed", "dispute", "chargeback", "charged_back", "chargedback"]);
const CACHE_SEC = 10 * 60;

/** Collapses the usual aliases (+tags, Gmail dots) so one person can't dodge the guard with a variant. */
export function canonicalEmail(email) {
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@");
  let base = local.split("+")[0];
  let host = domain;
  if (host === "googlemail.com") host = "gmail.com";
  if (host === "gmail.com") base = base.replace(/\./g, "");
  return `${base}@${host}`;
}

function blocklisted(email) {
  const entries = (process.env.PAYMENT_BLOCKLIST || "")
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!entries.length) return false;
  const canonical = canonicalEmail(email);
  const domain = canonical.split("@")[1];
  return entries.some((entry) => (entry.startsWith("@") ? entry.slice(1) === domain : canonicalEmail(entry) === canonical));
}

/** Fails open: if Sellhub can't be reached the payment goes through rather than losing a sale. */
async function hasDispute(email) {
  const cacheKey = `ls:risk:dispute:${email}`;
  const cached = await kvGet(cacheKey).catch(() => null);
  if (cached != null) return cached === "1";
  const { invoices, error } = await fetchCustomerInvoices(email);
  if (error) return false;
  const disputed = invoices.some((inv) => DISPUTE_STATUSES.has(String(inv.status || "").toLowerCase()));
  await kvSet(cacheKey, disputed ? "1" : "0", CACHE_SEC).catch(() => {});
  return disputed;
}

export async function paymentRisk(rawEmail) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email) return { blocked: false };
  if (blocklisted(email)) return { blocked: true, reason: "blocklist" };
  const candidates = [...new Set([email, canonicalEmail(email)])];
  const results = await Promise.all(candidates.map(hasDispute));
  return results.some(Boolean) ? { blocked: true, reason: "dispute" } : { blocked: false };
}

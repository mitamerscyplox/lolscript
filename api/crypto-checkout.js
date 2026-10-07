import QRCode from "qrcode";
import { clientIp, EMAIL_RE, hash, readBody, readToken, signToken, throttle } from "./_lib/http.mjs";
import { kvSetNx } from "./_lib/kv-store.mjs";
import { PAY_LOG_COLORS, postPayLog } from "./_lib/pay-log.mjs";
import { paymentRisk } from "./_lib/payment-risk.mjs";
import { createPendingInvoice, findLiveVariant, getInvoice, invoiceKeys, isPaidInvoiceStatus } from "./_lib/sellhub-core.mjs";

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;
const COIN_NAMES = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  LTC: "Litecoin",
  TRX: "Tron",
  BCH: "Bitcoin Cash",
  SOL: "Solana",
  USDT: "Tether",
  USDC: "USD Coin",
  XMR: "Monero",
  DOGE: "Dogecoin",
  BNB: "BNB",
};
const ENDED = ["expired", "cancelled", "canceled", "void", "voided", "refunded"];

function method() {
  return process.env.SELLHUB_CRYPTO_METHOD?.trim() || "cryptoCurrency";
}

function siteUrl() {
  return (process.env.SITE_URL || "https://www.lolscript.store").replace(/\/+$/, "");
}

/** Sellhub lists each coin as "<SYMBOL> Address" / "<SYMBOL> Amount" in displayedPaymentInfo. */
async function coinsFromInvoice(invoice) {
  const info = invoice?.displayedPaymentInfo || {};
  const coins = [];
  for (const [key, address] of Object.entries(info)) {
    const symbol = key.match(/^(.+?)\s+Address$/i)?.[1]?.trim();
    const amount = symbol ? info[`${symbol} Amount`] : null;
    if (!symbol || typeof address !== "string" || !address.trim() || amount == null) continue;
    const qr = await QRCode.toString(address.trim(), { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    coins.push({
      symbol,
      name: COIN_NAMES[symbol.toUpperCase().split(/[\s(_-]/)[0]] || symbol,
      address: address.trim(),
      amount: String(amount),
      qr,
    });
  }
  return coins;
}

async function handleCreate(req, res, body) {
  const email = String(body?.email || "").trim().toLowerCase();
  const productId = String(body?.productId || "");
  const variantId = String(body?.variantId || "");
  const coupon = String(body?.coupon || "").trim().toUpperCase().slice(0, 40);

  if (body?.acceptedTerms !== true) {
    return res.status(400).json({ error: "You must accept the Terms of Service before checkout.", field: "terms" });
  }
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid email address.", field: "email" });
  if (!productId || !variantId) return res.status(400).json({ error: "Please choose a product plan." });

  const wait = await throttle("crypto", hash(clientIp(req)), 8, 600);
  if (wait) {
    return res.status(429).json({ error: `Too many orders opened. Please wait ${Math.ceil(wait / 60)} minutes and try again.` });
  }

  const risk = await paymentRisk(email);
  if (risk.blocked) {
    console.warn("[crypto] blocked by payment risk guard", risk.reason);
    return res
      .status(403)
      .json({ error: "This email cannot pay by card or crypto. Please contact support.", reason: "payment_blocked" });
  }

  const live = await findLiveVariant(productId, variantId).catch(() => null);
  if (!live) return res.status(400).json({ error: "This product plan is not available right now." });
  if (Number(live.variant.stock) <= 0) {
    return res.status(409).json({ error: "This plan is out of stock right now. Please choose another plan." });
  }

  const label = `${live.product.name} — ${live.variant.name}`;
  const pending = await createPendingInvoice(
    {
      email,
      coupon,
      returnUrl: `${siteUrl()}/?checkout=success`,
      items: [{ productId, variantId, variantName: live.variant.name, variantPrice: live.variant.price, quantity: 1 }],
    },
    method()
  );
  if (pending.error || !pending.invoiceId) {
    if (coupon && /coupon|discount|code/i.test(pending.error || "")) {
      return res.status(400).json({ error: `The discount code ${coupon} is not valid.`, field: "coupon" });
    }
    await postPayLog({
      title: "Crypto checkout failed (Sellhub)",
      color: PAY_LOG_COLORS.warning,
      source: "Crypto",
      fields: [["Product", label], ["Email", email], ["Sellhub error", pending.error]],
    });
    return res.status(502).json({ error: "Crypto checkout is temporarily unavailable. Please try another payment method." });
  }

  const { invoice } = await getInvoice(pending.invoiceId);
  const total = Number(invoice?.totalInUsd);
  const coins = await coinsFromInvoice(invoice);
  if (!Number.isFinite(total) || total <= 0 || !coins.length) {
    return res.status(502).json({ error: "Could not prepare the crypto payment. Please try again." });
  }
  if (coupon && total >= Number(live.variant.price) - 0.005) {
    return res.status(400).json({ error: `The discount code ${coupon} is not valid.`, field: "coupon" });
  }

  const token = signToken({ i: pending.invoiceId, e: email, n: label, t: total, x: Date.now() + TOKEN_TTL_MS });
  return res.status(200).json({ token, invoiceId: pending.invoiceId, total, product: label, coins });
}

async function handleStatus(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  const data = readToken(params.get("token"));
  if (!data?.i) return res.status(404).json({ error: "Order not found." });

  const { invoice, error } = await getInvoice(data.i);
  if (error || !invoice) return res.status(200).json({ status: "waiting" });
  const status = String(invoice.status || "").toLowerCase();

  if (isPaidInvoiceStatus(status)) {
    const keys = invoiceKeys(invoice);
    if (await kvSetNx(`ls:crypto:paid:${data.i}`, "1", 90 * 24 * 60 * 60)) {
      await postPayLog({
        title: "Crypto payment — delivered",
        color: PAY_LOG_COLORS.success,
        source: "Crypto",
        payment: { amount: `$${Number(data.t).toFixed(2)}` },
        fields: [
          ["Product", data.n],
          ["Email", data.e],
          ["Sellhub invoice", data.i],
          ["Keys delivered", keys.length || "sent by Sellhub email"],
        ],
      });
    }
    return res.status(200).json({ status: "delivered", invoiceId: data.i, keys });
  }
  if (ENDED.includes(status)) return res.status(200).json({ status: "expired", invoiceId: data.i });
  return res.status(200).json({ status: "waiting", invoiceId: data.i });
}

export default async function handler(req, res) {
  if (req.method === "GET") return handleStatus(req, res);
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid request." });
  }
  return handleCreate(req, res, body);
}

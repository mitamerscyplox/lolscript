import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import {
  CRYPTO_COINS,
  amountKey,
  binanceDepositsEnabled,
  depositAddress,
  isCredited,
  isIncoming,
  normalizeTxId,
  recentDeposits,
  reserveAmount,
  usdPrices,
} from "./_lib/binance-deposit.mjs";
import { clientIp, EMAIL_RE, hash, readBody, readToken, signToken, throttle } from "./_lib/http.mjs";
import { kvGet, kvSet, kvSetNx } from "./_lib/kv-store.mjs";
import { PAY_LOG_COLORS, postPayLog } from "./_lib/pay-log.mjs";
import { paymentRisk } from "./_lib/payment-risk.mjs";
import {
  completeInvoice,
  createPendingInvoice,
  findLiveVariant,
  getInvoice,
  invoiceKeys,
  isPaidInvoiceStatus,
} from "./_lib/sellhub-core.mjs";

const DAY = 24 * 60 * 60;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
/** How long a Binance order accepts deposits; slow coins (BTC) can take a while to confirm. */
const ORDER_WINDOW_MS = 3 * 60 * 60 * 1000;
/** Amounts stay reserved as long as deposits are visible in the history window, so nobody else can claim them. */
const RESERVATION_SECONDS = 9 * 60 * 60;
/** A TxID claim is only auto-approved within this many amount steps of the order's own amount (wallet rounding). */
const CLAIM_TOLERANCE_STEPS = 10;
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

function sellhubCryptoMethod() {
  return process.env.SELLHUB_CRYPTO_METHOD?.trim() || "cryptoCurrency";
}

/** Invoice method Sellhub leaves pending until we complete it ourselves (same as gift cards). */
function manualMethod() {
  return process.env.SELLHUB_GIFTCARD_METHOD?.trim() || "customerBalance";
}

function siteUrl() {
  return (process.env.SITE_URL || "https://www.lolscript.store").replace(/\/+$/, "");
}

const qrSvg = (text) => QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

function validateOrder(body) {
  const email = String(body?.email || "").trim().toLowerCase();
  const productId = String(body?.productId || "");
  const variantId = String(body?.variantId || "");
  const coupon = String(body?.coupon || "").trim().toUpperCase().slice(0, 40);
  if (body?.acceptedTerms !== true) {
    return { error: { status: 400, body: { error: "You must accept the Terms of Service before checkout.", field: "terms" } } };
  }
  if (!EMAIL_RE.test(email)) return { error: { status: 400, body: { error: "Please enter a valid email address.", field: "email" } } };
  if (!productId || !variantId) return { error: { status: 400, body: { error: "Please choose a product plan." } } };
  return { email, productId, variantId, coupon };
}

/** Shared checks for both providers; returns the live variant or sends an error response. */
async function prepareOrder(req, res, order) {
  const wait = await throttle("crypto", hash(clientIp(req)), 8, 600);
  if (wait) {
    res.status(429).json({ error: `Too many orders opened. Please wait ${Math.ceil(wait / 60)} minutes and try again.` });
    return null;
  }
  const risk = await paymentRisk(order.email);
  if (risk.blocked) {
    console.warn("[crypto] blocked by payment risk guard", risk.reason);
    res.status(403).json({ error: "This email cannot pay by card or crypto. Please contact support.", reason: "payment_blocked" });
    return null;
  }
  const live = await findLiveVariant(order.productId, order.variantId).catch(() => null);
  if (!live) {
    res.status(400).json({ error: "This product plan is not available right now." });
    return null;
  }
  if (Number(live.variant.stock) <= 0) {
    res.status(409).json({ error: "This plan is out of stock right now. Please choose another plan." });
    return null;
  }
  return live;
}

async function openInvoice(res, order, live, method, source) {
  const label = `${live.product.name} — ${live.variant.name}`;
  const pending = await createPendingInvoice(
    {
      email: order.email,
      coupon: order.coupon,
      returnUrl: `${siteUrl()}/?checkout=success`,
      items: [{ productId: order.productId, variantId: order.variantId, variantName: live.variant.name, variantPrice: live.variant.price, quantity: 1 }],
    },
    method
  );
  if (pending.error || !pending.invoiceId) {
    if (order.coupon && /coupon|discount|code/i.test(pending.error || "")) {
      res.status(400).json({ error: `The discount code ${order.coupon} is not valid.`, field: "coupon" });
      return null;
    }
    await postPayLog({
      title: `Crypto checkout failed (${source})`,
      color: PAY_LOG_COLORS.warning,
      source: "Crypto",
      fields: [["Product", label], ["Email", order.email], ["Sellhub error", pending.error]],
    });
    res.status(502).json({ error: "Crypto checkout is temporarily unavailable. Please try another payment method." });
    return null;
  }
  const { invoice } = await getInvoice(pending.invoiceId);
  const total = Number(invoice?.totalInUsd);
  if (!Number.isFinite(total) || total <= 0) {
    res.status(502).json({ error: "Could not prepare the crypto payment. Please try again." });
    return null;
  }
  if (order.coupon && total >= Number(live.variant.price) - 0.005) {
    res.status(400).json({ error: `The discount code ${order.coupon} is not valid.`, field: "coupon" });
    return null;
  }
  return { invoice, invoiceId: pending.invoiceId, total, label };
}

/* ---------------------------------------------------------------- Binance deposits */

const orderKey = (id) => `ls:cpay:order:${id}`;

async function loadOrder(id) {
  const raw = await kvGet(orderKey(id));
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

/** Raises a Discord alert at most every 30 minutes for the same problem. */
async function alertOnce(kind, title, fields) {
  if (!(await kvSetNx(`ls:cpay:alert:${kind}`, "1", 30 * 60))) return;
  await postPayLog({ title, color: PAY_LOG_COLORS.urgent, alert: true, source: "Crypto", fields });
}

async function binanceCreate(req, res, order) {
  const emailWait = await throttle("crypto-email", hash(order.email), 4, 3600);
  if (emailWait) {
    return res.status(429).json({ error: "Too many crypto orders for this email. Finish an open payment or try again later." });
  }
  const live = await prepareOrder(req, res, order);
  if (!live) return;

  const addresses = await Promise.all(CRYPTO_COINS.map((coin) => depositAddress(coin)));
  const coins = CRYPTO_COINS.map((coin, i) => ({ coin, address: addresses[i] })).filter((c) => typeof c.address === "string");
  if (!coins.length) {
    await alertOnce("address", "Crypto checkout down — Binance deposit addresses unavailable", [
      ["Action", "Check BINANCE_API_KEY permissions and that api/binance-relay.js runs outside the US (vercel.json regions)"],
    ]);
    return res.status(503).json({ error: "Crypto checkout is temporarily unavailable. Please try another payment method." });
  }

  const opened = await openInvoice(res, order, live, manualMethod(), "Binance");
  if (!opened) return;

  let prices = {};
  try {
    prices = await usdPrices();
  } catch (error) {
    console.warn("[crypto] price feed failed", error);
  }

  const id = randomBytes(12).toString("hex");
  const reserved = await Promise.all(
    coins.map(async ({ coin, address }) => {
      const price = coin.stable ? 1 : prices[coin.coin];
      if (!(price > 0)) return null;
      const amount = await reserveAmount(coin, opened.total / price, id, RESERVATION_SECONDS);
      return amount ? { id: coin.id, address, amount, base: opened.total / price } : null;
    })
  );
  const offered = reserved.filter(Boolean);
  if (!offered.length) {
    return res.status(503).json({ error: "Crypto checkout is busy right now. Please try again in a minute." });
  }

  const record = {
    id,
    invoiceId: opened.invoiceId,
    email: order.email,
    label: opened.label,
    total: opened.total,
    coupon: order.coupon,
    createdAt: Date.now(),
    coins: offered,
  };
  await kvSet(orderKey(id), JSON.stringify(record), 3 * DAY);

  await postPayLog({
    title: "Crypto checkout started",
    color: PAY_LOG_COLORS.info,
    source: "Crypto",
    fields: [
      ["Product", opened.label],
      ["Email", order.email],
      ["Total", `$${opened.total.toFixed(2)}`],
      ["Coupon", order.coupon || "-"],
      ["Invoice", opened.invoiceId],
    ],
  });

  const byId = Object.fromEntries(CRYPTO_COINS.map((c) => [c.id, c]));
  const publicCoins = await Promise.all(
    offered.map(async (o) => {
      const coin = byId[o.id];
      return {
        symbol: o.id,
        ticker: coin.ticker,
        name: coin.name,
        network: coin.networkName,
        address: o.address,
        amount: o.amount,
        qr: await qrSvg(o.address),
      };
    })
  );
  const token = signToken({ o: id, x: Date.now() + TOKEN_TTL_MS });
  return res.status(200).json({
    token,
    invoiceId: opened.invoiceId,
    total: opened.total,
    product: opened.label,
    coins: publicCoins,
    expiresAt: record.createdAt + ORDER_WINDOW_MS,
  });
}

function matchesCoin(deposit, coin) {
  return deposit.coin === coin.coin && deposit.network === coin.network;
}

function inWindow(order, deposit) {
  return deposit.insertTime >= order.createdAt - 2 * 60 * 1000 && deposit.insertTime <= order.createdAt + ORDER_WINDOW_MS;
}

async function deliveredResponse(order) {
  const { invoice } = await getInvoice(order.invoiceId);
  const status = String(invoice?.status || "").toLowerCase();
  if (isPaidInvoiceStatus(status)) {
    return { status: "delivered", invoiceId: order.invoiceId, keys: invoiceKeys(invoice) };
  }
  return {
    status: "processing",
    invoiceId: order.invoiceId,
    message: "Payment received. Delivery is being finalised, your key will arrive by email shortly.",
  };
}

/** Marks the order paid by `deposit` and completes the Sellhub invoice exactly once. */
async function settle(order, deposit, coin, how) {
  const txKey = `ls:cpay:tx:${normalizeTxId(deposit.txId) || deposit.id}`;
  if (!(await kvSetNx(txKey, order.id, 90 * DAY))) {
    if ((await kvGet(txKey)) !== order.id) return null;
  }
  const doneKey = `ls:cpay:done:${order.id}`;
  if (!(await kvSetNx(doneKey, deposit.txId || deposit.id, 90 * DAY))) return deliveredResponse(order);

  const payment = { amount: `${deposit.amount} ${coin.ticker}` };
  const fields = [
    ["Product", order.label],
    ["Email", order.email],
    ["Paid", `${deposit.amount} ${coin.ticker} (${coin.networkName})`],
    ["Order total", `$${Number(order.total).toFixed(2)}`],
    ["Matched by", how],
    ["TxID", deposit.txId || "-"],
    ["Sellhub invoice", order.invoiceId],
  ];
  const completed = await completeInvoice(order.invoiceId);
  if (completed.error) {
    await postPayLog({
      title: "Crypto PAID but Sellhub delivery failed — complete invoice manually",
      color: PAY_LOG_COLORS.urgent,
      alert: true,
      source: "Crypto",
      payment,
      fields: [...fields, ["Sellhub error", completed.error]],
    });
    return {
      status: "processing",
      invoiceId: order.invoiceId,
      message: "Payment received. Delivery is being finalised by staff, your key will arrive by email shortly.",
    };
  }
  const result = await deliveredResponse(order);
  await postPayLog({
    title: "Crypto payment — delivered",
    color: PAY_LOG_COLORS.success,
    source: "Crypto",
    payment,
    fields: [...fields, ["Keys delivered", result.keys?.length || "sent by Sellhub email"]],
  });
  return result;
}

async function binanceStatus(res, order) {
  if (await kvGet(`ls:cpay:done:${order.id}`)) return res.status(200).json(await deliveredResponse(order));

  const history = await recentDeposits();
  if (history.error) {
    await alertOnce("history", "Crypto payments not being checked — Binance deposit history unavailable", [
      ["Binance error", history.error],
      ["Restricted location", history.restricted ? "yes (function runs in a region Binance blocks)" : "no"],
    ]);
    return res.status(200).json({ status: "waiting", invoiceId: order.invoiceId });
  }

  const byId = Object.fromEntries(CRYPTO_COINS.map((c) => [c.id, c]));
  let incoming = null;
  for (const offer of order.coins) {
    const coin = byId[offer.id];
    if (!coin) continue;
    for (const deposit of history.deposits) {
      if (!matchesCoin(deposit, coin) || !inWindow(order, deposit)) continue;
      if (Number(deposit.amount).toFixed(coin.decimals) !== offer.amount) continue;
      if (isCredited(deposit)) {
        const result = await settle(order, deposit, coin, "exact amount");
        if (result) return res.status(200).json(result);
      } else if (isIncoming(deposit)) {
        incoming = { amount: deposit.amount, ticker: coin.ticker };
      }
    }
  }
  if (incoming) {
    return res.status(200).json({ status: "confirming", invoiceId: order.invoiceId, detected: `${incoming.amount} ${incoming.ticker}` });
  }
  if (Date.now() > order.createdAt + ORDER_WINDOW_MS) return res.status(200).json({ status: "expired", invoiceId: order.invoiceId });
  return res.status(200).json({ status: "waiting", invoiceId: order.invoiceId });
}

/** "I paid but it was not detected": match by transaction id, e.g. when a wallet rounded the amount. */
async function binanceClaim(req, res, order, body) {
  const wait = await throttle("crypto-claim", hash(clientIp(req)), 10, 600);
  if (wait) return res.status(429).json({ error: `Too many attempts. Please wait ${Math.ceil(wait / 60)} minutes.` });
  if (await kvGet(`ls:cpay:done:${order.id}`)) return res.status(200).json(await deliveredResponse(order));

  const txId = normalizeTxId(body?.txId);
  if (txId.length < 16 || txId.length > 128 || !/^[a-z0-9]+$/i.test(txId)) {
    return res.status(400).json({ error: "That does not look like a transaction ID (TxID / hash). Copy it from your wallet." });
  }
  const history = await recentDeposits();
  if (history.error) return res.status(503).json({ error: "Could not check payments right now. Please try again in a minute." });

  const deposit = history.deposits.find((d) => normalizeTxId(d.txId) === txId);
  if (!deposit) {
    return res.status(404).json({
      error: "We have not received this transaction yet. Wait until your wallet shows it as confirmed, then try again.",
    });
  }
  const byId = Object.fromEntries(CRYPTO_COINS.map((c) => [c.id, c]));
  const offer = order.coins.find((o) => byId[o.id] && matchesCoin(deposit, byId[o.id]));
  if (!offer) return res.status(400).json({ error: "This transaction is for a different coin or network than this order." });
  const coin = byId[offer.id];
  if (!inWindow(order, deposit)) return res.status(400).json({ error: "This transaction was made before or long after this order was opened." });
  if (await kvGet(`ls:cpay:tx:${normalizeTxId(deposit.txId) || deposit.id}`)) {
    return res.status(409).json({ error: "This transaction was already used for an order." });
  }

  // The deposit address is public, so a TxID proves nothing about who paid. Auto-approve only a
  // deposit that is within wallet-rounding distance of this order's amount and of no other order's.
  const step = 10 ** -coin.decimals;
  const paid = Number(deposit.amount);
  const near = Math.abs(paid - Number(offer.amount)) <= CLAIM_TOLERANCE_STEPS * step + step / 2;
  const others = near ? await otherReservationsNear(coin, paid, order.id) : 0;

  if (near && others === 0) {
    if (!isCredited(deposit)) {
      return res.status(200).json({ status: "confirming", invoiceId: order.invoiceId, detected: `${deposit.amount} ${coin.ticker}` });
    }
    const result = await settle(order, deposit, coin, "transaction ID (rounded amount)");
    if (!result) return res.status(409).json({ error: "This transaction was already used for another order." });
    return res.status(200).json(result);
  }

  const underpaid = paid < Number(offer.base) * 0.995;
  if (await kvSetNx(`ls:cpay:review:${normalizeTxId(deposit.txId) || deposit.id}`, order.id, 7 * DAY)) {
    await postPayLog({
      title: underpaid ? "Crypto UNDERPAID claim — check manually" : "Crypto claim needs manual review",
      color: PAY_LOG_COLORS.urgent,
      alert: true,
      source: "Crypto",
      fields: [
        ["Product", order.label],
        ["Email", order.email],
        ["Deposit", `${deposit.amount} ${coin.ticker} (${coin.networkName})`],
        ["Order amount", `${offer.amount} ${coin.ticker}`],
        ["Why", underpaid ? "Deposit is below the order total" : others ? "Amount is close to another open order" : "Amount does not match this order"],
        ["Binance status", isCredited(deposit) ? "credited" : "not credited yet"],
        ["TxID", deposit.txId],
        ["Sellhub invoice", order.invoiceId],
        ["Action", "If this customer really sent it, complete the invoice in Sellhub"],
      ],
    });
  }
  return res.status(202).json({
    status: "review",
    message: underpaid
      ? `This transaction is ${deposit.amount} ${coin.ticker}, but the order needs ${offer.amount} ${coin.ticker}. Staff have been notified, please open a ticket on Discord.`
      : "The amount does not match this order exactly, so staff will verify it. Please open a ticket on Discord with your transaction ID.",
  });
}

/** How many other orders hold a reserved amount within claim tolerance of `paid`. */
async function otherReservationsNear(coin, paid, orderId) {
  const step = 10 ** -coin.decimals;
  const center = Math.round(paid / step);
  const owners = await Promise.all(
    Array.from({ length: CLAIM_TOLERANCE_STEPS * 2 + 1 }, (_, i) =>
      kvGet(amountKey(coin, ((center - CLAIM_TOLERANCE_STEPS + i) * step).toFixed(coin.decimals)))
    )
  );
  return owners.filter((owner) => owner && owner !== orderId).length;
}

/* ---------------------------------------------------------------- Sellhub crypto (fallback) */

/** Sellhub lists each coin as "<SYMBOL> Address" / "<SYMBOL> Amount" in displayedPaymentInfo. */
async function coinsFromInvoice(invoice) {
  const info = invoice?.displayedPaymentInfo || {};
  const coins = [];
  for (const [key, address] of Object.entries(info)) {
    const symbol = key.match(/^(.+?)\s+Address$/i)?.[1]?.trim();
    const amount = symbol ? info[`${symbol} Amount`] : null;
    if (!symbol || typeof address !== "string" || !address.trim() || amount == null) continue;
    coins.push({
      symbol,
      name: COIN_NAMES[symbol.toUpperCase().split(/[\s(_-]/)[0]] || symbol,
      address: address.trim(),
      amount: String(amount),
      qr: await qrSvg(address.trim()),
    });
  }
  return coins;
}

async function sellhubCreate(req, res, order) {
  const live = await prepareOrder(req, res, order);
  if (!live) return;
  const opened = await openInvoice(res, order, live, sellhubCryptoMethod(), "Sellhub");
  if (!opened) return;
  const coins = await coinsFromInvoice(opened.invoice);
  if (!coins.length) return res.status(502).json({ error: "Could not prepare the crypto payment. Please try again." });
  const token = signToken({ i: opened.invoiceId, e: order.email, n: opened.label, t: opened.total, x: Date.now() + TOKEN_TTL_MS });
  return res.status(200).json({ token, invoiceId: opened.invoiceId, total: opened.total, product: opened.label, coins });
}

async function sellhubStatus(res, data) {
  const { invoice, error } = await getInvoice(data.i);
  if (error || !invoice) return res.status(200).json({ status: "waiting" });
  const status = String(invoice.status || "").toLowerCase();

  if (isPaidInvoiceStatus(status)) {
    const keys = invoiceKeys(invoice);
    if (await kvSetNx(`ls:crypto:paid:${data.i}`, "1", 90 * DAY)) {
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

/* ---------------------------------------------------------------- handler */

async function handleStatus(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  const data = readToken(params.get("token"));
  if (data?.o) {
    const order = await loadOrder(data.o);
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (await throttle("crypto-status", hash(clientIp(req)), 40, 60)) {
      return res.status(200).json({ status: "waiting", invoiceId: order.invoiceId });
    }
    return binanceStatus(res, order);
  }
  if (!data?.i) return res.status(404).json({ error: "Order not found." });
  return sellhubStatus(res, data);
}

async function handlePost(req, res, body) {
  if (body?.action === "claim") {
    const data = readToken(body?.token);
    const order = data?.o ? await loadOrder(data.o) : null;
    if (!order) return res.status(404).json({ error: "Order not found. Please start the checkout again." });
    return binanceClaim(req, res, order, body);
  }
  const order = validateOrder(body);
  if (order.error) return res.status(order.error.status).json(order.error.body);
  return binanceDepositsEnabled() ? binanceCreate(req, res, order) : sellhubCreate(req, res, order);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      return await handleStatus(req, res);
    } catch (error) {
      console.error("[crypto] status failed", error);
      return res.status(200).json({ status: "waiting" });
    }
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid request." });
  }
  try {
    return await handlePost(req, res, body);
  } catch (error) {
    console.error("[crypto] request failed", error);
    if (res.headersSent) return;
    return res.status(502).json({ error: "Crypto checkout hit a temporary problem. Please try again in a moment." });
  }
}

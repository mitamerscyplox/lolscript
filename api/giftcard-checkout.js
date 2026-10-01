import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { binanceAccountId, binanceConfigured, maskCode, normalizeGiftCardCode, redeemGiftCard } from "./_lib/binance-giftcard.mjs";
import { kvDel, kvGet, kvIncr, kvSet, kvSetNx } from "./_lib/kv-store.mjs";
import { PAY_LOG_COLORS, postPayLog } from "./_lib/pay-log.mjs";
import { completeInvoice, createPendingInvoice, findLiveVariant, getInvoice } from "./_lib/sellhub-core.mjs";

const DAY = 24 * 60 * 60;
const QUOTE_TTL_MS = 60 * 60 * 1000;

function config() {
  return {
    // Sellhub needs a method name to open an invoice; customerBalance leaves it pending for us to complete.
    method: process.env.SELLHUB_GIFTCARD_METHOD?.trim() || "customerBalance",
    tokens: (process.env.GIFTCARD_ACCEPTED_TOKENS || "USDT")
      .split(/[,\s]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean),
    failLimit: 3,
    blockSeconds: 300,
    failWindowSeconds: 3600,
    payPerWindow: 12,
    quotePerWindow: 15,
    windowSeconds: 600,
    binanceCooldown: 90,
  };
}

const binanceCooldownKey = () => `gc:binance:${binanceAccountId()}:cooldown`;

/** Counts a request for this IP; returns seconds to wait when the window budget is used up. */
async function throttle(kind, ipKey, limit, windowSeconds) {
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const count = await kvIncr(`gc:rate:${kind}:${ipKey}:${bucket}`, windowSeconds + 5);
  if (count <= limit) return 0;
  return windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);
}

async function binanceCooldownLeft() {
  const until = Number(await kvGet(binanceCooldownKey())) || 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

async function tripBinanceCooldown(cfg, redeem) {
  const seconds = Math.max(redeem.retryAfter || 0, cfg.binanceCooldown * (redeem.banned ? 3 : 1));
  await kvSet(binanceCooldownKey(), Date.now() + seconds * 1000, seconds + 5);
  return seconds;
}

/** Keeps signed Binance calls at least ~1s apart across all serverless instances. */
async function waitBinanceSlot() {
  for (let i = 0; i < 4; i++) {
    if (await kvSetNx(`gc:binance:${binanceAccountId()}:slot`, "1", 1)) return true;
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return false;
}

function waitText(seconds) {
  if (seconds >= 90) return `${Math.ceil(seconds / 60)} minutes`;
  return seconds === 1 ? "1 second" : `${seconds} seconds`;
}

function isEnabled() {
  const flag = (process.env.GIFTCARD_ENABLED || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(flag) && binanceConfigured();
}

async function readBody(req) {
  if (req.body != null) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function clientIp(req) {
  const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.headers?.["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 32);
}

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

function quoteSecret() {
  const explicit = process.env.GIFTCARD_QUOTE_SECRET?.trim();
  return explicit || createHash("sha256").update(`lolscript-quote:${process.env.BINANCE_API_SECRET || ""}`).digest("hex");
}

function signQuote(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", quoteSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readQuote(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", quoteSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const quote = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return quote?.i && quote.x > Date.now() ? quote : null;
  } catch {
    return null;
  }
}

function failKeys(ipKey, emailKey) {
  return {
    ip: `gc:fail:ip:${ipKey}`,
    email: `gc:fail:email:${emailKey}`,
    blockIp: `gc:block:ip:${ipKey}`,
    blockEmail: `gc:block:email:${emailKey}`,
  };
}

/** After `failLimit` failed codes the customer waits `blockSeconds`, then gets a fresh set of attempts. */
async function recordFailure(cfg, ipKey, emailKey) {
  const keys = failKeys(ipKey, emailKey);
  const [ip, email] = await Promise.all([
    kvIncr(keys.ip, cfg.failWindowSeconds),
    kvIncr(keys.email, cfg.failWindowSeconds),
  ]);
  const used = Math.max(ip, email);
  if (used < cfg.failLimit) return { attemptsLeft: cfg.failLimit - used, blockedFor: 0 };

  const until = Date.now() + cfg.blockSeconds * 1000;
  await Promise.all([
    kvSet(keys.blockIp, until, cfg.blockSeconds + 2),
    kvSet(keys.blockEmail, until, cfg.blockSeconds + 2),
    kvDel(keys.ip),
    kvDel(keys.email),
  ]);
  return { attemptsLeft: 0, blockedFor: cfg.blockSeconds };
}

async function resetFailures(ipKey, emailKey) {
  const keys = failKeys(ipKey, emailKey);
  await Promise.all([kvDel(keys.ip), kvDel(keys.email)]);
}

/** Returns { error, retryAfter } when the customer is currently blocked. */
async function limitError(cfg, ipKey, emailKey) {
  const keys = failKeys(ipKey, emailKey);
  const [blockIp, blockEmail] = await Promise.all([kvGet(keys.blockIp), kvGet(keys.blockEmail)]);
  const until = Math.max(Number(blockIp) || 0, Number(blockEmail) || 0);
  const retryAfter = Math.ceil((until - Date.now()) / 1000);
  if (retryAfter > 0) {
    return {
      error: `Too many failed gift card attempts. Try again in ${waitText(retryAfter)}.`,
      retryAfter,
    };
  }
  return null;
}

function invoiceKeys(invoice) {
  return (invoice?.invoiceItems || [])
    .flatMap((item) => (Array.isArray(item.activationKey) ? item.activationKey : [item.activationKey]))
    .map((key) => (key && typeof key === "object" ? key.key ?? key.value : key))
    .filter((key) => typeof key === "string" && key.trim())
    .map((key) => key.trim());
}

function isPaidStatus(status) {
  return ["completed", "complete", "paid", "delivered"].includes(status);
}

async function deliveredResponse(invoiceId, email) {
  const { invoice } = await getInvoice(invoiceId);
  const status = String(invoice?.status || "").toLowerCase();
  if (isPaidStatus(status)) {
    return {
      status: "delivered",
      invoiceId,
      keys: invoiceKeys(invoice),
      message: `Payment approved. Your key has also been sent to ${email}.`,
    };
  }
  return {
    status: "processing",
    invoiceId,
    message: "Payment received. Delivery is being finalised, your key will arrive by email shortly.",
  };
}

async function handleQuote(req, res, body, cfg) {
  const email = String(body?.email || "").trim().toLowerCase();
  const productId = String(body?.productId || "");
  const variantId = String(body?.variantId || "");
  const coupon = String(body?.coupon || "").trim().toUpperCase().slice(0, 40);

  if (body?.acceptedTerms !== true) {
    return res.status(400).json({ error: "You must accept the Terms of Service before checkout.", field: "terms" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address.", field: "email" });
  }
  if (!productId || !variantId) return res.status(400).json({ error: "Please choose a product plan." });

  const quoteWait = await throttle("quote", hash(clientIp(req)), cfg.quotePerWindow, cfg.windowSeconds);
  if (quoteWait) {
    return res.status(429).json({ error: `Too many requests. Please wait ${waitText(quoteWait)} and try again.` });
  }

  const blocked = await limitError(cfg, hash(clientIp(req)), hash(email));
  if (blocked) {
    await postPayLog({
      title: "Gift card checkout blocked — attempt limit reached",
      color: PAY_LOG_COLORS.warning,
      fields: [["Email", email], ["IP", clientIp(req)], ["Reason", blocked.error]],
    });
    return res.status(429).json({ error: blocked.error, retryAfter: blocked.retryAfter });
  }

  const live = await findLiveVariant(productId, variantId).catch(() => null);
  if (!live) return res.status(400).json({ error: "This product plan is not available right now." });
  if (Number(live.variant.stock) <= 0) {
    return res.status(409).json({ error: "This plan is out of stock right now. Please choose another plan." });
  }

  const siteUrl = (process.env.SITE_URL || "https://www.lolscript.store").replace(/\/+$/, "");
  const pending = await createPendingInvoice(
    {
      email,
      coupon,
      returnUrl: `${siteUrl}/?checkout=success`,
      items: [
        {
          productId,
          variantId,
          variantName: live.variant.name,
          variantPrice: live.variant.price,
          quantity: 1,
        },
      ],
    },
    cfg.method
  );
  if (pending.error) {
    if (coupon && /coupon|discount|code/i.test(pending.error)) {
      return res.status(400).json({ error: `The discount code ${coupon} is not valid.`, field: "coupon" });
    }
    await postPayLog({
      title: "Gift card quote failed (Sellhub)",
      color: PAY_LOG_COLORS.warning,
      fields: [["Product", `${live.product.name} — ${live.variant.name}`], ["Email", email], ["Sellhub error", pending.error]],
    });
    return res.status(502).json({ error: "Gift card checkout is temporarily unavailable. Please use Card / Crypto." });
  }

  const { invoice } = await getInvoice(pending.invoiceId);
  const total = Number(invoice?.totalInUsd);
  if (!Number.isFinite(total) || total <= 0) {
    return res.status(502).json({ error: "Could not confirm the order total. Please try again." });
  }
  // Sellhub silently ignores unknown or expired coupons, so an unchanged total means the code was not applied.
  if (coupon && total >= Number(live.variant.price) - 0.005) {
    await postPayLog({
      title: "Gift card coupon not applied",
      color: PAY_LOG_COLORS.warning,
      fields: [["Product", `${live.product.name} — ${live.variant.name}`], ["Email", email], ["Coupon", coupon], ["Invoice", pending.invoiceId]],
    });
    return res.status(400).json({ error: `The discount code ${coupon} is not valid.`, field: "coupon" });
  }

  const quote = signQuote({
    i: pending.invoiceId,
    t: total,
    e: email,
    p: productId,
    v: variantId,
    n: `${live.product.name} — ${live.variant.name}`,
    x: Date.now() + QUOTE_TTL_MS,
  });
  await postPayLog({
    title: "Gift card checkout started",
    color: PAY_LOG_COLORS.info,
    fields: [
      ["Product", `${live.product.name} — ${live.variant.name}`],
      ["Email", email],
      ["Amount", `${total.toFixed(2)} USDT`],
      ["Coupon", coupon || "-"],
      ["IP", clientIp(req)],
      ["Invoice", pending.invoiceId],
    ],
  });
  return res.status(200).json({ quote, total, token: cfg.tokens[0] || "USDT" });
}

async function handlePay(req, res, body, cfg) {
  const quote = readQuote(body?.quote);
  if (!quote) {
    return res.status(409).json({ error: "Your order session expired.", code: "quote_expired" });
  }
  const email = quote.e;
  const invoiceId = quote.i;
  const total = Number(quote.t);
  const ip = clientIp(req);
  const code = normalizeGiftCardCode(body?.code);
  const attemptFields = [
    ["Product", quote.n || "-"],
    ["Email", email],
    ["Code", `\`${maskCode(code || String(body?.code || "").trim())}\``],
    ["Amount", `${total.toFixed(2)} USDT`],
    ["IP", ip],
    ["Invoice", invoiceId],
  ];
  const logAttempt = (title, reason, color = PAY_LOG_COLORS.warning) =>
    postPayLog({ title, color, fields: [...attemptFields, ["Reason", reason]] });

  const payWait = await throttle("pay", hash(ip), cfg.payPerWindow, cfg.windowSeconds);
  if (payWait) {
    await logAttempt("Gift card attempt blocked — too many requests", `More than ${cfg.payPerWindow} attempts in ${waitText(cfg.windowSeconds)} from this IP`);
    return res.status(429).json({ error: `Too many attempts. Please wait ${waitText(payWait)} and try again. Your card was not used.` });
  }

  if (!code) {
    await logAttempt("Gift card attempt rejected — invalid code format", "Code format is not a Binance gift card code (not sent to Binance)");
    return res.status(400).json({ error: "That does not look like a Binance gift card code. Check it and try again." });
  }

  const ipKey = hash(ip);
  const emailKey = hash(email);
  const codeKey = hash(code);

  const paidInvoice = await kvGet(`gc:paid:${codeKey}`);
  if (paidInvoice) {
    if (paidInvoice === invoiceId) return res.status(200).json(await deliveredResponse(invoiceId, email));
    await logAttempt("Gift card attempt rejected — code already used here", `Code was already redeemed for invoice ${paidInvoice}`, PAY_LOG_COLORS.fail);
    return res.status(400).json({ error: "This gift card code has already been redeemed." });
  }

  const blocked = await limitError(cfg, ipKey, emailKey);
  if (blocked) {
    await logAttempt("Gift card attempt blocked — attempt limit reached", blocked.error);
    return res.status(429).json({ error: blocked.error, retryAfter: blocked.retryAfter });
  }

  const lockKey = `gc:lock:${codeKey}`;
  const invoiceLockKey = `gc:lock:inv:${invoiceId}`;
  if (!(await kvSetNx(lockKey, "1", 180))) {
    await logAttempt("Gift card attempt blocked — code already being processed", "Same code submitted again while in progress");
    return res.status(409).json({ error: "This gift card is already being processed. Please wait a moment." });
  }
  if (!(await kvSetNx(invoiceLockKey, "1", 180))) {
    await kvDel(lockKey);
    await logAttempt("Gift card attempt blocked — order already in progress", "Another code is being processed for this order");
    return res.status(409).json({ error: "A payment for this order is already in progress. Please wait a moment." });
  }
  const releaseLocks = () => Promise.all([kvDel(lockKey), kvDel(invoiceLockKey)]);

  const baseFields = [
    ["Product", quote.n || "-"],
    ["Email", email],
    ["Code", `\`${maskCode(code)}\``],
    ["IP", ip],
    ["Invoice", invoiceId],
  ];
  await postPayLog({
    title: "Gift card code submitted — verifying with Binance",
    color: PAY_LOG_COLORS.info,
    fields: [...baseFields, ["Amount", `${total.toFixed(2)} USDT`]],
  });

  const current = await getInvoice(invoiceId);
  const status = String(current.invoice?.status || "").toLowerCase();
  if (current.error || !current.invoice) {
    await releaseLocks();
    return res.status(503).json({ error: "Could not reach the store right now. Your card was not used, please try again." });
  }
  if (isPaidStatus(status)) {
    await releaseLocks();
    return res.status(409).json({
      error: "This order is already paid. Check your email for your key, or contact support on Discord.",
      code: "already_paid",
    });
  }
  if (status !== "pending" || Math.abs(Number(current.invoice.totalInUsd) - total) > 0.009) {
    await releaseLocks();
    return res.status(409).json({ error: "Your order session expired.", code: "quote_expired" });
  }

  const live = await findLiveVariant(quote.p, quote.v).catch(() => null);
  if (live && Number(live.variant.stock) <= 0) {
    await releaseLocks();
    return res.status(409).json({ error: "This plan just sold out. Your card was not used. Please choose another plan." });
  }

  const cooldown = await binanceCooldownLeft();
  if (cooldown || !(await waitBinanceSlot())) {
    await releaseLocks();
    const wait = cooldown || 5;
    await logAttempt("Gift card attempt paused — Binance cooldown active", `Cooldown ${waitText(wait)} left, code not sent to Binance`);
    return res.status(503).json({
      error: `Gift card verification is busy. Please try again in ${waitText(wait)}. Your card was not used.`,
    });
  }

  const redeem = await redeemGiftCard(code, emailKey);

  if (!redeem.ok) {
    if (redeem.inFlight) {
      await postPayLog({
        title: "Gift card UNCONFIRMED — Discord bot took the code but did not report back",
        color: PAY_LOG_COLORS.urgent,
        alert: true,
        fields: [...baseFields, ["Action", "Check the Binance funding wallet; if credited, complete the invoice manually"]],
      });
      return res.status(202).json({
        status: "processing",
        invoiceId,
        message: "Your code is still being verified. If your key does not arrive within a few minutes, contact us on Discord.",
      });
    }
    if (redeem.rateLimited) {
      const seconds = await tripBinanceCooldown(cfg, redeem);
      await postPayLog({
        title: redeem.banned ? "Binance IP BANNED temporarily (418) — gift cards paused" : "Binance rate limit hit (429) — gift cards paused",
        color: PAY_LOG_COLORS.urgent,
        alert: true,
        fields: [...baseFields, ["Paused for", waitText(seconds)], ["Binance message", redeem.message]],
      });
    }
    const counted = redeem.kind === "invalid" || redeem.kind === "used";
    const limit = counted
      ? await recordFailure(cfg, ipKey, emailKey)
      : null;
    if (redeem.kind === "used") await kvDel(invoiceLockKey);
    else await releaseLocks();
    const titles = {
      invalid: "Gift card FAILED — invalid code",
      used: "Gift card FAILED — code already redeemed",
      config: "Gift card FAILED — Binance API problem (check keys / IP whitelist)",
      unavailable: "Gift card FAILED — Binance not responding",
    };
    await postPayLog({
      title: titles[redeem.kind] || "Gift card FAILED",
      color: PAY_LOG_COLORS.fail,
      alert: redeem.kind === "config",
      fields: [
        ...baseFields,
        ["Reason", `${redeem.kind}: ${redeem.message}`],
        ["Binance region", redeem.region],
        [
          "Attempts",
          limit?.blockedFor
            ? `Limit reached — customer blocked for ${waitText(limit.blockedFor)}`
            : limit
              ? `${limit.attemptsLeft} left before ${waitText(cfg.blockSeconds)} block`
              : "not counted",
        ],
      ],
    });
    const messages = {
      invalid: "Invalid gift card code. Please check your code and try again.",
      used: "This gift card code has already been redeemed.",
      config: "Gift card checkout is temporarily unavailable. Your card was not used.",
      unavailable: "Binance is not responding right now. Your card was not used, please try again shortly.",
    };
    let error = messages[redeem.kind] || messages.invalid;
    if (limit?.blockedFor) {
      error += ` You have reached the maximum number of attempts. Please try again in ${waitText(limit.blockedFor)}.`;
    } else if (limit && limit.attemptsLeft < cfg.failLimit) {
      error += ` (${limit.attemptsLeft} attempt${limit.attemptsLeft === 1 ? "" : "s"} left before a temporary block.)`;
    }
    return res.status(counted ? 400 : 503).json({
      error,
      retryAfter: limit?.blockedFor || undefined,
    });
  }

  await Promise.all([
    resetFailures(ipKey, emailKey),
    kvSet(`gc:paid:${codeKey}`, invoiceId, 90 * DAY),
    kvSet(`gc:ref:${redeem.referenceNo || codeKey}`, invoiceId, 90 * DAY),
  ]);
  const paidFields = [
    ...baseFields,
    ["Card value", `${redeem.amount} ${redeem.token}`],
    ["Order total", money(total)],
    ["Binance ref", redeem.referenceNo],
  ];

  const payment = { amount: `${redeem.amount} ${redeem.token}` };
  const tokenOk = cfg.tokens.includes(redeem.token);
  if (!tokenOk || redeem.amount + 0.009 < total) {
    await postPayLog({
      title: "Gift card REDEEMED but not enough — manual action needed",
      color: PAY_LOG_COLORS.urgent,
      alert: true,
      payment,
      fields: [...paidFields, ["Problem", tokenOk ? "Card value is below the order total" : `Unsupported token ${redeem.token}`]],
    });
    return res.status(402).json({
      error: `Your card (${redeem.amount} ${redeem.token}) was redeemed, but the order total is ${money(total)}. ` +
        `Open a ticket on Discord with reference ${redeem.referenceNo || invoiceId} and staff will sort it out.`,
      reference: redeem.referenceNo || invoiceId,
      code: "underpaid",
    });
  }

  const completed = await completeInvoice(invoiceId);
  if (completed.error) {
    await postPayLog({
      title: "Gift card PAID but Sellhub delivery failed — complete invoice manually",
      color: PAY_LOG_COLORS.urgent,
      alert: true,
      payment,
      fields: [...paidFields, ["Sellhub error", completed.error]],
    });
    return res.status(200).json({
      status: "processing",
      invoiceId,
      message: "Payment received. Delivery is being finalised by staff, your key will arrive by email shortly.",
    });
  }

  const result = await deliveredResponse(invoiceId, email);
  await postPayLog({
    title: "Gift card payment — delivered",
    color: PAY_LOG_COLORS.success,
    payment,
    fields: [...paidFields, ["Keys delivered", result.keys?.length || "sent by Sellhub email"]],
  });
  return res.status(200).json(result);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ enabled: isEnabled(), tokens: config().tokens });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isEnabled()) {
    return res.status(503).json({ error: "Gift card payments are currently unavailable. Please use Card / Crypto." });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid request." });
  }

  const cfg = config();
  if (body?.action === "quote") return handleQuote(req, res, body, cfg);
  return handlePay(req, res, body, cfg);
}

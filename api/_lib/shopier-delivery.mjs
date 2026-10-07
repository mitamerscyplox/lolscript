/**
 * Delivers Shopier orders through Sellhub: each paid Shopier line item is mapped back to the
 * Sellhub variant with the same name and duration, then a Sellhub invoice is opened and
 * completed so Sellhub emails the key from stock.
 *
 * The Shopier account may also sell another store's products, so orders with no LoL line
 * items are ignored here and left to that store's webhook.
 */

import { sendManualDeliveryMail } from "./auth-mail.mjs";
import { kvSet, kvSetNx } from "./kv-store.mjs";
import { PAY_LOG_COLORS, postPayLog } from "./pay-log.mjs";
import { paymentRisk } from "./payment-risk.mjs";
import { completeInvoice, createPendingInvoice, getInvoice, invoiceKeys } from "./sellhub-core.mjs";
import { fulfillShopierOrder, getShopierOrder } from "./shopier.mjs";
import { findVariantForShopierLine, LOL_TITLE_RE } from "./shopier-catalog.mjs";
import { recordShopierResult } from "./shopier-watch.mjs";

const ORDER_TTL = 180 * 24 * 60 * 60;

function sellhubMethod() {
  return process.env.SELLHUB_SHOPIER_METHOD?.trim() || process.env.SELLHUB_GIFTCARD_METHOD?.trim() || "customerBalance";
}

function siteUrl() {
  return (process.env.SITE_URL || "https://www.lolscript.store").replace(/\/+$/, "");
}

async function log(title, color, fields, alert = false, paid) {
  if (alert) console.error(`[shopier] ${title}`);
  await postPayLog({ title, color, fields, alert, source: "Shopier", payment: paid ? { amount: paid } : undefined });
}

/** Sellhub attaches keys to the invoice shortly after completion, so retry briefly. */
async function deliveredKeys(invoiceId) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const keys = invoiceKeys((await getInvoice(invoiceId)).invoice);
    if (keys.length) return keys;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return [];
}

export async function deliverShopierOrder(webhookOrder) {
  const orderId = String(webhookOrder?.id || "").trim();
  if (!orderId) return;

  const record = await getShopierOrder(orderId);
  if (!record.order) {
    const lolOrder = (webhookOrder.lineItems || []).some((l) => LOL_TITLE_RE.test(l.title || ""));
    if (!lolOrder) return;
    await log("Shopier webhook could not be verified — check the order manually", PAY_LOG_COLORS.urgent, [
      ["Shopier order", orderId],
      ["Problem", `Shopier API lookup failed: ${record.error}`],
    ], true);
    return;
  }
  const order = record.order;
  if (order.paymentStatus !== "paid" || order.status === "fulfilled") return;

  const lines = order.lineItems || [];
  const matches = [];
  for (const line of lines) {
    matches.push(await findVariantForShopierLine(String(line.productId || ""), line.title));
  }
  const ours = matches.some(Boolean) || lines.some((l) => LOL_TITLE_RE.test(l.title || ""));
  if (!ours) return;

  const lockKey = `ls:shopier:order:${orderId}`;
  if (!(await kvSetNx(lockKey, "processing", ORDER_TTL))) return;

  const email = (order.shippingInfo?.email || order.billingInfo?.email || "").trim();
  const buyer = [order.shippingInfo?.firstName, order.shippingInfo?.lastName].filter(Boolean).join(" ");
  const currency = order.currency === "TRY" ? "TL" : order.currency;
  const paid = [order.totals?.total, currency].filter(Boolean).join(" ") || "Shopier";
  const lineTitles = lines.map((l) => `${l.title || l.productId}${(l.quantity || 1) > 1 ? ` ×${l.quantity}` : ""}`);
  const baseFields = [
    ["Shopier order", orderId],
    ["Buyer", buyer],
    ["Email", email],
    ["Paid", paid],
    ["Products", lineTitles.join("\n")],
  ];

  const manual = async (problem, extra = []) => {
    await kvSet(lockKey, `manual:${problem}`, ORDER_TTL);
    let mailed = false;
    if (email) {
      await recordShopierResult(email, { status: "manual", orderId, items: lineTitles, keys: [] });
      mailed = await sendManualDeliveryMail(email, { id: orderId, items: lineTitles }).catch(() => false);
    }
    await log("Shopier order PAID but not delivered — deliver manually", PAY_LOG_COLORS.urgent, [
      ...baseFields,
      ["Problem", problem],
      ...extra,
      ["Customer notified", mailed ? "yes — manual delivery email sent" : "no"],
    ], true, paid);
  };

  if (!email) return manual("Order has no buyer email");
  if (!lines.length) return manual("Order has no line items");

  const risk = await paymentRisk(email);
  if (risk.blocked) {
    return manual(
      risk.reason === "dispute"
        ? "Buyer email has a disputed / charged-back order — review before delivering"
        : "Buyer email is on PAYMENT_BLOCKLIST — review before delivering"
    );
  }

  const missing = lines.find((_, i) => !matches[i]);
  if (missing) {
    return manual(`No Sellhub product is linked to Shopier product ${missing.productId} (${missing.title || "untitled"})`);
  }
  const items = matches.map((m, i) => ({ ...m, quantity: Math.max(1, Number(lines[i].quantity) || 1) }));
  const itemFields = [["Sellhub items", items.map((i) => `${i.label} ×${i.quantity}`).join("\n")]];

  const pending = await createPendingInvoice(
    {
      email,
      returnUrl: `${siteUrl()}/?checkout=success`,
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        variantName: i.variantName,
        variantPrice: i.variantPrice,
        quantity: i.quantity,
      })),
    },
    sellhubMethod()
  );
  if (pending.error || !pending.invoiceId) return manual(`Sellhub invoice failed: ${pending.error}`, itemFields);

  const completed = await completeInvoice(pending.invoiceId);
  if (completed.error) {
    return manual(`Sellhub delivery failed: ${completed.error}`, [...itemFields, ["Sellhub invoice", pending.invoiceId]]);
  }
  await kvSet(lockKey, `delivered:${pending.invoiceId}`, ORDER_TTL);

  const keys = await deliveredKeys(pending.invoiceId);
  await recordShopierResult(email, { status: "delivered", orderId, items: items.map((i) => `${i.label} ×${i.quantity}`), keys });

  const fulfilled = await fulfillShopierOrder(orderId, `Product key delivered by email to ${email}.`);
  await log("Shopier payment — delivered", PAY_LOG_COLORS.success, [
    ...baseFields,
    ...itemFields,
    ["Sellhub invoice", pending.invoiceId],
    ["Keys delivered", keys.length || "sent by Sellhub email"],
    ["Shopier order closed", fulfilled.ok ? "yes" : `no — ${fulfilled.error}`],
  ], false, paid);
}

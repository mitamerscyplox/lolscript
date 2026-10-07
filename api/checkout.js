import { clientIp, EMAIL_RE, hash, readBody, throttle } from "./_lib/http.mjs";
import { paymentRisk } from "./_lib/payment-risk.mjs";
import { createCheckout, findLiveVariant } from "./_lib/sellhub-core.mjs";

const MAX_LINES = 10;
const MAX_QUANTITY = 10;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const wait = await throttle("checkout", hash(clientIp(req)), 15, 600);
    if (wait) return res.status(429).json({ error: "Too many checkout attempts. Please try again shortly.", retryAfter: wait });

    let body;
    try {
      body = await readBody(req);
    } catch {
      return res.status(400).json({ error: "Invalid request." });
    }
    const { items, coupon, acceptedTerms, method } = body || {};
    const email = String(body?.email || "").trim();

    if (acceptedTerms !== true) {
      return res.status(400).json({ error: "You must accept the Terms of Service before checkout." });
    }
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }
    if (items.length > MAX_LINES) {
      return res.status(400).json({ error: "Too many items in the cart." });
    }
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    // Names and prices always come from the live Sellhub catalog, never from the browser.
    const mapped = [];
    for (const item of items) {
      if (!item?.productId || !item?.variantId) {
        return res.status(400).json({ error: "Invalid product or variant" });
      }
      const live = await findLiveVariant(String(item.productId), String(item.variantId)).catch(() => null);
      if (!live) return res.status(400).json({ error: "This product plan is not available right now." });
      const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(item.quantity) || 1)));
      mapped.push({
        productId: live.product.id,
        variantId: live.variant.id,
        variantName: live.variant.name,
        variantPrice: Number(live.variant.price ?? 0),
        quantity,
      });
    }

    const risk = await paymentRisk(email);
    if (risk.blocked) {
      console.warn("[checkout] blocked by payment risk guard", risk.reason);
      return res
        .status(403)
        .json({ error: "This email cannot pay by card or crypto. Please contact support.", reason: "payment_blocked" });
    }

    const siteUrl = (process.env.SITE_URL || "https://www.lolscript.store").replace(/\/+$/, "");
    const result = await createCheckout({
      email,
      items: mapped,
      coupon: typeof coupon === "string" ? coupon.trim().slice(0, 40) : undefined,
      methodName: method === "card" ? process.env.SELLHUB_CARD_METHOD?.trim() || "cardToCrypto" : "",
      returnUrl: `${siteUrl}/?checkout=success`,
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(200).json({ url: result.url });
  } catch (error) {
    console.error("[checkout] failed", error);
    return res.status(500).json({ error: "Checkout failed. Please try again." });
  }
}

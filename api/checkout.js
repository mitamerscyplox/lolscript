import { createCheckout } from "./_lib/sellhub-core.mjs";

async function readBody(req) {
  if (req.body != null) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await readBody(req);
    const { email, items, coupon, returnUrl, acceptedTerms } = body || {};

    if (acceptedTerms !== true) {
      return res.status(400).json({ error: "You must accept the Terms of Service before checkout." });
    }
    if (!items?.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }
    if (!email?.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }

    const mapped = items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      variantName: item.variantName,
      variantPrice: Number(item.variantPrice ?? 0),
      quantity: item.quantity || 1,
    }));

    if (mapped.some((item) => !item.productId || !item.variantId)) {
      return res.status(400).json({ error: "Invalid product or variant" });
    }

    const origin = req.headers?.origin || "";
    const refererOrigin = (() => {
      try {
        const ref = req.headers?.referer;
        return ref ? new URL(ref).origin : "";
      } catch {
        return "";
      }
    })();
    const siteUrl = (process.env.SITE_URL || "https://www.lolscript.store").replace(/\/+$/, "");
    const baseOrigin = origin || refererOrigin || siteUrl;

    const result = await createCheckout({
      email: email.trim(),
      items: mapped,
      coupon,
      returnUrl: returnUrl || `${baseOrigin}/?checkout=success`,
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(200).json({ url: result.url });
  } catch (error) {
    return res.status(500).json({ error: String(error?.message || "Checkout failed") });
  }
}

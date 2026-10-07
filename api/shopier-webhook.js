import { waitUntil } from "@vercel/functions";
import { PAY_LOG_COLORS, postPayLog } from "./_lib/pay-log.mjs";
import { shopierDeliveryEnabled, verifyShopierSignature } from "./_lib/shopier.mjs";
import { deliverShopierOrder } from "./_lib/shopier-delivery.mjs";

/**
 * Shopier order.created webhook. Shopier needs a 200 within 5 seconds, so delivery runs after the
 * response; duplicates are ignored by the per-order lock in deliverShopierOrder.
 * Uses the Web Request API so the signature is checked against the exact raw body.
 */
export async function POST(request) {
  if (!shopierDeliveryEnabled()) {
    return new Response("Shopier delivery is not configured", { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyShopierSignature(rawBody, request.headers.get("shopier-signature"))) {
    console.warn("[shopier] webhook rejected: invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const accountId = process.env.SHOPIER_ACCOUNT_ID?.trim();
  if (accountId && request.headers.get("shopier-account-id") !== accountId) {
    return new Response("Unknown account", { status: 403 });
  }

  if (request.headers.get("shopier-event") !== "order.created") {
    return new Response("OK", { status: 200 });
  }

  let order;
  try {
    order = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid body", { status: 400 });
  }

  waitUntil(
    deliverShopierOrder(order).catch(async (error) => {
      console.error("[shopier] delivery crashed", order?.id, error);
      await postPayLog({
        title: "Shopier order delivery crashed — check and deliver manually",
        color: PAY_LOG_COLORS.urgent,
        alert: true,
        source: "Shopier",
        fields: [
          ["Shopier order", order?.id],
          ["Email", order?.shippingInfo?.email],
          ["Error", error?.message || String(error)],
        ],
      });
    })
  );

  return new Response("OK", { status: 200 });
}

export function GET() {
  return new Response("Method not allowed", { status: 405 });
}

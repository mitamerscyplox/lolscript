import { shopierDeliveryEnabled } from "../shopier.mjs";
import { getShopierVariantLinks } from "../shopier-catalog.mjs";

/** Sellhub variant ID -> Shopier product (URL and lira price) from the Shopier API. */
export default async function handler(req, res) {
  let links = {};
  if (shopierDeliveryEnabled()) {
    try {
      links = Object.fromEntries(
        (await getShopierVariantLinks())
          .filter((l) => l.inStock)
          .map((l) => [l.variantId, { url: l.url, price: l.price, currency: l.currency }])
      );
    } catch (error) {
      console.warn("[shopier] links failed:", error.message);
    }
  }
  res.setHeader(
    "Cache-Control",
    Object.keys(links).length ? "public, s-maxage=300, stale-while-revalidate=1800" : "no-store"
  );
  return res.status(200).json({ links });
}

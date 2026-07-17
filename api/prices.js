import {
  FALLBACK,
  fetchSellhubProducts,
  getConfig,
  mapProductsToStore,
} from "./sellhub-core.mjs";

export default async function handler(req, res) {
  const { token, storeUrl } = getConfig();
  const result = { source: "fallback", currency: "usd", products: {} };

  if (!token) {
    for (const [slug, value] of Object.entries(FALLBACK)) {
      result.products[slug] = {
        name: value.name,
        price: value.price,
        currency: value.currency,
        url: storeUrl || "#products",
        inStock: true,
        variants: value.variants || [],
      };
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(result);
  }

  let fetchError = null;
  let products = [];
  try {
    products = await fetchSellhubProducts();
  } catch (error) {
    fetchError = String(error.message || error);
  }

  result.products = mapProductsToStore(products);
  if (!fetchError && products.length) result.source = "sellhub";
  if (fetchError) result.error = fetchError;

  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
  return res.status(200).json(result);
}

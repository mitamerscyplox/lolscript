import { getConfig } from "./sellhub-core.mjs";

function sanitizeTermsHtml(html) {
  return String(html || "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");
}

function extractMainHtml(html) {
  const mainMatch =
    html.match(/<main[\s\S]*?<\/main>/i) ||
    html.match(/<article[\s\S]*?<\/article>/i) ||
    html.match(/<body[\s\S]*?<\/body>/i);
  return sanitizeTermsHtml(mainMatch ? mainMatch[0] : html);
}

export async function fetchSellhubTerms() {
  const { storeUrl } = getConfig();
  if (!storeUrl) return { html: "", url: "" };

  const base = storeUrl.replace(/\/+$/, "");
  const path = (process.env.SELLHUB_TERMS_PATH || "tos").replace(/^\//, "");
  const urlsToTry = [`${base}/${path}`, `${base}/${path}/`, `${base}/terms`];

  for (const termsUrl of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(termsUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        },
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const html = await res.text();
      const sanitized = extractMainHtml(html);
      if (sanitized.length > 50) return { html: sanitized, url: termsUrl };
    } catch {
      continue;
    }
  }

  return { html: "", url: urlsToTry[0] || "" };
}

export default async function handler(req, res) {
  const data = await fetchSellhubTerms();
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).json(data);
}

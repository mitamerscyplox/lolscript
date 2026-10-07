import { getCurrentUser, normalizeEmail } from "../auth.mjs";
import { clientIp, EMAIL_RE, hash, readBody, throttle } from "../http.mjs";
import { readShopierWatch, startShopierWatch } from "../shopier-watch.mjs";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const token = new URL(req.url, "http://localhost").searchParams.get("token") || "";
    const result = await readShopierWatch(token);
    if (!result) return res.status(404).json({ error: "Unknown watch" });
    return res.status(200).json(result);
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const wait = await throttle("shopier-watch", hash(clientIp(req)), 10, 600);
  if (wait) return res.status(429).json({ error: "Too many requests. Please try again shortly.", retryAfter: wait });

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid request." });
  }
  const email = String(body?.email || "").trim();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Invalid email" });
  const user = await getCurrentUser(req).catch(() => null);
  const owner = Boolean(user?.emailVerifiedAt && normalizeEmail(email) === user.email);
  return res.status(200).json({ token: await startShopierWatch(email, owner) });
}

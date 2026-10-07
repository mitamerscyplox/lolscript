import { RELAY_PATHS, relaySignatureValid, sapiGetDirect } from "./_lib/binance-deposit.mjs";
import { readBody } from "./_lib/http.mjs";

/** Read-only Binance calls for api/crypto-checkout.js, run from Frankfurt because Binance rejects US servers. */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  let raw;
  let body;
  try {
    body = await readBody(req);
    raw = JSON.stringify(body);
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid request." });
  }
  if (!relaySignatureValid(req.headers["x-relay-ts"], raw, req.headers["x-relay-sig"])) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  if (!RELAY_PATHS.includes(body?.path)) return res.status(400).json({ ok: false, error: "Path not allowed" });
  const params = Object.fromEntries(Object.entries(body.params || {}).map(([k, v]) => [String(k), String(v)]));
  return res.status(200).json(await sapiGetDirect(body.path, params));
}

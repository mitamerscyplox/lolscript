import { createHmac, timingSafeEqual } from "node:crypto";
import { botJobKeys } from "./_lib/giftcard-bot.mjs";
import { kvGet, kvSet, kvSetNx } from "./_lib/kv-store.mjs";

const MAX_SKEW_MS = 60_000;
const TTL = 600;

/** The Discord bot signs every call with the shared Binance API secret: hex HMAC-SHA256 of `${ts}.${body}`. */
function verified(raw, ts, signature) {
  const secret = process.env.BINANCE_API_SECRET?.trim();
  if (!secret || !ts || !signature || Math.abs(Date.now() - Number(ts)) > MAX_SKEW_MS) return false;
  const expected = createHmac("sha256", secret).update(`${ts}.${raw}`).digest();
  const given = Buffer.from(String(signature), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** The signature covers the exact bytes, so read the raw stream before anything parses req.body. */
async function readRaw(req) {
  if (!req.readableEnded) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
  }
  return typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const raw = await readRaw(req);
  if (!verified(raw, req.headers["x-bot-ts"], req.headers["x-bot-sig"])) {
    return res.status(403).json({ error: "Forbidden" });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return res.status(400).json({ error: "Bad request" });
  }
  const id = String(body?.id || "");
  if (!/^[a-f0-9]{24}$/.test(id)) return res.status(400).json({ error: "Bad request" });
  const keys = botJobKeys(id);

  if (body.action === "claim") {
    const job = await kvGet(keys.job);
    if (!job || !(await kvSetNx(keys.claim, "bot", TTL))) return res.status(200).json({ job: null });
    const { code, uid } = JSON.parse(job);
    return res.status(200).json({ job: { id, code, uid } });
  }

  if (body.action === "result") {
    if ((await kvGet(keys.claim)) !== "bot") return res.status(409).json({ error: "Not claimed" });
    await kvSet(keys.result, JSON.stringify(body.result ?? {}), TTL);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Bad request" });
}

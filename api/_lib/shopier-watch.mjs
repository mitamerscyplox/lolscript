/**
 * Shows Shopier deliveries on screen. The Shopier page runs in a cross-origin iframe, so the
 * site cannot see the payment; instead the checkout opens a "watch" for the buyer email and
 * polls it while the webhook delivers. Keys are handed to one watch only (the first to claim the
 * order) and only for orders paid after that watch was opened.
 */

import { createHash, randomBytes } from "node:crypto";
import { kvGet, kvSet, kvSetNx } from "./kv-store.mjs";

const WATCH_TTL = 2 * 60 * 60;

function emailHash(email) {
  return createHash("sha256").update(String(email).trim().toLowerCase()).digest("hex");
}

/**
 * Anyone can open a watch for any email, so keys are only put on screen when `owner` is true: the watch
 * was opened by a signed-in account whose verified email is the buyer email. Everyone else sees the
 * delivery status and gets the keys by email. A second watch for the same email still hides them.
 */
export async function startShopierWatch(email, owner = false) {
  const hash = emailHash(email);
  const token = randomBytes(24).toString("base64url");
  if (await kvGet(`ls:shopier:watcher:${hash}`)) await kvSet(`ls:shopier:contested:${hash}`, "1", WATCH_TTL);
  await kvSet(`ls:shopier:watcher:${hash}`, token, WATCH_TTL);
  await kvSet(`ls:shopier:watch:${token}`, JSON.stringify({ email: hash, since: Date.now(), owner: Boolean(owner) }), WATCH_TTL);
  return token;
}

export async function recordShopierResult(email, result) {
  await kvSet(`ls:shopier:result:${emailHash(email)}`, JSON.stringify({ ...result, at: Date.now() }), WATCH_TTL);
}

export async function readShopierWatch(token) {
  const watchRaw = token ? await kvGet(`ls:shopier:watch:${token}`) : null;
  if (!watchRaw) return null;
  const watch = JSON.parse(watchRaw);

  const resultRaw = await kvGet(`ls:shopier:result:${watch.email}`);
  const result = resultRaw ? JSON.parse(resultRaw) : null;
  if (!result || result.at < watch.since) return { status: "waiting" };
  if (result.status === "manual") return { status: "manual", orderId: result.orderId, items: result.items };

  const claimKey = `ls:shopier:claim:${result.orderId}`;
  const owner = (await kvSetNx(claimKey, token, WATCH_TTL)) ? token : await kvGet(claimKey);
  const contested = await kvGet(`ls:shopier:contested:${watch.email}`);
  return {
    status: "delivered",
    orderId: result.orderId,
    items: result.items,
    keys: watch.owner === true && owner === token && !contested ? result.keys : [],
  };
}

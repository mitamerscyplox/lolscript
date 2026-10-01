/**
 * Hands gift card codes to the LOLScript Discord bot, which redeems them from a location Binance accepts
 * (Vercel runs this site on US servers, which Binance rejects).
 *
 * 1. The code is stored in KV and "gcjob:lolscript:<id>" is posted in GIFTCARD_JOB_CHANNEL_ID
 *    (pay-log by default) with DISCORD_BOT_TOKEN.
 * 2. The bot sees the message, claims the code from /api/giftcard-bot and redeems it.
 * 3. The bot reports the Binance result back; we poll KV for it.
 * Claiming is a SETNX race, so a code is either redeemed by the bot or cancelled by us — never both.
 */

import { randomBytes } from "node:crypto";
import { isPersistentStore, kvDel, kvGet, kvSet, kvSetNx } from "./kv-store.mjs";

const JOB_TTL = 600;
const CLAIM_WAIT_MS = 8_000;
const RESULT_WAIT_MS = 30_000;

export const botJobKeys = (id) => ({
  job: `gcbot:job:${id}`,
  claim: `gcbot:claim:${id}`,
  result: `gcbot:result:${id}`,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function jobChannel() {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const channelId = (process.env.GIFTCARD_JOB_CHANNEL_ID || process.env.PAY_LOG_CHANNEL_ID || "").trim();
  return token && channelId ? { token, channelId } : null;
}

export function botRedeemConfigured() {
  return Boolean(jobChannel()) && isPersistentStore();
}

async function postJobNotice(id) {
  const channel = jobChannel();
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channel.channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${channel.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: `gcjob:lolscript:${id}`, flags: 4096, allowed_mentions: { parse: [] } }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data?.id ? String(data.id) : null;
  } catch {
    return null;
  }
}

async function deleteJobNotice(messageId) {
  const channel = jobChannel();
  await fetch(`https://discord.com/api/v10/channels/${channel.channelId}/messages/${messageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bot ${channel.token}` },
  }).catch(() => {});
}

/** Maps the bot's verify_binance_gift_card() result to the shape redeemGiftCard() returns. */
function mapBotReport(report) {
  if (report?.valid) {
    return {
      ok: true,
      amount: Number(report.amount) || 0,
      token: String(report.currency || "").toUpperCase(),
      referenceNo: String(report.referenceNo || ""),
    };
  }
  const apiError = String(report?.api_error || "");
  const message = apiError || String(report?.message || "Bot could not redeem the code");
  const lower = message.toLowerCase();
  const apiCode = report?.api_code;
  if (lower.includes("already") || lower.includes("redeemed")) return { ok: false, kind: "used", message, apiCode };
  // No Binance error means the bot never got an answer (cooldown, credentials, network) — the card was not used.
  if (!apiError) {
    return { ok: false, kind: lower.includes("credential") ? "config" : "unavailable", message, apiCode };
  }
  if (report.is_api_error || lower.includes("restricted location") || [-1021, -1022, -2008, -2014, -2015].includes(Number(apiCode))) {
    return { ok: false, kind: "config", message, apiCode };
  }
  if (Number(apiCode) === -1003 || lower.includes("too many")) {
    return { ok: false, kind: "unavailable", rateLimited: true, message, apiCode };
  }
  return { ok: false, kind: "invalid", message, apiCode };
}

export async function redeemViaBot(code, externalUid) {
  if (!botRedeemConfigured()) {
    return {
      ok: false,
      kind: "config",
      message: "Discord bot redeem is not configured (DISCORD_BOT_TOKEN / PAY_LOG_CHANNEL_ID / KV store missing).",
      region: "discord-bot",
    };
  }
  const id = randomBytes(12).toString("hex");
  const keys = botJobKeys(id);
  await kvSet(keys.job, JSON.stringify({ code, uid: externalUid || "" }), JOB_TTL);

  const noticeId = await postJobNotice(id);
  if (!noticeId) {
    await kvDel(keys.job);
    return { ok: false, kind: "unavailable", message: "Could not post the job for the Discord bot.", region: "discord-bot" };
  }

  try {
    const claimDeadline = Date.now() + CLAIM_WAIT_MS;
    while ((await kvGet(keys.claim)) !== "bot") {
      if (Date.now() > claimDeadline) {
        if (await kvSetNx(keys.claim, "site", JOB_TTL)) {
          return {
            ok: false,
            kind: "unavailable",
            message: "Discord bot did not pick up the code (offline?). The card was not used.",
            region: "discord-bot",
          };
        }
        break;
      }
      await sleep(700);
    }

    const resultDeadline = Date.now() + RESULT_WAIT_MS;
    while (Date.now() < resultDeadline) {
      const raw = await kvGet(keys.result);
      if (raw) return { ...mapBotReport(JSON.parse(raw)), region: "discord-bot" };
      await sleep(1000);
    }
    return {
      ok: false,
      kind: "unavailable",
      inFlight: true,
      message: "Discord bot took the code but did not report back in time — check Binance manually.",
      region: "discord-bot",
    };
  } finally {
    await kvDel(keys.job);
    await deleteJobNotice(noticeId);
  }
}

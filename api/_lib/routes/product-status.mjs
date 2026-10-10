/**
 * Live product status for /status, read from the "Product Status" embed the Discord bot keeps in the
 * status channel (DISCORD_BOT_TOKEN). DISCORD_STATUS_CHANNEL_ID pins the channel; otherwise the bot's
 * guilds are scanned for a text channel named like "status" that holds the embed.
 */
import { kvGet, kvSet, kvSetNx } from "../kv-store.mjs";
import { exactStoreSlug, storeProduct } from "../store-catalog.mjs";

const API = "https://discord.com/api/v10";
const CHANNEL_KEY = "status:channel";
const SNAPSHOT_KEY = "status:snapshot";
const LOG_KEY = "status:log";
const LOG_MAX = 40;
const LOG_TTL_SECONDS = 400 * 24 * 3600;
const MEMO_MS = 30_000;

export const STATUS_CATEGORIES = [
  { key: "lol-scripts", name: "LoL Scripts", slugs: ["lol-script", "hanbot-key", "legend-sense-key", "enginesoul", "pvlol-script", "bgx-script"] },
  { key: "vanguard-emulators", name: "Vanguard Emulators", slugs: ["lol-vanguard-emulator", "noi-vanguard-emulator", "seraph-vanguard-emulator", "oxa-vanguard-emulator", "soyuz-vanguard-emulator"] },
  { key: "bundles", name: "Bundle Deals", slugs: ["oxa-enginesoul-bundle", "soyuz-enginesoul-bundle", "oxa-hanbot-bundle", "soyuz-hanbot-bundle", "oxa-legend-sense-bundle", "soyuz-legend-sense-bundle"] },
  { key: "spoofers", name: "HWID Spoofers", slugs: ["lol-perm-spoofer"] },
];

const LINE_RE = /^\s*(?:\S+\s+)?(?:\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*)\s*·\s*\*\*([^*]+)\*\*(?:\s*·\s*<t:(\d+)(?::\w)?>)?/u;

let memo = { at: 0, body: null };

export function parseStatus(text) {
  const s = String(text || "").toLowerCase();
  if (/online|undetected|operational|working|active|🟢/u.test(s)) return "online";
  if (/maint|updat|🟡/u.test(s)) return "maintenance";
  if (/offline|down|detected|🔴/u.test(s)) return "offline";
  return null;
}

function slugFrom(url, name) {
  const fromUrl = String(url || "").replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop();
  if (fromUrl && storeProduct(fromUrl)) return fromUrl;
  return exactStoreSlug({ name });
}

/** Reads both the categorized embed (one product per line) and the older one-field-per-product embed. */
export function parseStatusEmbed(embed) {
  const found = {};
  for (const field of embed?.fields || []) {
    const lines = String(field.value || "").split("\n");
    let matchedLine = false;
    for (const line of lines) {
      const m = line.match(LINE_RE);
      if (!m) continue;
      const status = parseStatus(m[4]);
      const slug = slugFrom(m[2], m[1] || m[3]);
      if (!status || !slug) continue;
      matchedLine = true;
      found[slug] = { status, updatedAt: m[5] ? Number(m[5]) * 1000 : null };
    }
    if (matchedLine) continue;
    const slug = exactStoreSlug({ name: field.name });
    const status = parseStatus(field.value);
    if (slug && status) found[slug] = { status, updatedAt: null };
  }
  return found;
}

const isStatusEmbed = (embed) => /product status|ürün durumu/i.test(String(embed?.title || ""));

async function discordGet(path, token) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bot ${token}` }, cache: "no-store" });
  if (!res.ok) {
    const error = new Error(`Discord ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function statusMessageIn(channelId, token) {
  const messages = await discordGet(`/channels/${channelId}/messages?limit=50`, token);
  if (!Array.isArray(messages)) return null;
  for (const message of messages) {
    const embed = (message.embeds || []).find(isStatusEmbed);
    if (embed) return { embed, at: Date.parse(message.edited_timestamp || message.timestamp) || null };
  }
  return null;
}

async function guildIds(token) {
  const pinned = process.env.DISCORD_GUILD_ID?.trim();
  if (pinned) return [pinned];
  const guilds = await discordGet("/users/@me/guilds?limit=200", token);
  return Array.isArray(guilds) ? guilds.map((g) => g.id).filter(Boolean) : [];
}

async function findStatusMessage(token) {
  const pinned = process.env.DISCORD_STATUS_CHANNEL_ID?.trim();
  if (pinned) return statusMessageIn(pinned, token);

  const cached = await kvGet(CHANNEL_KEY).catch(() => null);
  if (cached) {
    const hit = await statusMessageIn(cached, token).catch(() => null);
    if (hit) return hit;
  }

  for (const gid of await guildIds(token)) {
    const channels = await discordGet(`/guilds/${gid}/channels`, token).catch(() => []);
    const candidates = (Array.isArray(channels) ? channels : [])
      .filter((c) => (c.type === 0 || c.type === 5) && /status/i.test(String(c.name || "")))
      .sort((a, b) => Number(b.name === "status") - Number(a.name === "status"));
    for (const channel of candidates) {
      const hit = await statusMessageIn(channel.id, token).catch(() => null);
      if (hit) {
        await kvSet(CHANNEL_KEY, channel.id, 7 * 24 * 3600).catch(() => {});
        return hit;
      }
    }
  }
  return null;
}

async function readJson(key, fallback) {
  try {
    const raw = await kvGet(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** Appends status changes since the last snapshot to the change log (one writer at a time). */
async function recordTransitions(current) {
  if (!(await kvSetNx("status:lock", "1", 15).catch(() => false))) return readJson(LOG_KEY, []);
  const previous = await readJson(SNAPSHOT_KEY, null);
  let log = await readJson(LOG_KEY, []);
  const now = Date.now();
  const entries = [];
  for (const [slug, item] of Object.entries(current)) {
    const before = previous?.[slug]?.status || null;
    if (before === item.status) continue;
    if (!before && !item.updatedAt) continue;
    entries.push({ slug, from: before, to: item.status, at: item.updatedAt || now });
  }
  if (entries.length) {
    log = [...entries.sort((a, b) => b.at - a.at), ...log].slice(0, LOG_MAX);
    await kvSet(LOG_KEY, JSON.stringify(log), LOG_TTL_SECONDS).catch(() => {});
  }
  if (JSON.stringify(previous) !== JSON.stringify(current)) {
    await kvSet(SNAPSHOT_KEY, JSON.stringify(current), LOG_TTL_SECONDS).catch(() => {});
  }
  return log;
}

export function buildPayload(statuses, { source, updatedAt, log = [] }) {
  const counts = { online: 0, maintenance: 0, offline: 0, unknown: 0 };
  const categories = STATUS_CATEGORIES.map((category) => ({
    key: category.key,
    name: category.name,
    products: category.slugs.map((slug) => {
      const item = statuses[slug] || {};
      const status = item.status || "unknown";
      counts[status] += 1;
      return { slug, name: storeProduct(slug)?.name || slug, status, updatedAt: item.updatedAt || null };
    }),
  }));
  const overall = counts.offline ? "offline" : counts.maintenance ? "maintenance" : counts.online ? "online" : "unknown";
  const names = Object.fromEntries(categories.flatMap((c) => c.products.map((p) => [p.slug, p.name])));
  const changes = log.filter((e) => names[e.slug]).map((e) => ({ ...e, name: names[e.slug] }));
  return { source, updatedAt, overall, counts, categories, changes };
}

async function loadPayload() {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (token) {
    try {
      const hit = await findStatusMessage(token);
      if (hit) {
        const statuses = parseStatusEmbed(hit.embed);
        if (Object.keys(statuses).length) {
          const log = await recordTransitions(statuses).catch(() => []);
          return buildPayload(statuses, { source: "discord", updatedAt: hit.at, log });
        }
      }
    } catch {}
  }
  const snapshot = await readJson(SNAPSHOT_KEY, null);
  const log = await readJson(LOG_KEY, []);
  return buildPayload(snapshot || {}, { source: snapshot ? "snapshot" : "unavailable", updatedAt: null, log });
}

export default async function handler(_req, res) {
  if (!memo.body || Date.now() - memo.at > MEMO_MS) {
    memo = { at: Date.now(), body: await loadPayload() };
  }
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  return res.status(200).json(memo.body);
}

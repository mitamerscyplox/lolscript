/**
 * Discord invite resolver (adapted from Mitamers lib/discord-invite.ts)
 * Uses DISCORD_BOT_TOKEN to scan guild invites and return the best active link.
 */

const API = "https://discord.com/api/v10";

let cache = { url: null, at: 0, source: "fallback" };

function authHeaders(token) {
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

function fallbackUrl() {
  return (
    process.env.DISCORD_INVITE_FALLBACK_URL?.trim() ||
    process.env.NEXT_PUBLIC_DISCORD_INVITE_URL?.trim() ||
    "https://discord.gg/n2ng5mJjhm"
  );
}

function preferredGuildIds() {
  const ids = new Set();
  const single =
    process.env.DISCORD_GUILD_ID?.trim() ||
    process.env.NEXT_PUBLIC_DISCORD_SERVER_ID?.trim();
  if (single) ids.add(single);

  const multi = process.env.DISCORD_GUILD_IDS?.trim();
  if (multi) {
    for (const part of multi.split(/[,;\s]+/)) {
      const id = part.trim();
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

function inviteUrl(code) {
  return `https://discord.gg/${code}`;
}

function inviteExpiresAt(invite) {
  if (invite.expires_at) return new Date(invite.expires_at).getTime();
  if (invite.created_at && Number(invite.max_age) > 0) {
    return new Date(invite.created_at).getTime() + Number(invite.max_age) * 1000;
  }
  return Number.MAX_SAFE_INTEGER;
}

function isInviteActive(invite) {
  if (!invite?.code) return false;
  if (Number(invite.max_uses) > 0 && Number(invite.uses) >= Number(invite.max_uses)) return false;
  return inviteExpiresAt(invite) > Date.now() + 30_000;
}

function createdAt(invite) {
  return invite.created_at ? new Date(invite.created_at).getTime() : 0;
}

// The bot rotates its invite, so its newest active invite wins over older/permanent ones.
function pickBestInvite(invites, botUserId) {
  const active = invites.filter(isInviteActive);
  if (!active.length) return null;
  const fromBot = botUserId ? active.filter((i) => i.inviter?.id === botUserId) : [];
  const pool = fromBot.length ? fromBot : active;
  return [...pool].sort((a, b) => createdAt(b) - createdAt(a))[0] ?? null;
}

async function fetchBotUserId(headers) {
  const preferred = process.env.DISCORD_INVITE_INVITER_ID?.trim();
  if (preferred) return preferred;
  const res = await fetch(`${API}/users/@me`, { headers, cache: "no-store" });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ?? null;
}

async function fetchAllBotGuildIds(headers) {
  const ids = [];
  let after;

  for (let page = 0; page < 20; page += 1) {
    const url = new URL(`${API}/users/@me/guilds`);
    url.searchParams.set("limit", "200");
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url.toString(), { headers, cache: "no-store" });
    if (!res.ok) break;

    const guilds = await res.json();
    if (!Array.isArray(guilds) || !guilds.length) break;

    ids.push(...guilds.map((g) => g.id).filter(Boolean));
    if (guilds.length < 200) break;
    after = guilds[guilds.length - 1]?.id;
    if (!after) break;
  }

  return [...new Set(ids)];
}

async function fetchGuildInvites(gid, headers) {
  const res = await fetch(`${API}/guilds/${gid}/invites`, { headers, cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchChannelInvites(channelId, headers) {
  const res = await fetch(`${API}/channels/${channelId}/invites`, { headers, cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function resolveInviteChannelId(gid, headers) {
  const preferred = process.env.DISCORD_INVITE_CHANNEL_ID?.trim();
  if (preferred) return preferred;

  const chRes = await fetch(`${API}/guilds/${gid}/channels`, { headers, cache: "no-store" });
  if (!chRes.ok) return null;
  const channels = await chRes.json();
  const textChannel = Array.isArray(channels) ? channels.find((c) => c.type === 0) : null;
  return textChannel?.id ?? null;
}

async function collectGuildInvites(gid, headers) {
  const guildInvites = await fetchGuildInvites(gid, headers);
  if (guildInvites.length) return guildInvites;

  const channelId = await resolveInviteChannelId(gid, headers);
  if (!channelId) return [];
  return fetchChannelInvites(channelId, headers);
}

async function resolveGuildScanOrder(headers) {
  const preferred = preferredGuildIds();
  if (preferred.length) return preferred;
  const fromBot = await fetchAllBotGuildIds(headers);
  const ordered = [...preferred];
  for (const id of fromBot) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

async function resolveDiscordInviteFromApi() {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) return null;

  const headers = authHeaders(token);
  const guildIds = await resolveGuildScanOrder(headers);
  if (!guildIds.length) return null;

  const [botUserId, ...inviteLists] = await Promise.all([
    fetchBotUserId(headers),
    ...guildIds.map((gid) => collectGuildInvites(gid, headers)),
  ]);

  const best = pickBestInvite(inviteLists.flat(), botUserId);
  return best?.code ? inviteUrl(best.code) : null;
}

function revalidateSeconds() {
  const raw = Number(process.env.DISCORD_INVITE_REVALIDATE_SECONDS ?? "60");
  if (!Number.isFinite(raw) || raw < 15) return 60;
  return Math.min(Math.floor(raw), 300);
}

export async function getCachedDiscordInviteUrl() {
  const ttlMs = revalidateSeconds() * 1000;
  const now = Date.now();
  if (cache.url && now - cache.at < ttlMs) return cache.url;

  let url = fallbackUrl();
  let source = "fallback";

  try {
    const fromApi = await resolveDiscordInviteFromApi();
    if (fromApi) {
      url = fromApi;
      source = "discord";
    }
  } catch (_) {}

  cache = { url, at: now, source };
  return url;
}

export function getDiscordInviteMeta() {
  return {
    url: cache.url || fallbackUrl(),
    source: cache.source || "fallback",
    revalidateSeconds: revalidateSeconds(),
    serverId:
      process.env.DISCORD_GUILD_ID?.trim() ||
      process.env.NEXT_PUBLIC_DISCORD_SERVER_ID?.trim() ||
      "",
  };
}

export { fallbackUrl };

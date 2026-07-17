import { fallbackUrl, getCachedDiscordInviteUrl, getDiscordInviteMeta } from "./discord-core.mjs";

export default async function handler(req, res) {
  try {
    const url = await getCachedDiscordInviteUrl();
    const meta = getDiscordInviteMeta();
    res.setHeader("Cache-Control", `s-maxage=${meta.revalidateSeconds}, stale-while-revalidate=120`);
    return res.status(200).json({
      url,
      source: meta.source,
      serverId: meta.serverId || undefined,
      revalidateSeconds: meta.revalidateSeconds,
    });
  } catch (error) {
    return res.status(200).json({
      url: fallbackUrl(),
      source: "fallback",
      error: String(error?.message || error),
    });
  }
}

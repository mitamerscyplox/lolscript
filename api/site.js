import analytics from "./_lib/routes/analytics.mjs";
import discordInvite from "./_lib/routes/discord-invite.mjs";
import installGuideVideo from "./_lib/routes/install-guide-video.mjs";
import patchStatus from "./_lib/routes/patch-status.mjs";
import shopierLinks from "./_lib/routes/shopier-links.mjs";
import shopierWatch from "./_lib/routes/shopier-watch.mjs";

/** Small endpoints share one function (vercel.json rewrites /api/<name> here) to stay under the function limit. */
const ROUTES = {
  analytics,
  "discord-invite": discordInvite,
  "install-guide-video": installGuideVideo,
  "patch-status": patchStatus,
  "shopier-links": shopierLinks,
  "shopier-watch": shopierWatch,
};

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  let route = url.searchParams.get("route") || req.query?.route || url.pathname.replace(/^\/api\//, "");
  if (Array.isArray(route)) route = route[0];
  const fn = ROUTES[String(route)];
  if (!fn) return res.status(404).json({ error: "Not found" });
  return fn(req, res);
}

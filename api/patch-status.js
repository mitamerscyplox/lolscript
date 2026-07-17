const DDRAGON_VERSIONS = "https://ddragon.leagueoflegends.com/api/versions.json";

function displayPatch(version = "") {
  const match = String(version).match(/^(\d+)\.(\d+)/);
  if (!match) return String(version || "");
  const major = Number(match[1]);
  if (major < 20) return `26.${match[2]}`;
  return `${match[1]}.${match[2]}`;
}

export default async function handler(_req, res) {
  try {
    const response = await fetch(DDRAGON_VERSIONS, { cache: "no-store" });
    if (!response.ok) throw new Error(`Data Dragon HTTP ${response.status}`);
    const versions = await response.json();
    const ddragonVersion = Array.isArray(versions) ? versions[0] : "";
    if (!ddragonVersion) throw new Error("No Data Dragon version returned");

    const patch = displayPatch(ddragonVersion);
    const payload = {
      patch,
      version: patch,
      ddragonVersion,
      status: "updated",
      label: `Working on LoL Patch ${patch}`,
      updatedAt: new Date().toISOString(),
      source: "Riot Data Dragon versions endpoint",
    };

    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(payload);
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: String(error.message || error) });
  }
}

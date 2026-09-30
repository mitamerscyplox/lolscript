(function () {
  const CACHE_KEY = "lolscript_patch_status_v1";
  const CACHE_MS = 60 * 60 * 1000;
  const DDRAGON_VERSIONS = "https://ddragon.leagueoflegends.com/api/versions.json";

  function displayPatch(version) {
    const match = String(version || "").match(/^(\d+)\.(\d+)/);
    if (!match) return String(version || "");
    const major = Number(match[1]);
    if (major < 20) return `26.${match[2]}`;
    return `${match[1]}.${match[2]}`;
  }

  function buildStatus(ddragonVersion) {
    const patch = displayPatch(ddragonVersion);
    return {
      patch,
      version: patch,
      ddragonVersion,
      status: "updated",
      label: `Working on LoL Patch ${patch}`,
      updatedAt: new Date().toISOString(),
      source: "Riot Data Dragon versions endpoint",
    };
  }

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.label || !parsed?.cachedAt) return null;
      if (Date.now() - Number(parsed.cachedAt) > CACHE_MS) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeCache(status) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...status, cachedAt: Date.now() }));
    } catch (_) {}
  }

  function applyPatchStatus(status) {
    if (!status?.label) return;
    window.LOLSCRIPT_PATCH_STATUS = status;

    document.querySelectorAll(".patch-status").forEach((el) => {
      el.textContent = status.label;
      el.title = `Verified ${status.updatedAt} via ${status.source}`;
    });

    document.querySelectorAll("[data-status-title]").forEach((el) => {
      el.textContent = status.label;
    });

    window.dispatchEvent(new CustomEvent("lolscript-patch-ready", { detail: status }));
  }

  async function fetchFromApi() {
    const res = await fetch("/api/patch-status", { cache: "no-store" });
    if (!res.ok) throw new Error(`patch-status API ${res.status}`);
    return res.json();
  }

  async function fetchFromDdragon() {
    const res = await fetch(DDRAGON_VERSIONS, { cache: "no-store" });
    if (!res.ok) throw new Error(`Data Dragon ${res.status}`);
    const versions = await res.json();
    const ddragonVersion = Array.isArray(versions) ? versions[0] : "";
    if (!ddragonVersion) throw new Error("No Data Dragon version");
    return buildStatus(ddragonVersion);
  }

  async function refreshPatchStatus() {
    const cached = readCache();
    if (cached) {
      applyPatchStatus(cached);
    }

    try {
      const status = await fetchFromApi();
      writeCache(status);
      applyPatchStatus(status);
      return;
    } catch (_) {}

    try {
      const status = await fetchFromDdragon();
      writeCache(status);
      applyPatchStatus(status);
    } catch (_) {
      if (!cached) return;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshPatchStatus);
  } else {
    refreshPatchStatus();
  }
})();

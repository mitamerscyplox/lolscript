(function () {
  let currentUrl = null;
  let pollTimer = null;
  const DEFAULT_INTERVAL_MS = 60000;

  function isDiscordHref(href) {
    return /discord\.gg|discord\.com\/invite|discordapp\.com\/invite/i.test(String(href || ""));
  }

  function applyDiscordUrl(url) {
    if (!url || !/^https?:\/\//i.test(url)) return;
    if (url === currentUrl) return;
    currentUrl = url;

    const selectors = [
      "[data-discord-link]",
      "[data-secondary-button]",
      'a.header-cta[href*="discord"]',
      '.footer-links a[href*="discord"]',
      ".hero-actions a[href*='discord']",
      ".contact-actions a[href*='discord']",
    ];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.href = url;
        el.target = "_blank";
        el.rel = "noreferrer";
      });
    });

    document.querySelectorAll("a[href]").forEach((el) => {
      if (el.dataset.discordStatic === "true") return;
      if (isDiscordHref(el.getAttribute("href"))) {
        el.href = url;
        if (!el.target) {
          el.target = "_blank";
          el.rel = "noreferrer";
        }
      }
    });

    if (window.SITE_DATA?.site) window.SITE_DATA.site.discordLink = url;
    window.LOLScriptDiscord = { url, refresh: refreshDiscordInvite };
    window.dispatchEvent(new CustomEvent("lolscript-discord-ready", { detail: { url } }));
  }

  async function refreshDiscordInvite() {
    try {
      const res = await fetch("/api/discord-invite", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.url) applyDiscordUrl(data.url);
      schedulePoll(Number(data?.revalidateSeconds) || 60);
    } catch (_) {}
  }

  function schedulePoll(seconds) {
    const intervalMs = Math.max(15000, Math.min(Number(seconds) * 1000 || DEFAULT_INTERVAL_MS, 300000));
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = window.setInterval(refreshDiscordInvite, intervalMs);
  }

  refreshDiscordInvite();
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) refreshDiscordInvite();
  });
})();

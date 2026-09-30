(function () {
  const readyMounts = new WeakMap();
  let modal = null;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function getStreamableId(url) {
    const src = String(url || "").trim();
    const match =
      src.match(/streamable\.com\/(?:o\/|e\/|s\/)?([a-z0-9]+)/i) ??
      src.match(/^streamable:([a-z0-9]+)/i);
    return match?.[1] || "";
  }

  function buildPlayerMarkup(url, title) {
    const src = String(url || "").trim();
    if (!src) return "";

    const streamableId = getStreamableId(src);
    if (streamableId) {
      return `<iframe src="https://streamable.com/e/${escapeHtml(streamableId)}" title="${escapeHtml(title)} showcase" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }

    const ytMatch =
      src.match(/youtube\.com\/watch\?v=([a-z0-9_-]+)/i) ??
      src.match(/youtu\.be\/([a-z0-9_-]+)/i) ??
      src.match(/youtube\.com\/embed\/([a-z0-9_-]+)/i);
    if (ytMatch?.[1]) {
      return `<iframe src="https://www.youtube.com/embed/${escapeHtml(ytMatch[1])}?autoplay=1" title="${escapeHtml(title)} showcase" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }

    const vimeoMatch = src.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vimeoMatch?.[1]) {
      return `<iframe src="https://player.vimeo.com/video/${escapeHtml(vimeoMatch[1])}?autoplay=1" title="${escapeHtml(title)} showcase" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }

    if (/cloudflarestream\.com|videodelivery\.net|iframe\.mediadelivery\.net|stream\.mux\.com/i.test(src)) {
      return `<iframe src="${escapeHtml(src)}" title="${escapeHtml(title)} showcase" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }

    if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(src)) {
      return `<video src="${escapeHtml(src)}" controls playsinline autoplay preload="metadata"></video>`;
    }

    return `<iframe src="${escapeHtml(src)}" title="${escapeHtml(title)} showcase" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  }

  function buildFacade(videoUrl, title) {
    const streamableId = getStreamableId(videoUrl);
    const poster = streamableId
      ? `https://cdn-cf-east.streamable.com/image/${escapeAttr(streamableId)}.jpg`
      : "";

    return `
      <button type="button" class="product-showcase-play" data-showcase-play data-video-url="${escapeAttr(videoUrl)}" data-video-title="${escapeAttr(title)}" aria-label="Play ${escapeAttr(title)} preview">
        ${poster ? `<img class="product-showcase-poster" src="${poster}" alt="" loading="lazy" decoding="async" width="1280" height="720">` : ""}
        <span class="product-showcase-play-icon" aria-hidden="true"><i class="fa-solid fa-play"></i></span>
      </button>`;
  }

  function ensureModal() {
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "product-showcase-modal";
    modal.setAttribute("data-showcase-modal", "");
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="product-showcase-modal-backdrop" data-showcase-modal-close aria-hidden="true"></div>
      <div class="product-showcase-modal-panel" role="dialog" aria-modal="true" aria-labelledby="product-showcase-modal-title">
        <div class="product-showcase-modal-head">
          <div class="product-showcase-modal-copy">
            <h2 id="product-showcase-modal-title" data-showcase-modal-title>Product preview</h2>
            <p class="product-showcase-modal-hint">Press <kbd>Esc</kbd> to close</p>
          </div>
          <button type="button" class="product-showcase-modal-close" data-showcase-modal-close aria-label="Close video">&times;</button>
        </div>
        <div class="product-showcase-modal-frame" data-showcase-modal-player></div>
      </div>`;

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-showcase-modal-close]")) closeModal();
    });

    document.body.appendChild(modal);
    return modal;
  }

  function openModal(videoUrl, title) {
    const mount = ensureModal();
    const player = mount.querySelector("[data-showcase-modal-player]");
    const titleEl = mount.querySelector("[data-showcase-modal-title]");
    if (!player) return;

    if (titleEl) titleEl.textContent = title || "Product preview";
    player.innerHTML = buildPlayerMarkup(videoUrl, title);
    mount.hidden = false;
    mount.setAttribute("aria-hidden", "false");
    document.body.classList.add("product-showcase-modal-open");
    mount.querySelector(".product-showcase-modal-close")?.focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    const player = modal.querySelector("[data-showcase-modal-player]");
    if (player) player.innerHTML = "";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("product-showcase-modal-open");
  }

  function applyShowcase(mount, catalog) {
    const slug = mount.getAttribute("data-product-showcase");
    const player = mount.querySelector("[data-product-showcase-player]");
    if (!slug || !player) return;

    const product = catalog?.[slug];
    const videoUrl = product?.showcaseVideo;
    if (!videoUrl) {
      mount.hidden = true;
      mount.setAttribute("aria-hidden", "true");
      player.innerHTML = "";
      readyMounts.delete(mount);
      return;
    }

    if (readyMounts.get(mount) === videoUrl) return;

    const title = product?.name || slug;
    player.innerHTML = buildFacade(videoUrl, title);
    readyMounts.set(mount, videoUrl);
    mount.hidden = false;
    mount.removeAttribute("aria-hidden");
  }

  function initShowcases(catalog) {
    if (!catalog || typeof catalog !== "object") return;
    document.querySelectorAll("[data-product-showcase]").forEach((mount) => {
      applyShowcase(mount, catalog);
    });
  }

  async function loadCatalogFallback() {
    const existing = window.LOLSellhub?.catalog;
    if (existing && Object.keys(existing).length) return existing;

    try {
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (!res.ok) return {};
      const data = await res.json();
      return data.products || {};
    } catch (_) {
      return {};
    }
  }

  function bootstrapShowcases(catalog) {
    if (catalog && Object.keys(catalog).length) {
      initShowcases(catalog);
      return;
    }

    if (window.LOLSellhub?.catalog && Object.keys(window.LOLSellhub.catalog).length) {
      initShowcases(window.LOLSellhub.catalog);
      return;
    }

    window.setTimeout(async () => {
      if (window.LOLSellhub?.catalog && Object.keys(window.LOLSellhub.catalog).length) {
        initShowcases(window.LOLSellhub.catalog);
        return;
      }
      initShowcases(await loadCatalogFallback());
    }, 300);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-showcase-play]");
    if (!button) return;

    const mount = button.closest("[data-product-showcase]");
    const slug = mount?.getAttribute("data-product-showcase");
    const product = slug ? window.LOLSellhub?.catalog?.[slug] : null;
    const videoUrl = button.getAttribute("data-video-url") || product?.showcaseVideo || "";
    const title = button.getAttribute("data-video-title") || product?.name || slug || "Product preview";
    if (!videoUrl) return;

    event.preventDefault();
    openModal(videoUrl, title);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  window.LOLScriptProductShowcase = { init: initShowcases, bootstrap: bootstrapShowcases, open: openModal, close: closeModal };

  window.addEventListener("lolscript-sellhub-ready", (event) => {
    initShowcases(event.detail || window.LOLSellhub?.catalog || {});
  });

  document.addEventListener("DOMContentLoaded", () => {
    bootstrapShowcases(window.LOLSellhub?.catalog || {});
  });
})();

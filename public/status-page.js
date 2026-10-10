(function () {
  const LABELS = { online: "Undetected", maintenance: "Updating", offline: "Offline", unknown: "Checking" };
  const ICONS = {
    "lol-scripts": "fa-solid fa-crosshairs",
    "vanguard-emulators": "fa-solid fa-shield-halved",
    bundles: "fa-solid fa-box-open",
    spoofers: "fa-solid fa-fingerprint",
  };
  const REFRESH_MS = 60 * 1000;

  function ago(ms, short) {
    if (!ms) return short ? "" : "";
    const seconds = Math.max(0, (Date.now() - ms) / 1000);
    if (seconds < 60) return short ? "now" : "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return short ? `${minutes}m` : `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return short ? `${hours}h` : `${hours} h ago`;
    const days = Math.floor(hours / 24);
    return short ? `${days}d` : `${days} day${days === 1 ? "" : "s"} ago`;
  }

  function el(tag, attrs = {}, text) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === "className") node.className = value;
      else node.setAttribute(key, value === true ? "" : value);
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function badge(state) {
    const node = el("span", { className: "ms-badge", "data-state": state || "unknown" });
    node.append(el("i", { class: state === "offline" ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-shield-halved", "aria-hidden": "true" }), el("span", {}, LABELS[state] || LABELS.unknown));
    return node;
  }

  function renderBar(data) {
    const counts = data?.counts || {};
    for (const key of ["online", "offline", "maintenance"]) {
      const node = document.querySelector(`[data-count="${key}"]`);
      if (node) node.textContent = data ? String(counts[key] || 0) : "–";
    }
    const banner = document.querySelector("[data-banner]");
    if (!banner) return;
    const state = data?.overall || "unknown";
    banner.dataset.state = state;
    banner.textContent = state === "online" ? "All systems operational"
      : state === "maintenance" ? "Some products are updating"
      : state === "offline" ? "Some products are offline"
      : "Status unavailable";
  }

  function renderChanges(data) {
    const wrap = document.querySelector("[data-changes]");
    const count = document.querySelector("[data-change-count]");
    if (!wrap) return;
    const changes = (data?.changes || []).slice(0, 4);
    if (count) count.textContent = changes.length ? `Last ${changes.length}` : "";
    if (!changes.length) {
      wrap.replaceChildren(el("p", { className: "ms-empty" }, "No status changes recorded yet. Updates posted in Discord appear here."));
      return;
    }
    wrap.replaceChildren(...changes.map((change) => {
      const card = change.slug ? el("a", { className: "ms-change", href: `/${change.slug}` }) : el("article", { className: "ms-change" });
      const top = el("div", { className: "ms-change-top" });
      top.append(el("span", { className: "ms-change-name" }, change.name), el("span", { className: "ms-change-time" }, ago(change.at, true).toUpperCase()));
      const line = el("p", { className: "ms-change-text" }, change.from
        ? `Status changed: ${LABELS[change.from] || change.from} → ${LABELS[change.to] || change.to}`
        : `Status set to ${LABELS[change.to] || change.to}`);
      card.append(top, line);
      return card;
    }));
  }

  function renderCategories(data) {
    const wrap = document.querySelector("[data-cats]");
    const meta = document.querySelector("[data-cat-count]");
    if (!wrap) return;
    const categories = data?.categories || [];
    if (meta) meta.textContent = `${categories.length} ${categories.length === 1 ? "category" : "categories"}`;
    wrap.replaceChildren(...categories.map((category) => {
      const products = category.products || [];
      const box = el("section", { className: "ms-cat", "aria-labelledby": `cat-${category.key}` });
      const head = el("header", { className: "ms-cat-head" });
      const title = el("span", { className: "ms-cat-title" });
      const icon = el("span", { className: "ms-cat-icon", "aria-hidden": "true" });
      icon.append(el("i", { class: ICONS[category.key] || "fa-solid fa-cube" }));
      title.append(icon, el("span", { id: `cat-${category.key}` }, category.name));
      head.append(title, el("span", { className: "ms-cat-count" }, `${products.length} ${products.length === 1 ? "product" : "products"}`));
      const list = el("div", { className: "ms-rows" });
      for (const product of products) {
        const row = el("a", { className: "ms-row", href: `/${product.slug}` });
        row.append(
          el("span", { className: "ms-row-name" }, product.name),
          el("span", { className: "ms-row-time" }, product.updatedAt ? `${ago(product.updatedAt)}` : "monitored"),
          badge(product.status),
        );
        list.append(row);
      }
      box.append(head, list);
      return box;
    }));
  }

  function renderSync(data) {
    const sync = document.querySelector("[data-sync]");
    if (!sync) return;
    if (data?.source === "discord") sync.textContent = "Synced with Discord · refreshes automatically";
    else if (data?.source === "snapshot") sync.textContent = "Last known status from Discord";
    else sync.textContent = "Discord sync unavailable";
  }

  function render(data) {
    renderBar(data);
    renderChanges(data);
    renderCategories(data);
    renderSync(data);
  }

  let loaded = false;

  async function refresh() {
    try {
      const res = await fetch("/api/product-status", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      render(await res.json());
      loaded = true;
    } catch (_) {
      if (!loaded) render(null);
    }
  }

  function start() {
    refresh();
    setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

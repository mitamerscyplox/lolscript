const data = window.SITE_DATA || {};
const site = data.site || {};
const products = data.products || [];
const categories = data.categories || [];

const categoryMount = document.querySelector("[data-categories]");
const productMount = document.querySelector("[data-products]");
const SINGLE_PURCHASE_SALE_RATE = 0.10;

function priceToCents(price = "") {
  const match = String(price).match(/\d+(?:\.\d{1,2})?/);
  return match ? Math.round(Number(match[0]) * 100) : 0;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value !== undefined && value !== null) element.textContent = value;
}

function setHref(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) element.href = value;
}

function setTarget(selector, value) {
  const element = document.querySelector(selector);
  if (!element) return;
  const isExternal = /^https?:\/\//.test(value || "");
  if (isExternal) {
    element.target = "_blank";
    element.rel = "noreferrer";
  } else {
    element.removeAttribute("target");
    element.removeAttribute("rel");
  }
}

function setContent(selector, value) {
  const element = document.querySelector(selector);
  if (element && value !== undefined && value !== null) element.content = value;
}

function applySiteData() {
  if (site.title) document.title = site.title;
  setContent("[data-site-description]", site.description);
  setContent("[data-site-keywords]", site.keywords);
  setContent("[data-site-robots]", site.robots);
  setContent("[data-og-title]", site.ogTitle || site.title);
  setContent("[data-og-description]", site.ogDescription || site.description);

  const canonical = document.querySelector("[data-canonical]");
  if (canonical && site.canonicalPath) {
    canonical.href = `https://www.lolscript.store${site.canonicalPath}`;
  }

  setText("[data-hero-badge]", site.heroBadge);
  setText("[data-hero-title]", site.heroTitle);
  setText("[data-hero-text]", site.heroText);
  setText("[data-primary-button]", site.primaryButton);
  setText("[data-secondary-button]", site.secondaryButton);
  setText("[data-trust-text]", site.trustText);
  setText("[data-products-eyebrow]", site.productsEyebrow);
  setText("[data-products-title]", site.productsTitle);
  setText("[data-products-text]", site.productsText);
  setText("[data-blogs-eyebrow]", site.blogsEyebrow);
  setText("[data-blogs-title]", site.blogsTitle);
  setText("[data-blogs-text]", site.blogsText);
  setText("[data-contact-eyebrow]", site.contactEyebrow);
  setText("[data-contact-title]", site.contactTitle);
  setText("[data-contact-text]", site.contactText);
  setText("[data-email-label]", site.emailLabel);
  setText("[data-discord-label]", site.discordLabel);
  setText("[data-footer-text]", site.footerText);
  setHref("[data-email-link]", site.emailLink);
  setHref("[data-discord-link]", site.discordLink);
  setHref("[data-secondary-button]", site.discordLink);
  setTarget("[data-email-link]", site.emailLink);
  setTarget("[data-discord-link]", site.discordLink);
  setTarget("[data-secondary-button]", site.discordLink);
}

window.addEventListener("lolscript-discord-ready", (event) => {
  const url = event.detail?.url;
  if (!url) return;
  setHref("[data-discord-link]", url);
  setHref("[data-secondary-button]", url);
  setTarget("[data-discord-link]", url);
  setTarget("[data-secondary-button]", url);
});

function renderCategories() {
  if (!categoryMount) return;
  categoryMount.innerHTML = categories
    .map((category, index) => `
      <button class="tab ${index === 0 ? "active" : ""}" type="button" data-category="${escapeHtml(category.id)}">
        ${escapeHtml(category.name)}
      </button>
    `)
    .join("");

  categoryMount.querySelectorAll("[data-category]").forEach((tab) => {
    tab.addEventListener("click", () => {
      categoryMount.querySelectorAll("[data-category]").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      renderProducts(tab.dataset.category);
    });
  });
}

let livePrices = null;

function cssEscape(value) {
  return window.CSS && window.CSS.escape ? window.CSS.escape(value) : String(value).replace(/"/g, '\\"');
}

const LOCAL_PRODUCT_IMAGES = {
  "lol-script": "/assets/products/lol-script.webp",
  "lol-vanguard-emulator": "/assets/products/lol-vanguard-emulator.webp",
  "lol-perm-spoofer": "/assets/products/lol-perm-spoofer.webp",
};

function normalizeAssetPath(path) {
  const raw = String(path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;
}

function productImageSrc(product, slug) {
  return LOCAL_PRODUCT_IMAGES[slug] || normalizeAssetPath(product.image);
}

function applyLivePrices(root = document) {
  if (!livePrices) return;
  Object.entries(livePrices).forEach(([slug, info]) => {
    if (!info) return;
    if (Number(info.price) > 0) {
      const cents = Math.round(Number(info.price) * 100);
      root.querySelectorAll(`[data-price-slug="${cssEscape(slug)}"]`).forEach((element) => {
        element.dataset.moneyUsdCents = String(cents);
        element.textContent = moneyText(cents);
      });
    }
    if (info.url) {
      root.querySelectorAll(`[data-buy-slug="${cssEscape(slug)}"]`).forEach((element) => {
        if (info.productId) {
          element.dataset.checkoutReady = "true";
          element.removeAttribute("target");
          element.removeAttribute("rel");
          return;
        }
        element.href = info.url;
        if (/^https?:\/\//.test(info.url)) {
          element.target = "_blank";
          element.rel = "noreferrer";
        }
      });
    }
  });
  window.LOLCurrency?.apply(root);
}

async function loadSellhubPrices() {
  if (window.LOLSellhub?.catalog && Object.keys(window.LOLSellhub.catalog).length) {
    livePrices = window.LOLSellhub.catalog;
    applyLivePrices(productMount || document);
    return;
  }
  try {
    const response = await fetch("/api/prices", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    livePrices = data.products || {};
    applyLivePrices(productMount || document);
  } catch (_) {
    // Keep the fallback prices already rendered from data.js.
  }
}

window.addEventListener("lolscript-sellhub-ready", (event) => {
  livePrices = event.detail || {};
  applyLivePrices(productMount || document);
});

function renderProducts(category) {
  if (!productMount) return;
  productMount.innerHTML = products
    .filter((product) => product.category === category)
    .map((product) => {
      const priceCents = priceToCents(product.price);
      const slug = product.slug || product.name;
      const imageSrc = productImageSrc(product, slug);
      const priceMarkup = priceCents
        ? `<span class="price" data-price-slug="${escapeHtml(slug)}" data-money-usd-cents="${priceCents}">${escapeHtml(moneyText(priceCents))}</span>`
        : `<span class="price" data-price-slug="${escapeHtml(slug)}">${escapeHtml(product.price)}</span>`;
      const imageMarkup = imageSrc
        ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">`
        : `<div class="product-icon" aria-hidden="true"><i class="${escapeHtml(product.icon || "fa-solid fa-box")}"></i></div>`;
      return `
      <article class="product-card${product.featured ? " is-featured" : ""}" id="${escapeHtml(product.slug || product.name)}">
        <div class="product-image">
          ${imageMarkup}
        </div>
        <div class="product-body">
          <div class="product-badge-row">
            ${product.featured ? '<p class="badge">Featured</p>' : '<span class="product-badge-spacer" aria-hidden="true"></span>'}
          </div>
          <h3><a href="${escapeHtml(product.page || "#products")}">${escapeHtml(product.name)}</a></h3>
          <p class="product-meta">${escapeHtml(product.description)}</p>
          <div class="product-footer">
            ${priceMarkup}
            <div class="product-actions">
              <a class="button primary" href="${escapeHtml(product.page || "#products")}">Buy Now</a>
            </div>
          </div>
        </div>
      </article>
    `;
    })
    .join("");
  window.LOLCurrency?.apply(productMount);
  applyLivePrices(productMount);
}

function moneyText(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function startSaleCountdown() {
  const mounts = document.querySelectorAll("[data-countdown-time]");
  if (!mounts.length) return;
  const tick = () => {
    const now = new Date();
    const reset = new Date(now);
    reset.setHours(24, 0, 0, 0);
    const seconds = Math.max(0, Math.floor((reset.getTime() - now.getTime()) / 1000));
    const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    mounts.forEach((mount) => mount.textContent = `${hours}:${minutes}:${secs}`);
  };
  tick();
  window.setInterval(tick, 1000);
}

function renderStats() {
  const mount = document.querySelector("[data-stats]");
  if (!mount) return;
  mount.innerHTML = (data.stats || []).map((item) => `
    <article>
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.label)}</span>
    </article>
  `).join("");
}

function renderFeatures() {
  const features = data.features || {};
  setText("[data-features-eyebrow]", features.eyebrow);
  setText("[data-features-title]", features.title);
  setText("[data-features-text]", features.text);
  const mount = document.querySelector("[data-features]");
  if (!mount) return;
  mount.innerHTML = (features.items || []).map((item) => `
    <article>
      <span class="feature-icon" aria-hidden="true"><i class="${escapeHtml(item.icon || "fa-solid fa-star")}"></i></span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join("");
}

function renderShowcase() {
  const showcase = data.featureShowcase || {};
  setText("[data-showcase-eyebrow]", showcase.eyebrow);
  setText("[data-showcase-title]", showcase.title);
  setText("[data-showcase-text]", showcase.text);
  const mount = document.querySelector("[data-showcase]");
  if (!mount) return;
  mount.innerHTML = (showcase.cards || []).map((card) => {
    const imageSrc = normalizeAssetPath(card.image);
    const imageMarkup = imageSrc
      ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(card.title)}" loading="lazy" decoding="async">`
      : `<div class="showcase-icon" aria-hidden="true"><i class="${escapeHtml(card.icon || "fa-solid fa-star")}"></i></div>`;
    return `
    <article class="showcase-card">
      ${imageMarkup}
      <div class="showcase-card-body">
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.text)}</p>
      </div>
    </article>
  `;
  }).join("");
}

function renderChampions() {
  const champions = data.championSupport || {};
  setText("[data-champions-eyebrow]", champions.eyebrow);
  setText("[data-champions-title]", champions.title);
  setText("[data-champions-text]", champions.text);
  const mount = document.querySelector("[data-champions]");
  if (!mount) return;
  mount.innerHTML = (champions.champions || []).map((name) => `
    <span>${escapeHtml(name)}</span>
  `).join("");
}

function renderProof() {
  const proof = data.proof || {};
  setText("[data-proof-eyebrow]", proof.eyebrow);
  setText("[data-proof-title]", proof.title);
  setText("[data-proof-text]", proof.text);
  const mount = document.querySelector("[data-proof]");
  if (!mount) return;
  mount.innerHTML = (proof.items || []).map((item) => `
    <article class="proof-card">
      <span>${escapeHtml(item.rating)}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.quote)}</p>
    </article>
  `).join("");
}

function renderProcess() {
  const process = data.howItWorks || {};
  setText("[data-process-eyebrow]", process.eyebrow);
  setText("[data-process-title]", process.title);
  setText("[data-process-text]", process.text);
  const image = document.querySelector("[data-process-image]");
  if (image && process.image) image.src = process.image;
  const mount = document.querySelector("[data-process]");
  if (!mount) return;
  mount.innerHTML = (process.steps || []).map((step, index) => `
    <article>
      <strong>${String(index + 1).padStart(2, "0")}</strong>
      <div>
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.text)}</p>
      </div>
    </article>
  `).join("");
}

function renderComparison() {
  const comparison = data.comparison || {};
  setText("[data-comparison-eyebrow]", comparison.eyebrow);
  setText("[data-comparison-title]", comparison.title);
  setText("[data-comparison-left-title]", comparison.leftTitle);
  setText("[data-comparison-right-title]", comparison.rightTitle);

  const left = document.querySelector("[data-comparison-left]");
  const right = document.querySelector("[data-comparison-right]");
  if (left) left.innerHTML = (comparison.leftItems || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  if (right) right.innerHTML = (comparison.rightItems || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderMedia() {
  const media = data.media || {};
  setText("[data-media-eyebrow]", media.eyebrow);
  setText("[data-media-title]", media.title);
  setText("[data-media-text]", media.text);
  const image = document.querySelector("[data-media-image]");
  if (image && media.image) image.src = media.image;
}

function renderFaq() {
  const faq = data.faq || {};
  setText("[data-faq-eyebrow]", faq.eyebrow);
  setText("[data-faq-title]", faq.title);
  const mount = document.querySelector("[data-faq]");
  if (!mount) return;
  mount.innerHTML = (faq.items || []).map((item, index) => `
    <details ${index === 0 ? "open" : ""}>
      <summary>${escapeHtml(item.question)}</summary>
      <p>${escapeHtml(item.answer)}</p>
    </details>
  `).join("");
}

function renderBlogs() {
  const mount = document.querySelector("[data-blogs]");
  if (!mount) return;
  mount.innerHTML = (data.blogs || []).map((blog) => `
    <article class="blog-card" id="${escapeHtml(blog.slug)}">
      <img src="${escapeHtml(blog.image)}" alt="${escapeHtml(blog.title)}">
      <div>
        <span>${escapeHtml(blog.date)}</span>
        <h3>${escapeHtml(blog.title)}</h3>
        <p>${escapeHtml(blog.excerpt)}</p>
      </div>
    </article>
  `).join("");
}

applySiteData();
renderStats();
renderCategories();
renderProducts(categories[0]?.id || "lol");
loadSellhubPrices();
renderShowcase();
renderChampions();
renderProof();
renderProcess();
renderFaq();
startSaleCountdown();
renderBlogs();

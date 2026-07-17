(function () {
  const catalog = {};
  let loaded = false;
  let selectedVariants = {};

  function money(amount) {
    const cents = Math.round(Number(amount) * 100);
    return window.LOLCurrency ? window.LOLCurrency.formatCents(cents) : `$${Number(amount).toFixed(2)}`;
  }

  function getProduct(slug) {
    return catalog[slug] || null;
  }

  function pickVariant(product, variantId) {
    const variants = product?.variants || [];
    if (!variants.length) return null;
    if (variantId) return variants.find((v) => v.id === variantId) || variants[0];
    return variants.reduce((best, v) => (!best || v.price < best.price ? v : best), null);
  }

  function ensureModal() {
    let modal = document.querySelector("[data-sellhub-checkout]");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "sellhub-checkout";
    modal.setAttribute("data-sellhub-checkout", "");
    modal.hidden = true;
    modal.innerHTML = `
      <div class="sellhub-checkout-backdrop" data-close-checkout></div>
      <div class="sellhub-checkout-panel" role="dialog" aria-modal="true" aria-labelledby="sellhub-checkout-title">
        <div class="sellhub-checkout-head">
          <h2 id="sellhub-checkout-title">Secure Checkout</h2>
          <button type="button" class="sellhub-checkout-close" data-close-checkout aria-label="Close">&times;</button>
        </div>
        <form class="sellhub-checkout-form" data-checkout-form>
          <div class="sellhub-checkout-summary" data-checkout-summary></div>
          <label class="sellhub-field">
            <span>Email for key delivery</span>
            <input type="email" name="email" required autocomplete="email" placeholder="you@email.com">
          </label>
          <label class="sellhub-terms">
            <input type="checkbox" name="acceptedTerms" required data-checkout-terms>
            <span>I have read and agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>. Purchases are only available after acceptance.</span>
          </label>
          <p class="sellhub-checkout-error" data-checkout-error hidden></p>
          <button type="submit" class="button primary sellhub-checkout-submit">Continue to Payment</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-checkout]")) closeCheckout();
    });

    modal.querySelector("form").addEventListener("submit", submitCheckout);
    window.LOLScriptTerms?.bindCheckbox?.(modal.querySelector("[data-checkout-terms]"));
    return modal;
  }

  function openCheckout(items) {
    const modal = ensureModal();
    const summary = modal.querySelector("[data-checkout-summary]");
    const error = modal.querySelector("[data-checkout-error]");
    const termsInput = modal.querySelector("[data-checkout-terms]");

    error.hidden = true;
    error.textContent = "";
    summary.innerHTML = items
      .map(
        (item) => `
        <div class="sellhub-checkout-line">
          <div>
            <strong>${escapeHtml(item.productName)}</strong>
            ${item.variantName ? `<span>${escapeHtml(item.variantName)}</span>` : ""}
          </div>
          <strong>${escapeHtml(money(item.variantPrice * (item.quantity || 1)))}</strong>
        </div>`
      )
      .join("");

    modal.dataset.payload = JSON.stringify(items);
    modal.hidden = false;
    document.body.classList.add("sellhub-checkout-open");
    if (termsInput) {
      termsInput.checked = window.LOLScriptTerms?.isAccepted?.() || false;
    }
    modal.querySelector('input[name="email"]')?.focus();
  }

  function closeCheckout() {
    const modal = document.querySelector("[data-sellhub-checkout]");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("sellhub-checkout-open");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  let toastTimer = null;
  function showToast(message) {
    let toast = document.querySelector("[data-sellhub-toast]");
    if (!toast) {
      toast = document.createElement("div");
      toast.setAttribute("data-sellhub-toast", "");
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.style.cssText = [
        "position:fixed",
        "left:50%",
        "bottom:28px",
        "transform:translateX(-50%) translateY(16px)",
        "max-width:min(92vw,420px)",
        "padding:14px 18px",
        "background:#101319",
        "color:#f4f6fb",
        "border:1px solid rgba(120,140,255,0.35)",
        "border-radius:12px",
        "box-shadow:0 12px 30px rgba(0,0,0,0.45)",
        "font-size:14px",
        "line-height:1.45",
        "text-align:center",
        "z-index:99999",
        "opacity:0",
        "transition:opacity .25s ease, transform .25s ease",
        "pointer-events:none",
      ].join(";");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(16px)";
    }, 5000);
  }

  const UNAVAILABLE_MESSAGE =
    "Checkout is temporarily unavailable. Please try again in about 5 minutes.";

  function isCheckoutReady(slug) {
    return Boolean(getProduct(slug)?.productId);
  }

  async function submitCheckout(event) {
    event.preventDefault();
    const modal = ensureModal();
    const form = event.target;
    const error = modal.querySelector("[data-checkout-error]");
    const submit = form.querySelector(".sellhub-checkout-submit");
    const email = form.querySelector('input[name="email"]')?.value?.trim();
    const acceptedTerms = form.querySelector('input[name="acceptedTerms"]')?.checked;

    let items = [];
    try {
      items = JSON.parse(modal.dataset.payload || "[]");
    } catch (_) {
      items = [];
    }

    if (!email || !acceptedTerms || !items.length) return;

    window.LOLScriptTerms?.setAccepted?.(true);

    submit.disabled = true;
    error.hidden = true;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          acceptedTerms: true,
          returnUrl: `${window.location.origin}/?checkout=success`,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      error.textContent = String(err.message || err);
      error.hidden = false;
    } finally {
      submit.disabled = false;
    }
  }

  function renderVariantPicker(slug, product) {
    const mount = document.querySelector(`[data-variant-picker="${slug}"]`);
    if (!mount || !product?.variants?.length) return;

    const variants = product.variants;
    const initial = pickVariant(product, selectedVariants[slug]);
    selectedVariants[slug] = initial.id;

    mount.innerHTML = `
      <p class="variant-label">Choose plan</p>
      <div class="variant-pills" role="listbox" aria-label="Plan length">
        ${variants
          .map(
            (variant) => `
          <button type="button" class="variant-pill${variant.id === initial.id ? " active" : ""}"
            data-variant-id="${escapeHtml(variant.id)}"
            data-variant-slug="${escapeHtml(slug)}"
            role="option"
            aria-selected="${variant.id === initial.id}">
            <span>${escapeHtml(variant.name)}</span>
            <strong>${escapeHtml(money(variant.price))}</strong>
          </button>`
          )
          .join("")}
      </div>
    `;

    updatePriceForVariant(slug, initial);
  }

  function formatPlanNote(variant) {
    if (!variant?.name) return "per plan • instant delivery";
    const label = String(variant.name).replace(/\s*key$/i, "").trim();
    return `${label} • instant delivery`;
  }

  function updatePriceForVariant(slug, variant) {
    if (!variant) return;
    const cents = Math.round(Number(variant.price) * 100);
    document.querySelectorAll(`[data-price-slug="${slug}"]`).forEach((el) => {
      el.dataset.moneyUsdCents = String(cents);
      el.textContent = money(variant.price);
    });
    document.querySelectorAll(`[data-price-note-slug="${slug}"]`).forEach((el) => {
      el.textContent = formatPlanNote(variant);
    });
    window.LOLCurrency?.apply(document);
  }

  function buildCheckoutItem(slug, quantity) {
    const product = getProduct(slug);
    if (!product?.productId) return null;
    const variant = pickVariant(product, selectedVariants[slug]);
    if (!variant?.id) return null;
    return {
      productId: product.productId,
      variantId: variant.id,
      variantName: variant.name,
      variantPrice: variant.price,
      quantity: quantity || 1,
      productName: product.name || slug,
      productSlug: slug,
    };
  }

  function handleBuyClick(event, slug, quantity) {
    const product = getProduct(slug);
    const item = buildCheckoutItem(slug, quantity);
    if (item) {
      event.preventDefault();
      openCheckout([item]);
      return true;
    }
    if (product?.url && /^https?:\/\//.test(product.url)) return false;
    event.preventDefault();
    return false;
  }

  function applyCatalog(data) {
    Object.assign(catalog, data.products || {});
    const first = Object.values(catalog).find((p) => p?.url?.includes("sellhub"));
    if (first?.url) {
      try {
        window.LOLSellhubStoreUrl = new URL(first.url).origin;
      } catch (_) {}
    }

    Object.keys(catalog).forEach((slug) => {
      const product = catalog[slug];
      if (!product) return;
      renderVariantPicker(slug, product);

      if (Number(product.price) > 0 && !product.variants?.length) {
        const cents = Math.round(Number(product.price) * 100);
        document.querySelectorAll(`[data-price-slug="${slug}"]`).forEach((el) => {
          el.dataset.moneyUsdCents = String(cents);
          el.textContent = money(product.price);
        });
      }

      document.querySelectorAll(`[data-buy-slug="${slug}"]`).forEach((el) => {
        if (product.productId) {
          el.removeAttribute("target");
          el.removeAttribute("rel");
          el.dataset.checkoutReady = "true";
        } else if (product.url) {
          el.href = product.url;
          if (/^https?:\/\//.test(product.url)) {
            el.target = "_blank";
            el.rel = "noreferrer";
          }
        }
      });
    });

    window.LOLCurrency?.apply(document);
    loaded = true;
    window.dispatchEvent(new CustomEvent("lolscript-sellhub-ready", { detail: catalog }));
    window.LOLScriptProductShowcase?.init?.(catalog);
  }

  async function loadCatalog() {
    try {
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (!res.ok) return;
      applyCatalog(await res.json());
    } catch (_) {}
  }

  document.addEventListener("click", (event) => {
    const variantBtn = event.target.closest("[data-variant-id][data-variant-slug]");
    if (variantBtn) {
      event.preventDefault();
      const slug = variantBtn.getAttribute("data-variant-slug");
      const variantId = variantBtn.getAttribute("data-variant-id");
      selectedVariants[slug] = variantId;
      variantBtn.closest(".variant-pills")?.querySelectorAll(".variant-pill").forEach((btn) => {
        const active = btn === variantBtn;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
      const product = getProduct(slug);
      updatePriceForVariant(slug, pickVariant(product, variantId));
      return;
    }

    const buyBtn = event.target.closest("[data-buy-slug]");
    if (buyBtn) {
      const slug = buyBtn.getAttribute("data-buy-slug");
      if (buyBtn.dataset.checkoutReady === "true") {
        handleBuyClick(event, slug, 1);
      } else {
        event.preventDefault();
        showToast(UNAVAILABLE_MESSAGE);
      }
      return;
    }

    const cartBtn = event.target.closest("[data-add-to-cart]");
    if (cartBtn) {
      const slug = cartBtn.getAttribute("data-add-to-cart");
      if (!loaded || !isCheckoutReady(slug)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showToast(UNAVAILABLE_MESSAGE);
        return;
      }
      const item = buildCheckoutItem(slug, cartBtn.getAttribute("data-cart-quantity") || 1);
      if (item) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openCheckout([item]);
      } else {
        event.preventDefault();
        event.stopImmediatePropagation();
        showToast(UNAVAILABLE_MESSAGE);
      }
    }
  }, true);

  window.LOLSellhub = {
    catalog,
    load: loadCatalog,
    getProduct,
    openCheckout,
    buildCheckoutItem,
  };

  loadCatalog();
})();

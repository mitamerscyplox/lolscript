(function () {
  const storageKey = "LOLSCRIPT_CART";

  function readCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(storageKey, JSON.stringify(items));
    updateCartCount();
    window.dispatchEvent(new CustomEvent("lolscriptcartchange"));
  }

  function track(type, extra) {
    window.LOLScriptAnalytics?.track?.(type, extra || {});
  }

  function addToCart(slug, quantity) {
    if (!slug) return;
    const cart = readCart();
    const existing = cart.find((item) => item.slug === slug);
    if (existing) {
      existing.quantity = Math.max(1, Math.min(5, Number(existing.quantity || 1) + Number(quantity || 1)));
    } else {
      cart.push({ slug, quantity: Math.max(1, Math.min(5, Number(quantity || 1))) });
    }
    writeCart(cart);
    track("add_to_cart", { product: slug, cartItems: cart });
    showCartToast("Added to cart");
  }

  function addBundle(slugs) {
    const incoming = String(slugs || "").split(",").map((slug) => slug.trim()).filter(Boolean);
    const cart = readCart();
    incoming.forEach((slug) => {
      const existing = cart.find((item) => item.slug === slug);
      if (existing) existing.quantity = Math.max(1, Math.min(5, Number(existing.quantity || 1) + 1));
      else cart.push({ slug, quantity: 1 });
    });
    writeCart(cart);
    showCartToast("Starter bundle added");
  }

  function updateCartCount() {
    const count = readCart().reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);
    document.querySelectorAll(".cart-link").forEach((link) => {
      link.href = "/#products";
      const countNode = link.querySelector("span");
      if (countNode) countNode.textContent = String(count);
      link.setAttribute("aria-label", count ? `Cart with ${count} item${count === 1 ? "" : "s"}` : "Cart");
    });
  }

  function showCartToast(message) {
    let toast = document.querySelector("[data-cart-toast]");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "cart-toast";
      toast.setAttribute("data-cart-toast", "");
      toast.innerHTML = '<strong></strong><a class="button primary" href="/#products">View Products</a>';
      document.body.appendChild(toast);
    }
    const label = toast.querySelector("strong");
    if (label) label.textContent = message;
    toast.classList.add("show");
    clearTimeout(showCartToast.timer);
    showCartToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-to-cart]");
    if (!button) return;
    event.preventDefault();
    addToCart(button.getAttribute("data-add-to-cart"), button.getAttribute("data-cart-quantity") || 1);
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-bundle]");
    if (!button) return;
    event.preventDefault();
    addBundle(button.getAttribute("data-add-bundle"));
    track("add_to_cart", { category: "bundle", offer: "starter_bundle", cartItems: readCart() });
  });

  window.LOLScriptCart = { read: readCart, write: writeCart, add: addToCart, addBundle, update: updateCartCount };
  updateCartCount();
  window.addEventListener("storage", updateCartCount);
})();

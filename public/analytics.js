(function () {
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;

  const visitorKey = "lolscript_visitor_id";
  const sessionKey = "lolscript_session_id";
  const sessionStartedKey = "lolscript_session_started";
  const now = Date.now();
  const maxSessionAge = 30 * 60 * 1000;

  function id(prefix) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${now}_${Math.random().toString(16).slice(2)}`;
  }

  let visitorId = localStorage.getItem(visitorKey);
  if (!visitorId) {
    visitorId = id("v");
    localStorage.setItem(visitorKey, visitorId);
  }

  let sessionId = sessionStorage.getItem(sessionKey);
  const sessionStarted = Number(sessionStorage.getItem(sessionStartedKey) || 0);
  if (!sessionId || now - sessionStarted > maxSessionAge) {
    sessionId = id("s");
    sessionStorage.setItem(sessionKey, sessionId);
    sessionStorage.setItem(sessionStartedKey, String(now));
  }

  const started = performance.now();
  const params = new URLSearchParams(location.search);

  function payload(type, durationSeconds, extra) {
    return {
      type,
      path: location.pathname,
      title: document.title,
      referrer: document.referrer,
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      visitorId,
      sessionId,
      language: navigator.language || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      screen: `${screen.width}x${screen.height}`,
      durationSeconds: Math.max(0, Math.round(durationSeconds || 0)),
      ...(extra || {}),
    };
  }

  function send(data) {
    const body = JSON.stringify(data);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
      return;
    }
    fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(function () {});
  }

  window.LOLScriptAnalytics = {
    track: function (type, extra) {
      send(payload(type, (performance.now() - started) / 1000, extra || {}));
    },
    ids: function () {
      return { visitorId, sessionId };
    }
  };

  send(payload("pageview", 0));
  document.addEventListener("click", function (event) {
    const link = event.target.closest("a,button");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    const label = (link.textContent || link.getAttribute("aria-label") || "").trim().slice(0, 120);
    const buySlug = link.getAttribute("data-buy-slug");
    if (buySlug) {
      send(payload("product_click", (performance.now() - started) / 1000, { target: label, product: buySlug }));
    } else if (href === "#products" || href === "/#products" || href.endsWith("/#products")) {
      send(payload("product_click", (performance.now() - started) / 1000, { target: label || "products", category: "products" }));
    }
  });

  document.addEventListener("change", function (event) {
    const input = event.target;
    if (!input || input.name !== "payment_method") return;
    send(payload("payment_select", (performance.now() - started) / 1000, { paymentMethod: input.value || "" }));
  });

  document.addEventListener("input", function (event) {
    const form = event.target.closest("[data-checkout-form]");
    if (!form || form.dataset.analyticsStarted === "true") return;
    form.dataset.analyticsStarted = "true";
    send(payload("checkout_start", (performance.now() - started) / 1000, {
      product: form.querySelector('[name="product"]')?.value || "",
      cartItems: form.querySelector('[name="cart_payload"]')?.value || "",
    }));
  });

  document.addEventListener("submit", function (event) {
    const form = event.target.closest("[data-checkout-form]");
    if (!form) return;
    send(payload("checkout_submit", (performance.now() - started) / 1000, {
      product: form.querySelector('[name="product"]')?.value || "",
      cartItems: form.querySelector('[name="cart_payload"]')?.value || "",
      paymentMethod: form.querySelector('[name="payment_method"]:checked')?.value || "",
    }));
  });

  let sentEngagement = false;
  function sendEngagement() {
    if (sentEngagement) return;
    sentEngagement = true;
    send(payload("engagement", (performance.now() - started) / 1000));
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") sendEngagement();
  });
  window.addEventListener("pagehide", sendEngagement);
})();

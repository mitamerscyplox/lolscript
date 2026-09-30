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

  const GIFT_CARD_SHOPS = [
    { name: "CoinGate", url: "https://coingate.com/gift-cards/binance-gift-card-usdt" },
    { name: "Dundle", url: "https://dundle.com/binance/" },
    { name: "Eneba", url: "https://www.eneba.com/" },
  ];
  const STEP_ORDER = { details: 0, method: 1, giftcard: 2, processing: 2, success: 3 };
  const STEP_BACK = { method: "details", giftcard: "method" };
  let giftCardEnabled = false;
  let pausedVideos = [];

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
          <button type="button" class="sellhub-checkout-back" data-checkout-back aria-label="Back" hidden>&#8592;</button>
          <h2 id="sellhub-checkout-title">Secure Checkout</h2>
          <button type="button" class="sellhub-checkout-close" data-close-checkout aria-label="Close">&times;</button>
        </div>
        <ol class="sellhub-steps" data-checkout-steps aria-label="Checkout progress">
          <li data-step-dot="0"><span>1</span>Details</li>
          <li data-step-dot="1"><span>2</span>Payment</li>
          <li data-step-dot="2"><span>3</span>Confirm</li>
        </ol>

        <div class="sellhub-checkout-summary" data-checkout-summary></div>

        <form class="sellhub-checkout-form" data-step="details">
          <label class="sellhub-field">
            <span>Email for key delivery</span>
            <input type="email" name="email" required autocomplete="email" placeholder="you@email.com">
            <small class="sellhub-field-hint">Your license key and receipt are sent to this address.</small>
          </label>
          <label class="sellhub-field">
            <span>Discount code</span>
            <input type="text" name="coupon" autocomplete="off" spellcheck="false" placeholder="Optional" maxlength="40">
            <small class="sellhub-coupon-note" data-coupon-note hidden></small>
          </label>
          <label class="sellhub-terms">
            <input type="checkbox" name="acceptedTerms" required data-checkout-terms>
            <span>I have read and agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>. Purchases are only available after acceptance.</span>
          </label>
          <p class="sellhub-checkout-error" data-checkout-error hidden></p>
          <button type="submit" class="button primary sellhub-checkout-submit" data-details-submit>Continue</button>
        </form>

        <div class="sellhub-step" data-step="method" hidden>
          <p class="sellhub-step-title">Choose a payment method</p>
          <button type="button" class="sellhub-method" data-choose-method="card">
            <span class="sellhub-method-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/></svg>
            </span>
            <span class="sellhub-method-text">
              <strong>Card / Crypto</strong>
              <small>Visa, Mastercard, Apple Pay, Google Pay and crypto through secure Sellhub checkout.</small>
            </span>
            <span class="sellhub-method-arrow" aria-hidden="true">&#8250;</span>
          </button>
          <button type="button" class="sellhub-method" data-choose-method="giftcard" hidden>
            <span class="sellhub-method-icon is-binance" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.624 13.92l2.718 2.716-7.354 7.353-7.353-7.352 2.718-2.717 4.635 4.66 4.636-4.66zm4.637-4.636L24 12l-2.715 2.716L18.568 12l2.693-2.716zm-9.272.001l2.716 2.691-2.716 2.718L9.272 12l2.717-2.715zm-9.273-.001L5.409 12l-2.692 2.692L0 12l2.716-2.716zM11.989.012l7.353 7.329-2.718 2.715-4.635-4.635-4.636 4.66-2.717-2.716L11.989.012z"/></svg>
            </span>
            <span class="sellhub-method-text">
              <strong>Binance Gift Card <em class="sellhub-badge">Instant</em></strong>
              <small>Pay with a Binance USDT gift card. Your key is delivered automatically on screen.</small>
            </span>
            <span class="sellhub-method-arrow" aria-hidden="true">&#8250;</span>
          </button>
          <p class="sellhub-checkout-error" data-method-error hidden></p>
          <button type="button" class="sellhub-link-btn" data-remove-coupon hidden>Remove discount code and continue</button>
          <p class="sellhub-secure-note">Payments are encrypted. We never see or store your card details.</p>
        </div>

        <form class="sellhub-checkout-form" data-step="giftcard" hidden>
          <div class="sellhub-amount">
            <span>Amount to pay</span>
            <strong data-gift-amount>0.00 USDT</strong>
            <em class="sellhub-amount-product" data-gift-product></em>
            <small data-gift-amount-note>Your gift card value must be equal to or higher than this amount.</small>
          </div>
          <p class="sellhub-step-title">How to pay with a Binance Gift Card</p>
          <ol class="sellhub-howto">
            <li>
              <strong>Buy a Binance USDT Gift Card</strong>
              <span>Worth at least <b data-gift-amount-inline>0.00 USDT</b> from a trusted provider. Cards come in fixed values, so pick the nearest one above.</span>
              <span class="sellhub-shops">
                ${GIFT_CARD_SHOPS.map((shop) => `<a href="${shop.url}" target="_blank" rel="noopener noreferrer">${shop.name} &#8599;</a>`).join("")}
              </span>
            </li>
            <li>
              <strong>Copy the redemption code</strong>
              <span>Use the gift card code (letters and numbers), not the reference number.</span>
            </li>
            <li>
              <strong>Paste it below and pay</strong>
              <span>The card is verified instantly and your key is shown here and emailed to you.</span>
            </li>
          </ol>
          <label class="sellhub-field">
            <span>Gift card code (USDT)</span>
            <input type="text" name="giftcode" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Paste your redemption code" maxlength="60">
            <small class="sellhub-field-hint" data-giftcode-hint>Letters and numbers only, usually 16 characters.</small>
          </label>
          <ul class="sellhub-important">
            <li>Each gift card code can only be used once.</li>
            <li>Extra value above the order total is not refunded.</li>
            <li>Never share your Binance login details. We only need the code.</li>
          </ul>
          <p class="sellhub-checkout-error" data-gift-error hidden></p>
          <button type="submit" class="button primary sellhub-checkout-submit" data-gift-submit>Pay with Gift Card</button>
        </form>

        <div class="sellhub-step sellhub-processing" data-step="processing" hidden aria-live="polite">
          <div class="sellhub-spinner" aria-hidden="true"></div>
          <h3>Processing your payment</h3>
          <p>Please keep this window open. This usually takes a few seconds.</p>
          <ul class="sellhub-stages">
            <li data-stage="0">Verifying gift card</li>
            <li data-stage="1">Creating your order</li>
            <li data-stage="2">Delivering your key</li>
          </ul>
        </div>

        <div class="sellhub-checkout-success" data-step="success" hidden></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-checkout]")) closeCheckout();
      if (event.target.closest("[data-checkout-back]")) {
        const back = STEP_BACK[modal.dataset.step];
        if (back) showStep(modal, back);
      }
      const method = event.target.closest("[data-choose-method]");
      if (method) chooseMethod(modal, method);
      if (event.target.closest("[data-remove-coupon]")) removeCouponAndRetry(modal);
      const copyBtn = event.target.closest("[data-copy-key]");
      if (copyBtn) {
        navigator.clipboard?.writeText(copyBtn.dataset.copyKey).then(() => {
          copyBtn.textContent = "Copied!";
          setTimeout(() => { copyBtn.textContent = "Copy"; }, 1600);
        }).catch(() => {});
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) closeCheckout();
    });

    modal.querySelector('[data-step="details"]').addEventListener("submit", submitDetails);
    modal.querySelector('[data-step="giftcard"]').addEventListener("submit", submitGiftCard);
    modal.querySelector('input[name="coupon"]').addEventListener("input", () => updateCouponNote(modal));
    modal.querySelector('input[name="giftcode"]').addEventListener("input", () => updateGiftCodeHint(modal));
    window.addEventListener("beforeunload", (event) => {
      if (modal.dataset.busy && modal.dataset.step === "processing") {
        event.preventDefault();
        event.returnValue = "";
      }
    });
    loadGiftCardAvailability(modal);
    window.LOLScriptTerms?.bindCheckbox?.(modal.querySelector("[data-checkout-terms]"));
    return modal;
  }

  function showStep(modal, step) {
    modal.dataset.step = step;
    modal.querySelectorAll("[data-step]").forEach((el) => {
      el.hidden = el.dataset.step !== step;
    });
    const index = STEP_ORDER[step] ?? 0;
    modal.querySelectorAll("[data-step-dot]").forEach((dot) => {
      const i = Number(dot.dataset.stepDot);
      dot.classList.toggle("active", i === index);
      dot.classList.toggle("done", i < index);
    });
    modal.querySelector("[data-checkout-steps]").hidden = step === "success";
    modal.querySelector("[data-checkout-summary]").hidden = ["success", "processing", "giftcard"].includes(step);
    modal.querySelector(".sellhub-checkout-panel").scrollTop = 0;
    modal.querySelector("[data-checkout-back]").hidden = !STEP_BACK[step];
    modal.querySelector(".sellhub-checkout-close").hidden = step === "processing";
    modal.querySelectorAll(".sellhub-checkout-error").forEach((el) => { el.hidden = true; });
    modal.querySelector("[data-remove-coupon]").hidden = true;
    const focusTarget = {
      details: 'input[name="email"]',
      giftcard: 'input[name="giftcode"]',
      method: "[data-choose-method]",
    }[step];
    if (focusTarget) modal.querySelector(focusTarget)?.focus({ preventScroll: true });
  }

  function readItems(modal) {
    try {
      return JSON.parse(modal.dataset.payload || "[]");
    } catch (_) {
      return [];
    }
  }

  function usdt(amount) {
    return `${Number(amount).toFixed(2)} USDT`;
  }

  function normalizeGiftCode(raw) {
    return String(raw || "").trim().replace(/^code-/i, "").replace(/\s+/g, "");
  }

  function isValidGiftCode(code) {
    return code.length >= 10 && code.length <= 40 && /^[A-Za-z0-9]+$/.test(code) && /[0-9]/.test(code) && /[A-Za-z]/.test(code);
  }

  function updateGiftCodeHint(modal) {
    const input = modal.querySelector('input[name="giftcode"]');
    const hint = modal.querySelector("[data-giftcode-hint]");
    const code = normalizeGiftCode(input.value);
    const invalid = code.length > 0 && !isValidGiftCode(code) && (code.length >= 10 || /[^A-Za-z0-9]/.test(code));
    hint.textContent = invalid
      ? "This doesn't look like a gift card code. Copy the redemption code, not the reference number."
      : "Letters and numbers only, usually 16 characters.";
    hint.classList.toggle("is-error", invalid);
    modal.querySelector(".sellhub-error-field")?.classList.remove("sellhub-error-field");
  }

  function quoteKey(modal) {
    const item = readItems(modal)[0] || {};
    return [modal.dataset.email, modal.dataset.coupon || "", item.productId, item.variantId].join("|");
  }

  async function postJson(url, body) {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (_) {
      return { ok: false, network: true, data: {} };
    }
    const data = await res.json().catch(() => null);
    return { ok: res.ok && Boolean(data), status: res.status, network: !data, data: data || {} };
  }

  async function fetchQuote(modal) {
    const item = readItems(modal)[0];
    const result = await postJson("/api/giftcard-checkout", {
      action: "quote",
      email: modal.dataset.email,
      acceptedTerms: true,
      productId: item?.productId,
      variantId: item?.variantId,
      coupon: modal.dataset.coupon || "",
    });
    if (result.ok && result.data.quote) {
      modal._quote = { key: quoteKey(modal), token: result.data.quote, total: Number(result.data.total) };
      return { quote: modal._quote };
    }
    return {
      error: result.network
        ? "Connection problem. Please check your internet and try again."
        : result.data.error || "Could not prepare your order. Please try again.",
      field: result.data.field,
    };
  }

  function renderGiftAmount(modal, total) {
    const amount = usdt(total);
    const item = readItems(modal)[0];
    modal.querySelector("[data-gift-product]").textContent = item
      ? [item.productName, item.variantName].filter(Boolean).join(" · ")
      : "";
    modal.querySelector("[data-gift-amount]").textContent = amount;
    modal.querySelector("[data-gift-amount-inline]").textContent = amount;
    modal.querySelector("[data-gift-amount-note]").textContent = modal.dataset.coupon
      ? `Discount code ${modal.dataset.coupon} applied. Your gift card value must be equal to or higher than this amount.`
      : "Your gift card value must be equal to or higher than this amount.";
    modal.querySelector("[data-gift-submit]").textContent = `Pay ${amount} with Gift Card`;
  }

  function openCheckout(items) {
    const modal = ensureModal();
    const summary = modal.querySelector("[data-checkout-summary]");
    const termsInput = modal.querySelector("[data-checkout-terms]");

    modal.querySelector('input[name="giftcode"]').value = "";
    updateGiftCodeHint(modal);
    modal.querySelectorAll("[data-choose-method]").forEach((btn) => {
      btn.classList.remove("loading");
      btn.disabled = false;
    });
    modal._quote = null;
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

    const couponInput = modal.querySelector('input[name="coupon"]');
    const wheelCoupon = window.LOLScriptWheel?.getCoupon?.() || "";
    if (couponInput && wheelCoupon && !couponInput.value) couponInput.value = wheelCoupon;
    updateCouponNote(modal);
    updateDetailsButton(modal);

    modal.dataset.payload = JSON.stringify(items);
    delete modal.dataset.busy;
    modal.hidden = false;
    document.body.classList.add("sellhub-checkout-open");
    pausedVideos = [...document.querySelectorAll("video")].filter((video) => !video.paused);
    pausedVideos.forEach((video) => video.pause());
    if (termsInput) {
      termsInput.checked = window.LOLScriptTerms?.isAccepted?.() || false;
    }
    showStep(modal, "details");
  }

  async function loadGiftCardAvailability(modal) {
    try {
      const res = await fetch("/api/giftcard-checkout", { cache: "no-store" });
      const data = await res.json();
      giftCardEnabled = Boolean(data?.enabled);
    } catch (_) {
      giftCardEnabled = false;
    }
    modal.querySelector('[data-choose-method="giftcard"]').hidden = !giftCardEnabled;
    updateDetailsButton(modal);
  }

  function updateDetailsButton(modal) {
    const button = modal.querySelector("[data-details-submit]");
    if (button && !button.disabled) button.textContent = giftCardEnabled ? "Continue" : "Continue to Payment";
  }

  function submitDetails(event) {
    event.preventDefault();
    const modal = ensureModal();
    if (modal.dataset.busy) return;
    const form = event.target;
    const email = form.querySelector('input[name="email"]').value.trim();
    const acceptedTerms = form.querySelector('input[name="acceptedTerms"]').checked;
    if (!email || !acceptedTerms || !readItems(modal).length) return;

    window.LOLScriptTerms?.setAccepted?.(true);
    modal.dataset.email = email;
    modal.dataset.coupon = form.querySelector('input[name="coupon"]').value.trim().toUpperCase();

    if (giftCardEnabled) {
      showStep(modal, "method");
      return;
    }
    startCardCheckout(modal, form.querySelector("[data-details-submit]"), form.querySelector("[data-checkout-error]"));
  }

  function showDetailsError(modal, message, field) {
    showStep(modal, "details");
    const error = modal.querySelector("[data-checkout-error]");
    error.textContent = message;
    error.hidden = false;
    const input = field && modal.querySelector(`[data-step="details"] [name="${field === "terms" ? "acceptedTerms" : field}"]`);
    input?.focus();
  }

  function showMethodError(modal, message, offerRemoveCoupon) {
    const error = modal.querySelector("[data-method-error]");
    error.textContent = message;
    error.hidden = false;
    modal.querySelector("[data-remove-coupon]").hidden = !offerRemoveCoupon;
  }

  function removeCouponAndRetry(modal) {
    modal.dataset.coupon = "";
    modal.querySelector('input[name="coupon"]').value = "";
    updateCouponNote(modal);
    modal._quote = null;
    const last = modal.querySelector(`[data-choose-method="${modal.dataset.lastMethod || "card"}"]`);
    if (last) chooseMethod(modal, last);
  }

  async function chooseMethod(modal, button) {
    if (modal.dataset.busy) return;
    const method = button.dataset.chooseMethod;
    modal.dataset.lastMethod = method;
    modal.querySelector("[data-method-error]").hidden = true;
    modal.querySelector("[data-remove-coupon]").hidden = true;

    if (method !== "giftcard") {
      startCardCheckout(modal, button, modal.querySelector("[data-method-error]"));
      return;
    }

    if (modal._quote?.key === quoteKey(modal)) {
      renderGiftAmount(modal, modal._quote.total);
      showStep(modal, "giftcard");
      return;
    }

    modal.dataset.busy = "1";
    button.disabled = true;
    button.classList.add("loading");
    const result = await fetchQuote(modal);
    button.disabled = false;
    button.classList.remove("loading");
    delete modal.dataset.busy;

    if (result.error) {
      if (result.field === "email" || result.field === "terms") {
        showDetailsError(modal, result.error, result.field);
      } else {
        showMethodError(modal, result.error, result.field === "coupon");
      }
      return;
    }
    renderGiftAmount(modal, result.quote.total);
    showStep(modal, "giftcard");
  }

  function markCouponUsed(coupon) {
    if (coupon && coupon === window.LOLScriptWheel?.code) window.LOLScriptWheel.markCouponUsed?.();
  }

  async function startCardCheckout(modal, trigger, error) {
    const coupon = modal.dataset.coupon || "";
    modal.dataset.busy = "1";
    trigger.disabled = true;
    trigger.classList.add("loading");
    const originalLabel = trigger.matches("[data-details-submit]") ? trigger.textContent : null;
    if (originalLabel) trigger.textContent = "Redirecting to payment…";
    error.hidden = true;

    const result = await postJson("/api/checkout", {
      email: modal.dataset.email,
      acceptedTerms: true,
      returnUrl: `${window.location.origin}/?checkout=success`,
      items: readItems(modal),
      coupon,
    });

    if (result.ok && result.data.url) {
      markCouponUsed(coupon);
      window.location.href = result.data.url;
      return;
    }

    const message = result.network
      ? "Connection problem. Please check your internet and try again."
      : result.data.error || "Checkout failed. Please try again.";
    const couponProblem = Boolean(coupon) && /coupon|discount|code/i.test(message);
    if (trigger.matches("[data-choose-method]")) {
      showMethodError(modal, message, couponProblem);
    } else {
      error.textContent = couponProblem ? `${message} Clear the discount code to continue without it.` : message;
      error.hidden = false;
    }
    trigger.classList.remove("loading");
    if (originalLabel) trigger.textContent = originalLabel;
    delete modal.dataset.busy;
    trigger.disabled = false;
  }

  async function submitGiftCard(event) {
    event.preventDefault();
    const modal = ensureModal();
    if (modal.dataset.busy) return;
    const form = event.target;
    const error = form.querySelector("[data-gift-error]");
    const input = form.querySelector('input[name="giftcode"]');
    const code = normalizeGiftCode(input.value);
    const coupon = modal.dataset.coupon || "";

    const showGiftError = (message) => {
      showStep(modal, "giftcard");
      error.textContent = message;
      error.hidden = false;
    };

    if (!isValidGiftCode(code)) {
      showGiftError("Please paste the gift card redemption code (letters and numbers), not the reference number.");
      input.focus();
      return;
    }
    input.value = code;
    if (!modal._quote) {
      showStep(modal, "method");
      return;
    }

    modal.dataset.busy = "1";
    showStep(modal, "processing");
    const stages = [...modal.querySelectorAll("[data-stage]")];
    const setStage = (index) => stages.forEach((el, i) => {
      el.classList.toggle("done", i < index);
      el.classList.toggle("active", i === index);
    });
    setStage(0);
    const timers = [setTimeout(() => setStage(1), 1600), setTimeout(() => setStage(2), 3400)];
    const finish = () => {
      timers.forEach(clearTimeout);
      delete modal.dataset.busy;
    };

    const pay = () => postJson("/api/giftcard-checkout", { action: "pay", quote: modal._quote.token, code });
    let result = await pay();

    if (!result.ok && result.data.code === "quote_expired") {
      const previousTotal = modal._quote.total;
      modal._quote = null;
      const refreshed = await fetchQuote(modal);
      if (refreshed.error) {
        finish();
        showGiftError(refreshed.error);
        return;
      }
      if (Math.abs(refreshed.quote.total - previousTotal) > 0.009) {
        finish();
        renderGiftAmount(modal, refreshed.quote.total);
        showGiftError(`The order total changed to ${usdt(refreshed.quote.total)}. Check that your card covers it, then press Pay again.`);
        return;
      }
      result = await pay();
    }

    finish();

    if (result.ok) {
      markCouponUsed(coupon);
      setStage(3);
      modal._quote = null;
      showCheckoutSuccess(modal, result.data);
      return;
    }
    if (result.network) {
      showGiftError("We couldn't confirm the payment because of a connection problem. Press Pay again with the same code. You will not be charged twice.");
      return;
    }
    if (result.data.code === "already_paid") modal._quote = null;
    showGiftError(result.data.error || "Gift card payment failed. Please try again.");
    if (Number(result.data.retryAfter) > 0) startPayCooldown(modal, Number(result.data.retryAfter));
  }

  function startPayCooldown(modal, seconds) {
    const button = modal.querySelector("[data-gift-submit]");
    const label = button.textContent;
    const until = Date.now() + seconds * 1000;
    clearInterval(modal._cooldownTimer);
    const tick = () => {
      const left = Math.ceil((until - Date.now()) / 1000);
      if (left <= 0 || modal.hidden) {
        clearInterval(modal._cooldownTimer);
        button.disabled = false;
        button.textContent = label;
        return;
      }
      button.disabled = true;
      button.textContent = `Try again in ${left}s`;
    };
    tick();
    modal._cooldownTimer = setInterval(tick, 1000);
  }

  function showCheckoutSuccess(modal, data) {
    const success = modal.querySelector('[data-step="success"]');
    const delivered = data.status === "delivered";
    const keys = Array.isArray(data.keys) ? data.keys : [];
    success.innerHTML = `
      <div class="sellhub-success-icon${delivered ? "" : " is-pending"}" aria-hidden="true">${delivered ? "&#10003;" : "&#8230;"}</div>
      <h3>${delivered ? "Payment approved" : "Payment received"}</h3>
      <p>${escapeHtml(data.message || "")}</p>
      ${keys
        .map(
          (key) => `
        <div class="sellhub-key">
          <code>${escapeHtml(key)}</code>
          <button type="button" data-copy-key="${escapeHtml(key)}">Copy</button>
        </div>`
        )
        .join("")}
      <p class="sellhub-success-meta">Order ID: <code>${escapeHtml(data.invoiceId || "-")}</code></p>
      <p class="sellhub-success-meta">A copy was sent to <strong>${escapeHtml(modal.dataset.email || "your email")}</strong>. Not there within a few minutes? Check spam, then open a ticket on Discord with your order ID.</p>
      <button type="button" class="button primary sellhub-checkout-submit" data-close-checkout>Done</button>
    `;
    showStep(modal, "success");
  }

  function updateCouponNote(modal) {
    const input = modal.querySelector('input[name="coupon"]');
    const note = modal.querySelector("[data-coupon-note]");
    if (!input || !note) return;
    const code = input.value.trim().toUpperCase();
    const wheel = window.LOLScriptWheel;
    if (code && wheel && code === wheel.code) {
      note.textContent = `${wheel.percent}% off will be applied to your order.`;
      note.hidden = false;
    } else if (code) {
      note.textContent = "Your code will be checked at payment.";
      note.hidden = false;
    } else {
      note.hidden = true;
    }
  }

  function closeCheckout() {
    const modal = document.querySelector("[data-sellhub-checkout]");
    if (!modal || modal.dataset.busy) return;
    modal.hidden = true;
    document.body.classList.remove("sellhub-checkout-open");
    pausedVideos.forEach((video) => video.play?.().catch(() => {}));
    pausedVideos = [];
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

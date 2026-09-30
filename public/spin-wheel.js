(function () {
  // The code must exist as an active coupon in the Sellhub dashboard.
  const COUPON_CODE = "SPIN10";
  const COUPON_PERCENT = 10;
  const STORAGE_KEY = "lolscript:wheel";
  const COUPON_TTL_MS = 14 * 24 * 60 * 60 * 1000;
  const AUTO_OPEN_DELAY_MS = 6000;

  // Every spin lands on one of the "10%" segments; the others are decoration.
  const SEGMENTS = [
    { label: "5%", value: 5, win: false },
    { label: "10%", value: 10, win: true },
    { label: "20%", value: 20, win: false },
    { label: "10%", value: 10, win: true },
    { label: "15%", value: 15, win: false },
    { label: "10%", value: 10, win: true },
    { label: "25%", value: 25, win: false },
    { label: "10%", value: 10, win: true },
  ];
  const STEP = 360 / SEGMENTS.length;
  const SPIN_MS = 7000;
  const SPIN_TURNS = 7;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function readState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (state?.status === "won" && Date.now() - state.at > COUPON_TTL_MS) return { status: "expired" };
      return state;
    } catch (_) {
      return null;
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, at: state.at || Date.now() }));
    } catch (_) {}
  }

  function getCoupon() {
    const state = readState();
    return state?.status === "won" && !state.used ? state.code : "";
  }

  function markCouponUsed() {
    const state = readState();
    if (state?.status === "won") writeState({ ...state, used: true });
  }

  const css = `
.lw-modal[hidden], .lw-fab[hidden] { display: none !important; }
.lw-modal { position: fixed; inset: 0; z-index: 1150; display: grid; place-items: center; padding: 18px; }
.lw-backdrop { position: absolute; inset: 0; background: rgba(4,3,10,.9); animation: lw-fade .3s ease; }
.lw-panel { position: relative; display: flex; width: min(900px, 100%); max-height: 94vh; overflow: auto; border-radius: 22px;
  border: 1px solid rgba(167,139,250,.22); background: #0b0712; box-shadow: 0 30px 90px rgba(0,0,0,.6), 0 0 0 1px rgba(139,92,246,.08);
  animation: lw-pop .35s cubic-bezier(.2,.9,.3,1.2); }
.lw-close { position: absolute; top: 14px; right: 14px; z-index: 6; width: 38px; height: 38px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); color: #fff; font-size: 22px; line-height: 1; cursor: pointer; }
.lw-close:hover { background: rgba(255,255,255,.14); }
.lw-confetti { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; }
.lw-pane { flex: 1 1 50%; min-width: 0; display: flex; flex-direction: column; justify-content: center; padding: 52px 44px; }
.lw-eyebrow { margin: 0 0 12px; color: var(--accent-soft, #a78bfa); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.lw-title { margin: 0 0 10px; color: #fff; font-size: clamp(28px, 3.4vw, 36px); line-height: 1.08; font-weight: 900; }
.lw-title em { font-style: normal; background: linear-gradient(90deg, #c4b5fd, #ff5f8f); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lw-sub { margin: 0 0 26px; color: var(--muted, #b6acc9); font-size: 15px; line-height: 1.55; }
.lw-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 52px; padding: 0 28px; border-radius: 14px;
  border: 1px solid rgba(196,181,253,.45); background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: #fff; font-size: 16px; font-weight: 800;
  cursor: pointer; box-shadow: 0 10px 30px rgba(139,92,246,.4); transition: transform .2s ease, box-shadow .2s ease; }
.lw-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 38px rgba(139,92,246,.55); }
.lw-btn:disabled { opacity: .6; cursor: default; }
.lw-hint { margin: 14px 0 0; color: rgba(255,255,255,.38); font-size: 13px; }
.lw-code { display: flex; align-items: stretch; margin: 0 0 14px; border-radius: 14px; border: 1px dashed rgba(196,181,253,.55); background: rgba(139,92,246,.1); overflow: hidden; }
.lw-code strong { flex: 1; display: flex; align-items: center; padding: 0 18px; color: #fff; font-size: 22px; letter-spacing: .12em; font-weight: 900; }
.lw-copy { min-width: 92px; border: 0; border-left: 1px dashed rgba(196,181,253,.4); background: rgba(255,255,255,.04); color: #e9e3ff; font-weight: 800; cursor: pointer; }
.lw-copy:hover { background: rgba(255,255,255,.1); }
.lw-note { margin: 14px 0 0; color: rgba(255,255,255,.45); font-size: 13px; line-height: 1.5; }
.lw-decline { margin-top: 18px; padding: 0; border: 0; background: none; color: rgba(255,255,255,.42); font-size: 13px; text-decoration: underline; cursor: pointer; text-align: left; }
.lw-decline:hover { color: rgba(255,255,255,.75); }
.lw-visual { flex: 1 1 50%; position: relative; display: flex; align-items: center; justify-content: center; padding: 44px 30px; overflow: hidden;
  border-left: 1px solid rgba(255,255,255,.06); background: radial-gradient(circle at 50% 45%, rgba(139,92,246,.18), transparent 62%), #08050e; }
.lw-wrap { position: relative; width: min(340px, 62vw); aspect-ratio: 1; }
.lw-wrap::before { content: ""; position: absolute; inset: -28px; border-radius: 50%; background: radial-gradient(circle, rgba(139,92,246,.32) 52%, rgba(139,92,246,.14) 60%, rgba(139,92,246,.04) 67%, transparent 72%); pointer-events: none; }
.lw-wrap::after { content: ""; position: absolute; inset: 0; z-index: 1; border-radius: 50%; box-shadow: inset 0 0 50px rgba(0,0,0,.55); pointer-events: none; }
.lw-disc { position: absolute; inset: 0; border-radius: 50%; border: 4px solid rgba(196,181,253,.28); box-shadow: 0 18px 50px rgba(0,0,0,.6);
  will-change: transform; transform: translateZ(0); backface-visibility: hidden; contain: layout paint; }
.lw-seg { position: absolute; inset: 0; display: flex; justify-content: center; pointer-events: none; }
.lw-seg span { margin-top: 9%; line-height: 1; color: #fff; font-weight: 900; font-size: clamp(16px, 2.2vw, 21px); text-shadow: 0 2px 8px rgba(0,0,0,.6); }
.lw-pointer { position: absolute; top: -16px; left: 50%; z-index: 3; transform: translateX(-50%); width: 0; height: 0;
  border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 22px solid #fff;
  transform-origin: 50% 0; will-change: transform; }
.lw-hub { position: absolute; top: 50%; left: 50%; z-index: 2; width: 24%; height: 24%; transform: translate(-50%, -50%); display: grid; place-items: center;
  border-radius: 50%; border: 2px solid rgba(196,181,253,.4); background: #0b0712; box-shadow: 0 6px 22px rgba(0,0,0,.6), 0 0 24px rgba(139,92,246,.35); }
.lw-hub img { width: 62%; height: auto; }
.lw-fab { position: fixed; left: 18px; bottom: 18px; z-index: 1100; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px;
  border-radius: 999px; border: 1px solid rgba(196,181,253,.45); background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: #fff; font-size: 14px; font-weight: 800;
  cursor: pointer; box-shadow: 0 10px 28px rgba(139,92,246,.45); animation: lw-pop .35s ease; }
.lw-fab:hover { transform: translateY(-2px); }
body.lw-open { overflow: hidden; }
@keyframes lw-fade { from { opacity: 0; } }
@keyframes lw-pop { from { opacity: 0; transform: scale(.94); } }
@media (max-width: 820px) {
  .lw-panel { flex-direction: column-reverse; width: min(440px, 100%); }
  .lw-visual { padding: 36px 20px 14px; border-left: 0; border-bottom: 1px solid rgba(255,255,255,.06); }
  .lw-wrap { width: min(250px, 64vw); }
  .lw-pane { padding: 24px 24px 30px; text-align: center; }
  .lw-btn { width: 100%; }
  .lw-decline { width: 100%; text-align: center; }
}
@media (prefers-reduced-motion: reduce) { .lw-panel, .lw-backdrop, .lw-fab { animation: none; } }
`;

  let modal;
  let fab;
  let spinning = false;

  function injectStyles() {
    if (document.getElementById("lw-style")) return;
    const style = document.createElement("style");
    style.id = "lw-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "lw-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="lw-backdrop" data-lw-close></div>
      <div class="lw-panel" role="dialog" aria-modal="true" aria-labelledby="lw-title">
        <button type="button" class="lw-close" data-lw-close aria-label="Close">&times;</button>
        <canvas class="lw-confetti" data-lw-confetti></canvas>
        <div class="lw-pane">
          <div data-lw-step="spin">
            <p class="lw-eyebrow">Welcome gift</p>
            <h2 class="lw-title" id="lw-title">Spin &amp; win a <em>discount</em></h2>
            <p class="lw-sub">Spin the wheel to unlock a discount on LoL Script, Vanguard Emulator or LoL Spoofer.</p>
            <button type="button" class="lw-btn" data-lw-spin>Spin the wheel</button>
            <p class="lw-hint">One spin per visitor</p>
            <button type="button" class="lw-decline" data-lw-close>No thanks, I'll pay full price</button>
          </div>
          <div data-lw-step="won" hidden>
            <p class="lw-eyebrow">You won</p>
            <h2 class="lw-title"><em>${COUPON_PERCENT}% OFF</em> your order</h2>
            <p class="lw-sub">Your code is saved and will be added at checkout automatically.</p>
            <div class="lw-code">
              <strong data-lw-code>${COUPON_CODE}</strong>
              <button type="button" class="lw-copy" data-lw-copy>Copy</button>
            </div>
            <button type="button" class="lw-btn" data-lw-shop>Shop now</button>
            <p class="lw-note">Works on every product. The discount is applied on the payment page.</p>
          </div>
        </div>
        <div class="lw-visual">
          <div class="lw-wrap">
            <div class="lw-pointer"></div>
            <div class="lw-disc" data-lw-disc></div>
            <div class="lw-hub"><img src="/assets/image/logo.png" alt="" width="60" height="60"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const disc = modal.querySelector("[data-lw-disc]");
    const stops = SEGMENTS.map((_, i) => {
      const color = i % 2 === 0 ? "#1a1030" : "#4c1d95";
      return `${color} ${i * STEP}deg ${(i + 1) * STEP}deg`;
    }).join(", ");
    disc.style.background = `conic-gradient(from 0deg, ${stops})`;
    SEGMENTS.forEach((segment, i) => {
      const holder = document.createElement("div");
      holder.className = "lw-seg";
      holder.style.transform = `rotate(${i * STEP + STEP / 2}deg)`;
      holder.innerHTML = `<span>${segment.label}</span>`;
      disc.appendChild(holder);
    });

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-lw-close]")) close();
      else if (event.target.closest("[data-lw-spin]")) spin();
      else if (event.target.closest("[data-lw-copy]")) copyCode(event.target.closest("[data-lw-copy]"));
      else if (event.target.closest("[data-lw-shop]")) shopNow();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) close();
    });
    return modal;
  }

  let pausedVideos = [];

  function pauseVideos() {
    pausedVideos = [...document.querySelectorAll("video")].filter((video) => !video.paused);
    pausedVideos.forEach((video) => video.pause());
  }

  function resumeVideos() {
    pausedVideos.forEach((video) => video.play?.().catch(() => {}));
    pausedVideos = [];
  }

  function showStep(step) {
    modal.querySelectorAll("[data-lw-step]").forEach((el) => {
      el.hidden = el.dataset.lwStep !== step;
    });
  }

  function open() {
    buildModal();
    const won = readState()?.status === "won";
    showStep(won ? "won" : "spin");
    if (won) {
      const disc = modal.querySelector("[data-lw-disc]");
      disc.style.transition = "none";
      disc.style.transform = `rotate(${360 - STEP * 1.5}deg)`;
    }
    modal.hidden = false;
    document.body.classList.add("lw-open");
    pauseVideos();
    if (fab) fab.hidden = true;
    modal.querySelector(won ? "[data-lw-shop]" : "[data-lw-spin]")?.focus();
  }

  function close() {
    if (!modal || spinning) return;
    modal.hidden = true;
    document.body.classList.remove("lw-open");
    resumeVideos();
    if (!readState()) writeState({ status: "dismissed" });
    renderFab();
  }

  function spin() {
    if (spinning || readState()?.status === "won") return;
    spinning = true;
    const button = modal.querySelector("[data-lw-spin]");
    button.disabled = true;

    const winners = SEGMENTS.map((s, i) => (s.win ? i : -1)).filter((i) => i >= 0);
    const target = winners[Math.floor(Math.random() * winners.length)];
    const center = target * STEP + STEP / 2;
    // Stop close to the edge of the bigger neighbouring prize, so it reads as a near miss.
    const next = SEGMENTS[(target + 1) % SEGMENTS.length].value;
    const prev = SEGMENTS[(target - 1 + SEGMENTS.length) % SEGMENTS.length].value;
    const towards = next >= prev ? 1 : -1;
    const offset = towards * STEP * (0.3 + Math.random() * 0.14);
    const finalAngle = 360 * SPIN_TURNS + (360 - center - offset);

    const disc = modal.querySelector("[data-lw-disc]");
    const pointer = modal.querySelector(".lw-pointer");
    disc.style.transition = "none";
    const start = performance.now();
    let lastSegment = 0;
    let lastTick = 0;

    (function frame(now) {
      const t = Math.min((now - start) / SPIN_MS, 1);
      // Short wind-up backwards, then a long ease-out.
      const windup = t < 0.06 ? -Math.sin((t / 0.06) * Math.PI) * 12 : 0;
      const eased = 1 - Math.pow(1 - t, 4);
      const angle = finalAngle * eased + windup;
      disc.style.transform = `rotate(${angle}deg)`;

      const segment = Math.floor(angle / STEP);
      if (segment !== lastSegment) {
        lastSegment = segment;
        if (now - lastTick > 90 && pointer.animate) {
          lastTick = now;
          pointer.animate(
            [
              { transform: "translateX(-50%) rotate(0deg)" },
              { transform: "translateX(-50%) rotate(-22deg)", offset: 0.35 },
              { transform: "translateX(-50%) rotate(0deg)" },
            ],
            { duration: 140, easing: "ease-out" }
          );
        }
      }

      if (t < 1) {
        requestAnimationFrame(frame);
        return;
      }
      setTimeout(finishSpin, 450);
    })(start);
  }

  function finishSpin() {
    spinning = false;
    writeState({ status: "won", code: COUPON_CODE, percent: COUPON_PERCENT, at: Date.now() });
    showStep("won");
    if (!reducedMotion) confetti();
    modal.querySelector("[data-lw-shop]")?.focus();
    window.dispatchEvent(new CustomEvent("lolscript-coupon", { detail: { code: COUPON_CODE } }));
  }

  async function copyCode(button) {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
    } catch (_) {
      const range = document.createRange();
      range.selectNodeContents(modal.querySelector("[data-lw-code]"));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand?.("copy");
    }
    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = "Copy";
    }, 1800);
  }

  function shopNow() {
    close();
    const target = document.querySelector("#products, [data-buy-slug], [data-add-to-cart]");
    target?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  }

  function renderFab() {
    const state = readState();
    if (!state || state.status === "expired" || state.used) {
      if (fab) fab.hidden = true;
      return;
    }
    if (!fab) {
      fab = document.createElement("button");
      fab.type = "button";
      fab.className = "lw-fab";
      fab.addEventListener("click", open);
      document.body.appendChild(fab);
    }
    fab.innerHTML =
      state.status === "won"
        ? `<span aria-hidden="true">🎁</span> ${COUPON_PERCENT}% OFF: ${COUPON_CODE}`
        : `<span aria-hidden="true">🎁</span> Spin &amp; win`;
    fab.hidden = false;
  }

  function confetti() {
    const canvas = modal.querySelector("[data-lw-confetti]");
    const box = canvas.parentElement.getBoundingClientRect();
    canvas.width = box.width;
    canvas.height = box.height;
    const ctx = canvas.getContext("2d");
    const colors = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ff5f8f", "#ffffff"];
    const parts = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      c: colors[Math.floor(Math.random() * colors.length)],
      vx: -1.2 + Math.random() * 2.4,
      vy: 1.8 + Math.random() * 2.8,
      r: Math.random() * Math.PI,
      vr: -0.12 + Math.random() * 0.24,
    }));
    const start = performance.now();
    (function frame(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = elapsed > 3000 ? Math.max(0, 1 - (elapsed - 3000) / 1200) : 1;
      parts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        const cos = Math.cos(p.r);
        const sin = Math.sin(p.r);
        ctx.setTransform(cos, sin, -sin, cos, p.x, p.y);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (elapsed < 4200 && !modal.hidden) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })(start);
  }

  function canAutoOpen() {
    const checkoutOpen = document.querySelector("[data-sellhub-checkout]:not([hidden])");
    return !checkoutOpen && !document.body.classList.contains("nav-open") && !readState();
  }

  function init() {
    injectStyles();
    renderFab();
    if (!readState()) {
      setTimeout(() => {
        if (canAutoOpen()) open();
      }, AUTO_OPEN_DELAY_MS);
    }
  }

  window.LOLScriptWheel = { open, getCoupon, markCouponUsed, code: COUPON_CODE, percent: COUPON_PERCENT };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

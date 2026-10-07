/**
 * Customer accounts UI: sign in / register (with Google, Discord and 2FA), password recovery and the
 * account dashboard (orders, license keys, Discord, support, security, settings).
 * The page is chosen by <body data-auth-page="login|register|forgot|reset|account">.
 */
(function () {
  const T = {
    auth_login_title: "Sign in",
    auth_register_title: "Create account",
    auth_email: "Email",
    auth_password: "Password",
    auth_name: "Name",
    auth_name_placeholder: "Your name",
    auth_password_hint: "At least 8 characters, with letters and numbers.",
    auth_login_btn: "Sign in",
    auth_register_btn: "Create account",
    auth_no_account: "Don't have an account?",
    auth_have_account: "Already have an account?",
    auth_switch_register: "Create one",
    auth_switch_login: "Sign in",
    auth_show_password: "Show password",
    auth_hide_password: "Hide password",
    auth_forgot_link: "Forgot password?",
    auth_oauth_google: "Continue with Google",
    auth_oauth_discord: "Continue with Discord",
    auth_oauth_or: "or with email",
    auth_err_generic: "Something went wrong. Please try again.",
    auth_err_captcha: "Please complete the security check and try again.",
    auth_err_captcha_load: "The security check could not load. Disable ad blockers for this page and refresh.",
    auth_err_unavailable: "Accounts are temporarily unavailable. Please try again later.",
    auth_err_rate_limited: "Too many attempts. Please wait a few minutes and try again.",
    auth_err_email: "Enter a valid email address.",
    auth_err_name: "Enter a name (at least 2 characters).",
    auth_err_password_length: "Password must be 8–128 characters.",
    auth_err_password_weak: "Use both letters and numbers, and don’t use your email as the password.",
    auth_err_email_taken: "This email is already registered. Try signing in.",
    auth_err_invalid: "Email or password is incorrect.",
    auth_err_session: "Your session expired. Please sign in again.",
    auth_err_current_password: "Current password is incorrect.",
    auth_err_mail_unavailable: "We could not send the email right now. Please try again later or contact support.",
    auth_err_oauth_unavailable: "This sign-in option is not available right now. Please use email instead.",
    auth_err_oauth_rate_limited: "Too many sign-in attempts. Please wait a few minutes and try again.",
    auth_err_oauth_cancelled: "Sign-in was cancelled.",
    auth_err_oauth_state: "The sign-in session expired. Please try again.",
    auth_err_oauth_failed: "We could not complete the sign-in. Please try again.",
    auth_err_oauth_no_email: "Your account did not share an email address, so we cannot sign you in.",
    auth_err_oauth_unverified_email: "Verify your email address with that provider first, then try again.",
    forgot_btn: "Send reset link",
    forgot_sent: "If an account exists for {email}, a reset link is on its way.",
    forgot_sent_hint: "The link is valid for 30 minutes. Check your spam folder if you don’t see it.",
    forgot_back_login: "Back to sign in",
    reset_confirm: "Repeat new password",
    reset_btn: "Save new password",
    reset_request_new: "Request a new link",
    reset_done: "Your password was changed and you are signed in. Other devices were signed out.",
    reset_err_token: "This reset link is invalid or has expired.",
    reset_err_mismatch: "The passwords don’t match.",
    verify_title: "Verify your email to unlock your orders",
    verify_body: "For your security, orders and license keys are only shown after you confirm you own {email}. Enter the 6-digit code we emailed you.",
    verify_code_label: "Verification code",
    verify_confirm_btn: "Verify",
    verify_send_btn: "Send code",
    verify_resend_in: "Resend in {seconds}s",
    verify_sent: "Code sent to {email}. Check your inbox and spam folder.",
    verify_err_cooldown: "Please wait a minute before requesting another code.",
    verify_err_invalid: "That code is not correct. Please check and try again.",
    verify_err_expired: "This code expired. Send a new one.",
    verify_err_locked: "Too many wrong codes. Send a new one.",
    orders_err_unverified: "Verify your email to see your orders.",
    orders_err_load: "We couldn’t load your orders right now. Please try again in a moment.",
    order_status_completed: "Completed",
    order_status_pending: "Awaiting payment",
    order_status_expired: "Expired",
    order_status_disputed: "Disputed",
    order_status_refunded: "Refunded",
    order_status_other: "Processing",
    order_note_pending: "Payment has not been confirmed yet. Keys are delivered automatically as soon as it is.",
    order_note_expired: "This checkout was not paid before it expired. You were not charged.",
    order_note_disputed: "A payment dispute is open on this order. Contact support to resolve it.",
    order_note_refunded: "This order was refunded.",
    order_note_other: "This order is being processed. Contact support if it doesn’t complete soon.",
    pm_cryptoCurrency: "Crypto",
    pm_cardToCrypto: "Card",
    pm_customerBalance: "Shopier / Gift card",
    pm_stripe: "Card",
    pm_paypal: "PayPal",
    account_title: "My account",
    account_member_since: "Member since",
    account_change_password: "Change password",
    account_current_password: "Current password",
    account_new_password: "New password",
    account_repeat_password: "New password (repeat)",
    account_save: "Update password",
    account_password_updated: "Password updated. All other devices were signed out.",
    account_signout: "Sign out",
    account_signout_all: "Sign out of all devices",
    account_signout_all_hint: "Confirm with your current password to end every other session.",
    account_signout_all_done: "All other devices were signed out.",
    account_signout_all_need_pw: "Enter your current password in the password form to sign out other devices.",
    account_set_password: "Set a password",
    account_set_password_sub: "You signed up with Google or Discord. Set a password if you also want to sign in with your email.",
    account_password_sub: "Changing your password signs out every other device.",
    account_sessions: "Sessions",
    account_security_tips: "Keep your account safe",
    account_tip_1: "Use a unique password you don’t use on other sites.",
    account_tip_2: "Never share your license keys or account details. Staff will never ask for your password.",
    account_tip_3: "Sign out of all devices if you think someone else has access.",
    account_linked_accounts: "Linked accounts",
    account_linked_sub: "Sign in faster with Google or Discord.",
    account_connected: "Connected",
    account_not_connected: "Not connected",
    account_connect: "Connect",
    account_disconnect: "Disconnect",
    account_cancel: "Cancel",
    account_hide_email: "Hide email",
    account_show_email: "Show email",
    account_err_last_method: "Set a password first — this is your only way to sign in.",
    account_err_link_taken: "That account is already linked to another LOLScript account.",
    account_link_discord_ok: "Your Discord account is now linked.",
    account_link_google_ok: "Your Google account is now linked.",
    account_tab_overview: "Overview",
    account_tab_orders: "My orders",
    account_tab_licenses: "License keys",
    account_tab_discord: "Discord",
    account_tab_support: "Support",
    account_tab_security: "Security",
    account_tab_settings: "Settings",
    account_discord_sub: "Link your Discord account and join the community.",
    account_support_sub: "Reach us the fastest way and keep your order numbers handy.",
    account_security_sub: "Two-factor authentication, password and sessions.",
    account_settings_sub: "Your profile and linked accounts.",
    account_discord_account: "Discord account",
    account_discord_account_sub: "A linked Discord account lets you sign in with one click and helps support find your orders.",
    account_discord_linked_hint: "Linked — you can sign in with Discord.",
    account_discord_unlinked_hint: "Link it to sign in with Discord and get faster support.",
    account_discord_connect: "Connect Discord",
    account_discord_connect_soon: "Discord linking will be available soon.",
    account_discord_server: "Community server",
    account_discord_server_sub: "Our Discord is where support, announcements and status updates happen.",
    account_discord_perk_1: "Private support tickets, 7 days a week",
    account_discord_perk_2: "Live status and patch update announcements",
    account_discord_perk_3: "Setup help, showcases and community vouches",
    account_discord_join: "Join the server",
    account_support_discord: "Discord ticket",
    account_support_discord_body: "Open a ticket on our server — the fastest way to get help.",
    account_support_before: "Before you contact us",
    account_support_before_sub: "These help us solve your issue in one reply.",
    account_support_tip_1: "Share your order number (copy it from the list).",
    account_support_tip_2: "Mention the email you ordered with: {email}",
    account_support_tip_3: "Check the status page — the product may be updating.",
    account_support_orders: "Your order numbers",
    account_support_orders_sub: "Copy and paste into your ticket.",
    account_welcome: "Welcome back",
    account_hello: "Hi, {name}",
    account_overview_sub: "Your purchases, keys and account at a glance.",
    account_verified: "Verified",
    account_unverified: "Not verified",
    account_browse_store: "Browse store",
    account_status: "Status",
    account_refresh: "Refresh",
    account_retry: "Try again",
    account_stat_orders: "Orders",
    account_stat_orders_hint: "Completed purchases",
    account_stat_spent: "Total spent",
    account_stat_keys: "License keys",
    account_stat_last: "Last purchase",
    account_recent_orders: "Recent orders",
    account_view_all: "View all",
    account_no_orders: "No orders yet",
    account_no_orders_body: "Orders placed with this email appear here automatically, including crypto, Shopier and gift card payments.",
    account_no_results: "Nothing matches",
    account_no_results_body: "Try a different filter or search term.",
    account_orders_page_sub: "Every order placed with your email, with status, receipt and keys.",
    account_filter_all: "All",
    account_search_orders: "Search product or order ID",
    account_search_keys: "Search keys",
    account_licenses_sub: "All keys from your completed orders. Keep them private.",
    account_no_keys: "No license keys yet",
    account_no_keys_body: "Keys from completed orders show up here right after delivery.",
    account_purchased_on: "Purchased {date}",
    account_renew: "Renew",
    account_more_items: "+{count} more item(s)",
    account_order_id: "Order ID",
    account_order_date: "Date",
    account_order_payment: "Payment",
    account_order_total: "Total",
    account_order_status: "Status",
    account_buy_again: "Buy again",
    account_view_product: "View product",
    account_keys_by_email: "Your key was sent to your email. If it doesn’t show up here in a few minutes, contact support with your order ID.",
    account_print_receipt: "Print receipt",
    account_copy_order_id: "Copy order ID",
    account_receipt: "Order receipt",
    account_qty: "Qty",
    account_product: "Product",
    account_get_help: "Get help",
    account_copy: "Copy",
    account_copied: "Copied",
    account_key_show: "Show",
    account_key_hide: "Hide",
    account_quick_status: "Product status",
    account_quick_status_body: "Check live detection status before you play.",
    account_quick_support: "Support",
    account_quick_support_body: "Setup help and order questions on Discord.",
    account_quick_faq: "FAQ",
    account_quick_faq_body: "Answers to the most common questions.",
    account_profile: "Profile",
    account_profile_sub: "Your name is shown on your account only.",
    account_profile_save: "Save changes",
    account_profile_saved: "Profile updated.",
    account_email_locked: "Your email links your orders and can’t be changed here. Contact support if you need to move your account.",
    mfa_title: "Two-factor authentication (2FA)",
    mfa_sub: "Protect your account with Google Authenticator, Authy or 1Password: a 6-digit code is required at sign-in in addition to your password.",
    mfa_status_on: "2FA is on",
    mfa_status_off: "2FA is off",
    mfa_setup_btn: "Set up 2FA",
    mfa_step_1: "Install Google Authenticator, Authy or 1Password on your phone.",
    mfa_step_2: "Scan the QR code (or enter the key manually).",
    mfa_step_3: "Enter the 6-digit code shown in the app.",
    mfa_qr_alt: "2FA QR code",
    mfa_manual_key: "Manual setup key",
    mfa_copy_key: "Copy key",
    mfa_code: "6-digit code",
    mfa_code_or_recovery: "Authenticator code or recovery code",
    mfa_enable_btn: "Enable 2FA",
    mfa_enabled_notice: "2FA is now on. Other sessions were signed out.",
    mfa_disabled_notice: "2FA has been turned off.",
    mfa_regenerated_notice: "New recovery codes created; the old ones no longer work.",
    mfa_codes_left: "Recovery codes left: {n}",
    mfa_regenerate_btn: "New recovery codes",
    mfa_disable_btn: "Turn off 2FA",
    mfa_disable_confirm: "Confirm with your password and a code to turn off 2FA.",
    mfa_regenerate_confirm: "Confirm with your password and a code to create new recovery codes.",
    mfa_codes_warning: "Save these recovery codes somewhere safe. Each works once if you lose your phone. They will not be shown again.",
    mfa_codes_copy: "Copy codes",
    mfa_codes_download: "Download .txt",
    mfa_login_title: "Two-factor authentication",
    mfa_login_sub: "Enter the 6-digit code from your authenticator app.",
    mfa_login_recovery_sub: "Enter one of your recovery codes. Each code works once.",
    mfa_recovery_code: "Recovery code",
    mfa_verify_btn: "Verify and sign in",
    mfa_use_recovery: "Lost your phone? Use a recovery code",
    mfa_use_app: "Use authenticator app instead",
    mfa_err_expired: "The sign-in step expired. Please sign in again.",
    mfa_err_invalid: "That code is not valid. Please try again.",
    mfa_err_already_on: "2FA is already on.",
    mfa_err_unverified: "Verify your email first, then you can turn on 2FA.",
    account_err_link_unverified: "Verify your email before connecting another sign-in method.",
    mfa_err_not_on: "2FA is not on.",
    mfa_err_setup_expired: "Setup expired. Start again.",
  };

  const t = (key, vars) => String(T[key] ?? key).replace(/\{(\w+)\}/g, (_, n) => (vars && vars[n] != null ? vars[n] : ""));
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const tErr = (code) => esc(t(code || "auth_err_generic"));

  const DISCORD_FALLBACK = "https://discord.gg/n2ng5mJjhm";
  const page = document.body.dataset.authPage;
  const root = document.querySelector("[data-auth-root]");
  if (!page || !root) return;

  async function postJson(url, body) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body || {}),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, error: data.error || (res.ok ? undefined : "auth_err_generic"), data };
    } catch {
      return { ok: false, error: "auth_err_generic", data: {} };
    }
  }

  async function getSession() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      return { user: data?.user || null, providers: data?.providers || [], captcha: data?.captcha || "" };
    } catch {
      return { user: null, providers: [], captcha: "" };
    }
  }

  let invitePromise = null;
  function discordInvite() {
    invitePromise ??= fetch("/api/discord-invite")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d?.url && !d.url.includes("yourserver") ? d.url : DISCORD_FALLBACK))
      .catch(() => DISCORD_FALLBACK);
    return invitePromise;
  }

  /* Same-site path only; "/\evil.com" and control characters would otherwise resolve off-site. */
  const safeTarget = (next) => {
    if (typeof next !== "string" || !next.startsWith("/") || next.length > 300 || /[\\\x00-\x1f\x7f]/.test(next)) return "/account";
    try {
      const u = new URL(next, window.location.origin);
      return u.origin === window.location.origin ? u.pathname + u.search + u.hash : "/account";
    } catch {
      return "/account";
    }
  };
  const params = new URLSearchParams(window.location.search);

  /* ---------- shared bits ---------- */

  const spinner = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>';
  const errorBox = (code) =>
    code ? `<p class="acc-alert is-error" role="alert"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>${tErr(code)}</p>` : "";
  const noticeBox = (text) =>
    text ? `<p class="acc-alert is-ok" role="status"><i class="fa-solid fa-circle-check" aria-hidden="true"></i>${esc(text)}</p>` : "";

  function passwordInput(id, autocomplete) {
    return `<div class="acc-pw">
      <input id="${id}" name="${id}" type="password" required maxlength="128" ${autocomplete === "new-password" ? 'minlength="8"' : ""} autocomplete="${autocomplete}" class="acc-input">
      <button type="button" class="acc-pw-toggle" data-pw-toggle aria-label="${esc(t("auth_show_password"))}"><i class="fa-regular fa-eye" aria-hidden="true"></i></button>
    </div>`;
  }

  const field = (id, label, control, hint) =>
    `<div class="acc-field"><label for="${id}">${esc(label)}</label>${control}${hint ? `<p class="acc-hint">${esc(hint)}</p>` : ""}</div>`;

  const honeypot = `<div class="acc-hp" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>`;

  const iconInput = (icon, input) => `<div class="acc-input-wrap"><i class="${icon}" aria-hidden="true"></i>${input}</div>`;

  /* Cloudflare Turnstile: only rendered when the server reports a site key. */
  let turnstileLoad = null;
  function loadTurnstile() {
    turnstileLoad ??= new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => {
        turnstileLoad = null;
        reject(new Error("turnstile"));
      };
      document.head.appendChild(s);
    });
    return turnstileLoad;
  }

  function mountCaptcha(container, siteKey, action) {
    const state = { token: "", id: null };
    if (!siteKey || !container) return { token: () => "skip", reset() {} };
    container.hidden = false;
    loadTurnstile()
      .then((ts) => {
        state.id = ts.render(container, {
          sitekey: siteKey,
          action,
          theme: "dark",
          size: "flexible",
          callback: (token) => (state.token = token),
          "expired-callback": () => (state.token = ""),
          "error-callback": () => (state.token = ""),
        });
      })
      .catch(() => {
        container.innerHTML = errorBox("auth_err_captcha_load");
      });
    return {
      token: () => state.token,
      reset() {
        state.token = "";
        if (state.id !== null) window.turnstile?.reset(state.id);
      },
    };
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    if (busy) {
      button.dataset.label = button.innerHTML;
      button.innerHTML = `${spinner}${button.dataset.label}`;
    } else if (button.dataset.label) {
      button.innerHTML = button.dataset.label;
    }
  }

  document.addEventListener("click", async (event) => {
    const toggle = event.target.closest("[data-pw-toggle]");
    if (toggle) {
      const input = toggle.parentElement.querySelector("input");
      const shown = input.type === "text";
      input.type = shown ? "password" : "text";
      toggle.setAttribute("aria-label", t(shown ? "auth_show_password" : "auth_hide_password"));
      toggle.innerHTML = `<i class="fa-regular ${shown ? "fa-eye" : "fa-eye-slash"}" aria-hidden="true"></i>`;
      return;
    }
    const copy = event.target.closest("[data-copy]");
    if (copy) {
      try {
        await navigator.clipboard.writeText(copy.dataset.copy);
        const label = copy.dataset.copyLabel || t("account_copy");
        copy.classList.add("is-done");
        copy.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i>${esc(t("account_copied"))}`;
        setTimeout(() => {
          copy.classList.remove("is-done");
          copy.innerHTML = `<i class="fa-solid fa-copy" aria-hidden="true"></i>${esc(label)}`;
        }, 1600);
      } catch {}
    }
  });

  const copyButton = (value, label = t("account_copy"), cls = "") =>
    `<button type="button" class="acc-copy ${cls}" data-copy="${esc(value)}" data-copy-label="${esc(label)}"><i class="fa-solid fa-copy" aria-hidden="true"></i>${esc(label)}</button>`;

  /* ---------- sign in / register ---------- */

  const GOOGLE_LOGO = `<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
  const DISCORD_LOGO = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.011c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;
  const OAUTH_BUTTONS = {
    google: { logo: GOOGLE_LOGO, label: "auth_oauth_google", cls: "is-google" },
    discord: { logo: DISCORD_LOGO, label: "auth_oauth_discord", cls: "is-discord" },
  };

  function oauthButtons(providers, next) {
    if (!providers.length) return "";
    const href = (p) => {
      const q = new URLSearchParams();
      if (next && next.startsWith("/") && !next.startsWith("//")) q.set("next", next);
      const qs = q.toString();
      return `/api/auth/oauth/${p}${qs ? `?${qs}` : ""}`;
    };
    return `<div class="acc-oauth">
      ${providers
        .filter((p) => OAUTH_BUTTONS[p])
        .map((p) => `<a class="acc-oauth-btn ${OAUTH_BUTTONS[p].cls}" href="${href(p)}" data-oauth><span class="acc-oauth-logo">${OAUTH_BUTTONS[p].logo}</span><span>${esc(t(OAUTH_BUTTONS[p].label))}</span></a>`)
        .join("")}
      <div class="acc-or"><span></span>${esc(t("auth_oauth_or"))}<span></span></div>
    </div>`;
  }

  function renderMfaStep(next, onExpired) {
    let recovery = false;
    const draw = (error) => {
      root.innerHTML = `<form class="acc-form" data-mfa-form novalidate>
        <div class="acc-callout">
          <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
          <div><strong>${esc(t("mfa_login_title"))}</strong><p>${esc(t(recovery ? "mfa_login_recovery_sub" : "mfa_login_sub"))}</p></div>
        </div>
        ${field(
          "mfa-code",
          t(recovery ? "mfa_recovery_code" : "mfa_code"),
          `<input id="mfa-code" required autofocus autocomplete="one-time-code" inputmode="${recovery ? "text" : "numeric"}" maxlength="${recovery ? 9 : 6}" placeholder="${recovery ? "XXXX-XXXX" : "123456"}" class="acc-input acc-code">`
        )}
        ${errorBox(error)}
        <button type="submit" class="acc-btn acc-btn-block" disabled>${esc(t("mfa_verify_btn"))}</button>
        <button type="button" class="acc-link" data-mfa-switch>${esc(t(recovery ? "mfa_use_app" : "mfa_use_recovery"))}</button>
      </form>`;
      const form = root.querySelector("[data-mfa-form]");
      const input = form.querySelector("#mfa-code");
      const submit = form.querySelector('button[type="submit"]');
      input.focus();
      input.addEventListener("input", () => {
        input.value = recovery ? input.value.toUpperCase() : input.value.replace(/\D/g, "");
        submit.disabled = input.value.length < 6;
      });
      form.querySelector("[data-mfa-switch]").addEventListener("click", () => {
        recovery = !recovery;
        draw(null);
      });
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (submit.disabled) return;
        setBusy(submit, true);
        const result = await postJson("/api/auth/2fa/verify", { code: input.value });
        if (!result.ok) {
          if (result.error === "mfa_err_expired") return onExpired();
          return draw(result.error);
        }
        window.location.assign(safeTarget(next));
      });
    };
    draw(null);
  }

  function renderAuthForm(mode, providers, initialError, initialMfa, captchaKey) {
    const next = params.get("next") || "";
    const isRegister = mode === "register";
    const expired = () => renderAuthForm(mode, providers, "mfa_err_expired", false, captchaKey);
    if (initialMfa) return renderMfaStep(next, expired);

    root.innerHTML = `<form class="acc-form" data-auth-form>
      ${honeypot}
      ${oauthButtons(providers, next)}
      ${isRegister ? field("auth-name", t("auth_name"), iconInput("fa-regular fa-user", `<input id="auth-name" name="name" required minlength="2" maxlength="40" autocomplete="name" placeholder="${esc(t("auth_name_placeholder"))}" class="acc-input">`)) : ""}
      ${field("auth-email", t("auth_email"), iconInput("fa-regular fa-envelope", '<input id="auth-email" name="email" type="email" required maxlength="254" autocomplete="email" inputmode="email" placeholder="you@email.com" class="acc-input">'))}
      <div class="acc-field">
        <div class="acc-field-row"><label for="auth-password">${esc(t("auth_password"))}</label>${isRegister ? "" : `<a class="acc-link" href="/forgot-password">${esc(t("auth_forgot_link"))}</a>`}</div>
        ${iconInput("fa-solid fa-lock", passwordInput("auth-password", isRegister ? "new-password" : "current-password"))}
        ${isRegister ? `<p class="acc-hint">${esc(t("auth_password_hint"))}</p>` : ""}
      </div>
      <div class="acc-captcha" data-captcha hidden></div>
      <div data-auth-error>${errorBox(initialError)}</div>
      <button type="submit" class="acc-btn acc-btn-block">${esc(t(isRegister ? "auth_register_btn" : "auth_login_btn"))}</button>
      <p class="acc-switch">${esc(t(isRegister ? "auth_have_account" : "auth_no_account"))} <a href="${isRegister ? "/login" : "/register"}">${esc(t(isRegister ? "auth_switch_login" : "auth_switch_register"))}</a></p>
    </form>`;

    root.querySelectorAll("[data-oauth]").forEach((a) =>
      a.addEventListener("click", () => {
        root.querySelectorAll("[data-oauth]").forEach((o) => o !== a && o.classList.add("is-dim"));
        a.querySelector(".acc-oauth-logo").innerHTML = spinner;
      })
    );

    const form = root.querySelector("[data-auth-form]");
    const captcha = mountCaptcha(form.querySelector("[data-captcha]"), captchaKey, mode);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      if (submit.disabled) return;
      const errorEl = form.querySelector("[data-auth-error]");
      if (!captcha.token()) {
        errorEl.innerHTML = errorBox("auth_err_captcha");
        return;
      }
      setBusy(submit, true);
      errorEl.innerHTML = "";
      const result = await postJson(`/api/auth/${mode}`, {
        name: form.name?.value || "",
        email: form.email.value,
        password: form.querySelector("#auth-password").value,
        website: form.website.value,
        captcha: captcha.token(),
      });
      if (!result.ok) {
        setBusy(submit, false);
        captcha.reset();
        errorEl.innerHTML = errorBox(result.error);
        return;
      }
      if (result.data?.mfa) return renderMfaStep(next, expired);
      window.location.assign(safeTarget(next));
    });
  }

  /* ---------- password recovery ---------- */

  async function renderForgot() {
    const { captcha: captchaKey } = await getSession();
    root.innerHTML = `<form class="acc-form" data-forgot-form>
      ${honeypot}
      ${field("forgot-email", t("auth_email"), iconInput("fa-regular fa-envelope", '<input id="forgot-email" name="email" type="email" required maxlength="254" autocomplete="email" inputmode="email" placeholder="you@email.com" class="acc-input">'))}
      <div class="acc-captcha" data-captcha hidden></div>
      <div data-auth-error></div>
      <button type="submit" class="acc-btn acc-btn-block">${esc(t("forgot_btn"))}</button>
      <p class="acc-switch"><a href="/login">${esc(t("forgot_back_login"))}</a></p>
    </form>`;
    const form = root.querySelector("[data-forgot-form]");
    const captcha = mountCaptcha(form.querySelector("[data-captcha]"), captchaKey, "forgot");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const errorEl = form.querySelector("[data-auth-error]");
      if (!captcha.token()) {
        errorEl.innerHTML = errorBox("auth_err_captcha");
        return;
      }
      setBusy(submit, true);
      const email = form.email.value.trim();
      const result = await postJson("/api/auth/forgot", { email, website: form.website.value, captcha: captcha.token() });
      setBusy(submit, false);
      if (!result.ok) {
        captcha.reset();
        errorEl.innerHTML = errorBox(result.error);
        return;
      }
      root.innerHTML = `<div class="acc-form">
        ${noticeBox(t("forgot_sent", { email }))}
        <p class="acc-muted">${esc(t("forgot_sent_hint"))}</p>
        <a class="acc-btn-ghost acc-btn-block" href="/login"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i>${esc(t("forgot_back_login"))}</a>
      </div>`;
    });
  }

  function renderReset() {
    const match = window.location.hash.match(/token=([\w-]+)/);
    const token = match ? match[1] : "";
    if (match) window.history.replaceState(null, "", window.location.pathname);
    const invalid = () => {
      root.innerHTML = `<div class="acc-form">${errorBox("reset_err_token")}<a class="acc-btn acc-btn-block" href="/forgot-password">${esc(t("reset_request_new"))}</a></div>`;
    };
    if (!token) return invalid();

    root.innerHTML = `<form class="acc-form" data-reset-form>
      ${field("reset-new", t("account_new_password"), passwordInput("reset-new", "new-password"), t("auth_password_hint"))}
      ${field("reset-confirm", t("reset_confirm"), passwordInput("reset-confirm", "new-password"))}
      <div data-auth-error></div>
      <button type="submit" class="acc-btn acc-btn-block">${esc(t("reset_btn"))}</button>
    </form>`;
    const form = root.querySelector("[data-reset-form]");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = form.querySelector("#reset-new").value;
      const errorEl = form.querySelector("[data-auth-error]");
      if (password !== form.querySelector("#reset-confirm").value) {
        errorEl.innerHTML = errorBox("reset_err_mismatch");
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      setBusy(submit, true);
      errorEl.innerHTML = "";
      const result = await postJson("/api/auth/reset", { token, password });
      if (!result.ok) {
        setBusy(submit, false);
        if (result.error === "reset_err_token") return invalid();
        errorEl.innerHTML = errorBox(result.error);
        return;
      }
      window.location.assign(result.data?.mfa ? "/login?mfa=1&next=%2Faccount%3Freset%3D1" : "/account?reset=1");
    });
  }

  /* ---------- account dashboard ---------- */

  const TABS = ["overview", "orders", "licenses", "discord", "support", "security", "settings"];
  const TAB_ICON = {
    overview: "fa-solid fa-gauge-high",
    orders: "fa-solid fa-box-open",
    licenses: "fa-solid fa-key",
    discord: "fa-brands fa-discord",
    support: "fa-solid fa-headset",
    security: "fa-solid fa-shield-halved",
    settings: "fa-solid fa-gear",
  };
  const STATUS_ICON = {
    completed: "fa-circle-check",
    pending: "fa-clock",
    expired: "fa-circle-minus",
    disputed: "fa-triangle-exclamation",
    refunded: "fa-rotate-left",
    other: "fa-circle-question",
  };
  const FILTERS = ["all", "completed", "pending", "expired"];
  const LINK_NOTICES = {
    discord_ok: ["ok", "account_link_discord_ok"],
    google_ok: ["ok", "account_link_google_ok"],
    taken: ["error", "account_err_link_taken"],
    unverified: ["error", "account_err_link_unverified"],
    failed: ["error", "auth_err_oauth_failed"],
  };

  const moneyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
  const dateTimeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
  const money = (n) => moneyFmt.format(n);
  const fmtDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : "—");
  const fmtDateTime = (iso) => (iso ? dateTimeFmt.format(new Date(iso)) : "—");
  const payLabel = (method) =>
    T[`pm_${method}`] || (method ? method.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()) : "—");
  const shortId = (id) => `#${String(id).slice(0, 8).toUpperCase()}`;
  const itemTitle = (item) =>
    `${item.name}${item.variant && item.variant !== item.name ? ` · ${item.variant}` : ""}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`;

  function maskEmail(email) {
    const [local = "", domain = ""] = email.split("@");
    const dot = domain.lastIndexOf(".");
    const host = dot > 0 ? domain.slice(0, dot) : domain;
    const tld = dot > 0 ? domain.slice(dot) : "";
    return `${local.slice(0, 2)}${"•".repeat(Math.max(3, Math.min(local.length - 2, 8)))}@${host.charAt(0)}${"•".repeat(4)}${tld}`;
  }

  const statusBadge = (status, cls = "") =>
    `<span class="acc-status is-${status} ${cls}"><i class="fa-solid ${STATUS_ICON[status]}" aria-hidden="true"></i>${esc(t(`order_status_${status}`))}</span>`;

  const thumb = (item, size = "md") =>
    `<span class="acc-thumb is-${size}">${
      item?.image ? `<img src="${esc(item.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""
    }<i class="fa-solid fa-box" aria-hidden="true"></i></span>`;

  function keyRow(value) {
    const masked = value.length > 8 ? `${value.slice(0, 4)}${"•".repeat(Math.min(value.length - 8, 16))}${value.slice(-4)}` : "•".repeat(value.length);
    return `<div class="acc-key">
      <i class="fa-solid fa-key" aria-hidden="true"></i>
      <code data-key-text data-masked="${esc(masked)}" data-value="${esc(value)}">${esc(masked)}</code>
      <button type="button" class="acc-copy" data-key-toggle><i class="fa-regular fa-eye" aria-hidden="true"></i>${esc(t("account_key_show"))}</button>
      ${copyButton(value)}
    </div>`;
  }

  const panel = (title, sub, body, right = "") =>
    `<section class="acc-panel"><header><div><h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ""}</div>${right}</header><div class="acc-panel-body">${body}</div></section>`;

  const sectionTitle = (title, sub, right = "") =>
    `<div class="acc-section-title"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div>${right}</div>`;

  const emptyState = (icon, title, body, action = "") =>
    `<div class="acc-empty"><span><i class="fa-solid ${icon}" aria-hidden="true"></i></span><strong>${esc(title)}</strong><p>${esc(body)}</p>${action}</div>`;

  const browseAction = `<a class="acc-btn" href="/#products"><i class="fa-solid fa-store" aria-hidden="true"></i>${esc(t("account_browse_store"))}</a>`;

  const skeleton = `<div class="acc-skeleton" aria-hidden="true">${'<div><span></span><span><i></i><i></i></span><span></span></div>'.repeat(3)}</div>`;

  function orderCard(order) {
    const first = order.items[0];
    const keys = order.items.flatMap((i) => i.keys);
    const items = order.items
      .map(
        (item) => `<li>
          <div class="acc-order-item">${thumb(item, "sm")}<span>${esc(itemTitle(item))}</span>${
            item.slug ? `<a class="acc-link" href="/${item.slug}">${esc(t(order.status === "completed" ? "account_buy_again" : "account_view_product"))}</a>` : ""
          }</div>
          ${item.keys.map(keyRow).join("")}
        </li>`
      )
      .join("");
    return `<article class="acc-order" data-order="${esc(order.id)}">
      <button type="button" class="acc-order-head" data-order-toggle aria-expanded="false">
        ${first ? thumb(first) : ""}
        <span class="acc-order-main">
          <strong>${esc(first ? itemTitle(first) : t("account_product"))}</strong>
          ${order.items.length > 1 ? `<small>${esc(t("account_more_items", { count: order.items.length - 1 }))}</small>` : ""}
          <span class="acc-order-meta"><span>${esc(fmtDate(order.createdAt))}</span><span class="acc-hide-sm">${esc(shortId(order.id))}</span><span>${esc(payLabel(order.paymentMethod))}</span></span>
          ${statusBadge(order.status, "acc-show-sm")}
        </span>
        <span class="acc-order-side"><strong>${esc(money(order.totalUsd))}</strong>${statusBadge(order.status, "acc-hide-sm")}</span>
        <i class="fa-solid fa-chevron-down acc-chevron acc-hide-sm" aria-hidden="true"></i>
      </button>
      <div class="acc-order-body" hidden>
        <dl>
          <div><dt>${esc(t("account_order_id"))}</dt><dd class="acc-mono">${esc(order.id)}</dd></div>
          <div><dt>${esc(t("account_order_date"))}</dt><dd>${esc(fmtDateTime(order.createdAt))}</dd></div>
          <div><dt>${esc(t("account_order_payment"))}</dt><dd>${esc(payLabel(order.paymentMethod))}</dd></div>
          <div><dt>${esc(t("account_order_total"))}</dt><dd><b>${esc(money(order.totalUsd))}</b></dd></div>
        </dl>
        <ul class="acc-order-items">${items}</ul>
        ${
          order.status === "completed" && keys.length === 0
            ? `<p class="acc-note"><i class="fa-solid fa-envelope" aria-hidden="true"></i>${esc(t("account_keys_by_email"))}</p>`
            : ""
        }
        ${order.status !== "completed" ? `<p class="acc-note">${esc(t(`order_note_${order.status}`))}</p>` : ""}
        <div class="acc-actions">
          <button type="button" class="acc-btn-ghost is-sm" data-print="${esc(order.id)}"><i class="fa-solid fa-print" aria-hidden="true"></i>${esc(t("account_print_receipt"))}</button>
          ${copyButton(order.id, t("account_copy_order_id"), "is-lg")}
          <a class="acc-btn-ghost is-sm" href="${esc(state.invite)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-discord" aria-hidden="true"></i>${esc(t("account_get_help"))}</a>
        </div>
      </div>
    </article>`;
  }

  function printReceipt(order) {
    const win = window.open("", "_blank", "width=720,height=860");
    if (!win) return;
    const rows = order.items.map((i) => `<tr><td>${esc(itemTitle(i))}</td><td style="text-align:right">${i.quantity}</td></tr>`).join("");
    win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(t("account_receipt"))} ${esc(shortId(order.id))}</title>
<style>body{font:14px/1.5 Inter,Segoe UI,Arial,sans-serif;color:#0f172a;margin:40px}h1{font-size:20px;margin:0 0 4px}
.muted{color:#64748b}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left}
dl{display:grid;grid-template-columns:160px 1fr;gap:6px 16px;margin:24px 0}dt{color:#64748b}dd{margin:0}.total{font-size:18px;font-weight:700}</style></head>
<body><p style="font-weight:800;letter-spacing:3px">LOLSCRIPT</p><h1>${esc(t("account_receipt"))}</h1><p class="muted">${esc(window.location.host)}</p>
<dl><dt>${esc(t("account_order_id"))}</dt><dd>${esc(order.id)}</dd><dt>${esc(t("account_order_date"))}</dt><dd>${esc(fmtDateTime(order.createdAt))}</dd>
<dt>${esc(t("account_order_payment"))}</dt><dd>${esc(payLabel(order.paymentMethod))}</dd><dt>${esc(t("account_order_status"))}</dt><dd>${esc(t(`order_status_${order.status}`))}</dd></dl>
<table><thead><tr><th>${esc(t("account_product"))}</th><th style="text-align:right">${esc(t("account_qty"))}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="total">${esc(t("account_order_total"))}: ${esc(money(order.totalUsd))}</p></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  const state = {
    user: null,
    providers: [],
    tab: "overview",
    filter: "all",
    query: "",
    orders: { status: "idle", list: [], error: null },
    invite: DISCORD_FALLBACK,
    notice: null,
  };

  const completedOrders = () => state.orders.list.filter((o) => o.status === "completed");
  const licenses = () => completedOrders().flatMap((order) => order.items.flatMap((item) => item.keys.map((key) => ({ key, item, order }))));

  async function loadOrders(fresh = false) {
    state.orders = { ...state.orders, status: "loading", error: null };
    renderNav();
    renderContent();
    try {
      const res = await fetch(`/api/account/orders${fresh ? "?fresh=1" : ""}`, { credentials: "same-origin", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      state.orders = res.ok ? { status: "ready", list: data.orders || [], error: null } : { status: "error", list: [], error: data.error || "orders_err_load" };
    } catch {
      state.orders = { status: "error", list: [], error: "orders_err_load" };
    }
    renderNav();
    renderContent();
  }

  function setUser(user) {
    const wasVerified = state.user?.emailVerified;
    state.user = user;
    renderHero();
    renderNav();
    if (user.emailVerified && !wasVerified) loadOrders();
    else renderContent();
  }

  function setTab(next) {
    state.tab = next;
    state.query = "";
    state.notice = null;
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    url.searchParams.delete("reset");
    url.searchParams.delete("link");
    window.history.replaceState(null, "", url.pathname + url.search);
    renderNav();
    renderContent();
  }

  function renderHero() {
    const u = state.user;
    const hero = root.querySelector("[data-acc-hero]");
    hero.innerHTML = `<div class="acc-hero-id">
        <span class="acc-avatar">${esc(u.name.charAt(0))}</span>
        <div>
          <p class="acc-eyebrow">${esc(t("account_welcome"))}</p>
          <h1>${esc(u.name)}</h1>
          <p class="acc-hero-meta">
            <span class="acc-email"><span data-email-text>${esc(maskEmail(u.email))}</span><button type="button" data-email-toggle aria-label="${esc(t("account_show_email"))}"><i class="fa-regular fa-eye" aria-hidden="true"></i></button></span>
            <span class="acc-verified ${u.emailVerified ? "is-on" : ""}"><i class="fa-solid ${u.emailVerified ? "fa-circle-check" : "fa-circle-exclamation"}" aria-hidden="true"></i>${esc(t(u.emailVerified ? "account_verified" : "account_unverified"))}</span>
            <span class="acc-subtle">${esc(t("account_member_since"))}: ${esc(fmtDate(u.createdAt))}</span>
          </p>
        </div>
      </div>
      <div class="acc-hero-actions">
        <a class="acc-btn" href="/#products"><i class="fa-solid fa-store" aria-hidden="true"></i>${esc(t("account_browse_store"))}</a>
        <a class="acc-btn-ghost" href="/status"><i class="fa-solid fa-signal" aria-hidden="true"></i>${esc(t("account_status"))}</a>
      </div>`;
    const toggle = hero.querySelector("[data-email-toggle]");
    toggle.addEventListener("click", () => {
      const text = hero.querySelector("[data-email-text]");
      const shown = text.textContent === u.email;
      text.textContent = shown ? maskEmail(u.email) : u.email;
      toggle.setAttribute("aria-label", t(shown ? "account_show_email" : "account_hide_email"));
      toggle.innerHTML = `<i class="fa-regular ${shown ? "fa-eye" : "fa-eye-slash"}" aria-hidden="true"></i>`;
    });
  }

  function renderNav() {
    const nav = root.querySelector("[data-acc-nav]");
    const ready = state.orders.status === "ready";
    nav.innerHTML = TABS.map((key) => {
      const active = state.tab === key;
      const badge = key === "orders" ? state.orders.list.length : key === "licenses" ? licenses().length : 0;
      return `<button type="button" data-tab="${key}" ${active ? 'aria-current="page"' : ""} class="${active ? "is-active" : ""}">
        <i class="${TAB_ICON[key]}" aria-hidden="true"></i><span>${esc(t(`account_tab_${key}`))}</span>
        ${ready && badge > 0 ? `<b>${badge}</b>` : ""}
        ${key === "security" && !state.user.twoFactor ? `<em title="${esc(t("mfa_status_off"))}" aria-label="${esc(t("mfa_status_off"))}"></em>` : ""}
      </button>`;
    }).join("");
    const active = nav.querySelector('[aria-current="page"]');
    if (active && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
  }

  const refreshBtn = () =>
    state.user.emailVerified
      ? `<button type="button" class="acc-btn-ghost is-sm" data-refresh ${state.orders.status === "loading" ? "disabled" : ""}><i class="fa-solid fa-rotate-right ${state.orders.status === "loading" ? "fa-spin" : ""}" aria-hidden="true"></i>${esc(t("account_refresh"))}</button>`
      : "";

  const searchBox = (placeholder) =>
    `<label class="acc-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" data-search value="${esc(state.query)}" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}"></label>`;

  function gate(content) {
    if (!state.user.emailVerified) return "";
    if (state.orders.status === "error") {
      return `<div class="acc-error-state"><p><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>${tErr(state.orders.error || "orders_err_load")}</p><button type="button" class="acc-btn-ghost is-sm" data-refresh><i class="fa-solid fa-rotate-right" aria-hidden="true"></i>${esc(t("account_retry"))}</button></div>`;
    }
    if (state.orders.status !== "ready") return skeleton;
    return content();
  }

  function matchesQuery(text) {
    const q = state.query.trim().toLowerCase();
    return !q || text.toLowerCase().includes(q);
  }

  function overviewTab() {
    const done = completedOrders();
    const ready = state.orders.status === "ready";
    const spent = done.reduce((sum, o) => sum + o.totalUsd, 0);
    const stat = (icon, label, value, hint = "") =>
      `<div class="acc-stat"><div><span>${esc(label)}</span><i class="fa-solid ${icon}" aria-hidden="true"></i></div><strong>${value}</strong>${hint ? `<small>${esc(hint)}</small>` : ""}</div>`;
    return `${sectionTitle(t("account_hello", { name: state.user.name.split(" ")[0] }), t("account_overview_sub"), refreshBtn())}
      ${
        state.user.emailVerified
          ? `<div class="acc-stats">
          ${stat("fa-bag-shopping", t("account_stat_orders"), ready ? done.length : "—", t("account_stat_orders_hint"))}
          ${stat("fa-wallet", t("account_stat_spent"), ready ? esc(money(spent)) : "—")}
          ${stat("fa-key", t("account_stat_keys"), ready ? licenses().length : "—")}
          ${stat("fa-calendar-check", t("account_stat_last"), `<span class="acc-stat-date">${ready && done[0] ? esc(fmtDate(done[0].createdAt)) : "—"}</span>`)}
        </div>`
          : ""
      }
      ${gate(
        () => `<section class="acc-stack">
          <div class="acc-subhead"><h3>${esc(t("account_recent_orders"))}</h3>${
            state.orders.list.length ? `<button type="button" class="acc-link" data-tab="orders">${esc(t("account_view_all"))}</button>` : ""
          }</div>
          ${
            state.orders.list.length
              ? state.orders.list.slice(0, 3).map(orderCard).join("")
              : emptyState("fa-box-open", t("account_no_orders"), t("account_no_orders_body"), browseAction)
          }
        </section>`
      )}
      <section class="acc-quick">
        ${[
          ["/status", "fa-signal", "account_quick_status", "account_quick_status_body", false],
          [state.invite, "fa-headset", "account_quick_support", "account_quick_support_body", true],
          ["/#faq", "fa-circle-question", "account_quick_faq", "account_quick_faq_body", false],
        ]
          .map(
            ([href, icon, title, body, external]) =>
              `<a href="${esc(href)}" ${external ? 'target="_blank" rel="noopener noreferrer"' : ""}><i class="fa-solid ${icon}" aria-hidden="true"></i><span><strong>${esc(t(title))}</strong><small>${esc(t(body))}</small></span></a>`
          )
          .join("")}
      </section>`;
  }

  function ordersTab() {
    const counts = { all: state.orders.list.length };
    for (const o of state.orders.list) counts[o.status] = (counts[o.status] || 0) + 1;
    const visible = state.orders.list.filter(
      (o) => (state.filter === "all" || o.status === state.filter) && matchesQuery(`${o.id} ${o.items.map((i) => `${i.name} ${i.variant}`).join(" ")}`)
    );
    return `${sectionTitle(t("account_tab_orders"), t("account_orders_page_sub"), refreshBtn())}
      ${gate(
        () => `<div class="acc-toolbar">
          <div class="acc-filters">${FILTERS.map(
            (key) =>
              `<button type="button" data-filter="${key}" class="${state.filter === key ? "is-active" : ""}">${esc(key === "all" ? t("account_filter_all") : t(`order_status_${key}`))}<span>${counts[key] || 0}</span></button>`
          ).join("")}</div>
          ${searchBox(t("account_search_orders"))}
        </div>
        <div data-results>${
          visible.length
            ? `<div class="acc-stack">${visible.map(orderCard).join("")}</div>`
            : state.orders.list.length
              ? emptyState("fa-magnifying-glass", t("account_no_results"), t("account_no_results_body"))
              : emptyState("fa-box-open", t("account_no_orders"), t("account_no_orders_body"), browseAction)
        }</div>`
      )}`;
  }

  function licensesTab() {
    const all = licenses();
    const visible = all.filter((l) => matchesQuery(`${l.item.name} ${l.item.variant} ${l.key}`));
    const right = state.user.emailVerified && all.length ? searchBox(t("account_search_keys")) : refreshBtn();
    return `${sectionTitle(t("account_tab_licenses"), t("account_licenses_sub"), right)}
      ${gate(() =>
        visible.length
          ? `<div class="acc-stack" data-results>${visible
              .map(
                ({ key, item, order }) => `<article class="acc-license">
                  <div class="acc-license-head">${thumb(item, "sm")}
                    <div><strong>${esc(item.name)}${item.variant && item.variant !== item.name ? `<span> · ${esc(item.variant)}</span>` : ""}</strong>
                    <small>${esc(t("account_purchased_on", { date: fmtDate(order.createdAt) }))} · ${esc(shortId(order.id))}</small></div>
                    ${item.slug ? `<a class="acc-link acc-hide-sm" href="/${item.slug}">${esc(t("account_renew"))}</a>` : ""}
                  </div>
                  ${keyRow(key)}
                </article>`
              )
              .join("")}</div>`
          : `<div data-results>${emptyState(
              "fa-key",
              t(all.length ? "account_no_results" : "account_no_keys"),
              t(all.length ? "account_no_results_body" : "account_no_keys_body"),
              all.length ? "" : browseAction
            )}</div>`
      )}`;
  }

  function discordTab() {
    const u = state.user;
    const linked = u.providers.includes("discord");
    const enabled = state.providers.includes("discord");
    const action = linked
      ? `<button type="button" class="acc-btn-ghost" data-unlink="discord"><i class="fa-solid fa-link-slash" aria-hidden="true"></i>${esc(t("account_disconnect"))}</button>`
      : enabled
        ? `<a class="acc-btn-discord" href="/api/auth/oauth/discord?link=1"><i class="fa-brands fa-discord" aria-hidden="true"></i>${esc(t("account_discord_connect"))}</a>`
        : `<p class="acc-hint">${esc(t("account_discord_connect_soon"))}</p>`;
    return `${sectionTitle(t("account_tab_discord"), t("account_discord_sub"))}
      <div class="acc-grid-2">
        ${panel(
          t("account_discord_account"),
          t("account_discord_account_sub"),
          `<div class="acc-discord-id ${linked ? "is-linked" : ""}"><span><i class="fa-brands fa-discord" aria-hidden="true"></i></span>
            <div><strong>${esc(linked ? u.discordName || t("account_connected") : t("account_not_connected"))}</strong><small>${esc(t(linked ? "account_discord_linked_hint" : "account_discord_unlinked_hint"))}</small></div></div>
          ${action}<div data-panel-msg></div>`
        )}
        ${panel(
          t("account_discord_server"),
          t("account_discord_server_sub"),
          `<ul class="acc-checks is-discord">${["account_discord_perk_1", "account_discord_perk_2", "account_discord_perk_3"]
            .map((k) => `<li><i class="fa-solid fa-check" aria-hidden="true"></i>${esc(t(k))}</li>`)
            .join("")}</ul>
          <a class="acc-btn-discord" href="${esc(state.invite)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-discord" aria-hidden="true"></i>${esc(t("account_discord_join"))}</a>`
        )}
      </div>`;
  }

  function supportTab() {
    const recent = state.orders.list.slice(0, 5);
    const channels = [
      [state.invite, true, "fa-brands fa-discord", "is-discord", "account_support_discord", "account_support_discord_body"],
      ["/#faq", false, "fa-solid fa-circle-question", "", "account_quick_faq", "account_quick_faq_body"],
      ["/status", false, "fa-solid fa-signal", "", "account_quick_status", "account_quick_status_body"],
      ["/setup-guide", false, "fa-solid fa-book", "", "account_quick_support", "account_quick_support_body"],
    ];
    return `${sectionTitle(t("account_tab_support"), t("account_support_sub"))}
      <div class="acc-channels">${channels
        .map(
          ([href, external, icon, cls, title, body]) =>
            `<a href="${esc(href)}" ${external ? 'target="_blank" rel="noopener noreferrer"' : ""}><i class="${icon} ${cls}" aria-hidden="true"></i><span><strong>${esc(t(title))}</strong><small>${esc(t(body))}</small></span><i class="fa-solid ${external ? "fa-arrow-up-right-from-square" : "fa-arrow-right"} acc-channel-go" aria-hidden="true"></i></a>`
        )
        .join("")}</div>
      <div class="acc-grid-2">
        ${panel(
          t("account_support_before"),
          t("account_support_before_sub"),
          `<ul class="acc-checks">${["account_support_tip_1", "account_support_tip_2", "account_support_tip_3"]
            .map((k) => `<li><i class="fa-solid fa-check" aria-hidden="true"></i>${esc(t(k, { email: state.user.email }))}</li>`)
            .join("")}</ul>`
        )}
        ${panel(
          t("account_support_orders"),
          t("account_support_orders_sub"),
          recent.length
            ? `<ul class="acc-order-ids">${recent
                .map((o) => `<li><span><strong>${esc(o.items[0]?.name || "—")}</strong><small>${esc(shortId(o.id))}</small></span>${copyButton(o.id, t("account_copy_order_id"))}</li>`)
                .join("")}</ul>`
            : `<p class="acc-hint">${esc(t("account_no_orders"))}</p>`
        )}
      </div>`;
  }

  /* 2FA panel keeps its own state between redraws. */
  const mfa = { setup: null, mode: null, codes: null, error: null, notice: null };

  function twoFactorPanel() {
    const u = state.user;
    const status = `<span class="acc-pill ${u.twoFactor ? "is-on" : ""}"><i class="fa-solid ${u.twoFactor ? "fa-lock" : "fa-lock-open"}" aria-hidden="true"></i>${esc(t(u.twoFactor ? "mfa_status_on" : "mfa_status_off"))}</span>`;
    const codeInput = `<input id="mfa-setup-code" required autocomplete="one-time-code" inputmode="${mfa.mode ? "text" : "numeric"}" maxlength="${mfa.mode ? 9 : 6}" placeholder="123456" class="acc-input acc-code is-narrow" data-mfa-code>`;
    let body = "";
    if (mfa.codes) {
      body += `<div class="acc-codes"><p><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>${esc(t("mfa_codes_warning"))}</p>
        <div class="acc-codes-grid">${mfa.codes.map((c) => `<span>${esc(c)}</span>`).join("")}</div>
        <div class="acc-actions">${copyButton(mfa.codes.join("\n"), t("mfa_codes_copy"))}<button type="button" class="acc-btn-ghost is-sm" data-mfa-download><i class="fa-solid fa-download" aria-hidden="true"></i>${esc(t("mfa_codes_download"))}</button></div></div>`;
    }
    if (!u.twoFactor && !mfa.setup) {
      body += u.emailVerified
        ? `<form class="acc-form" data-mfa-form="setup">
            ${u.hasPassword ? field("mfa-pw", t("account_current_password"), passwordInput("mfa-pw", "current-password")) : ""}
            ${errorBox(mfa.error)}
            <button type="submit" class="acc-btn acc-self-start"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i>${esc(t("mfa_setup_btn"))}</button>
          </form>`
        : `<p class="acc-hint">${esc(t("mfa_err_unverified"))}</p>`;
    }
    if (!u.twoFactor && mfa.setup) {
      body += `<form class="acc-form" data-mfa-form="enable">
        <ol class="acc-steps"><li>${esc(t("mfa_step_1"))}</li><li>${esc(t("mfa_step_2"))}</li><li>${esc(t("mfa_step_3"))}</li></ol>
        <div class="acc-mfa-setup"><div class="acc-qr" role="img" aria-label="${esc(t("mfa_qr_alt"))}">${mfa.setup.qr}</div>
          <div><span class="acc-hint">${esc(t("mfa_manual_key"))}</span><code class="acc-secret">${esc(mfa.setup.secret.replace(/(.{4})/g, "$1 ").trim())}</code>${copyButton(mfa.setup.secret, t("mfa_copy_key"))}</div></div>
        ${field("mfa-setup-code", t("mfa_code"), codeInput)}
        ${errorBox(mfa.error)}
        <div class="acc-actions"><button type="submit" class="acc-btn" disabled>${esc(t("mfa_enable_btn"))}</button><button type="button" class="acc-btn-ghost" data-mfa="cancel-setup">${esc(t("account_cancel"))}</button></div>
      </form>`;
    }
    if (u.twoFactor && !mfa.mode) {
      body += `<p class="acc-muted">${esc(t("mfa_codes_left", { n: u.recoveryCodesLeft }))}</p>
        <div class="acc-actions"><button type="button" class="acc-btn-ghost" data-mfa="regenerate"><i class="fa-solid fa-rotate" aria-hidden="true"></i>${esc(t("mfa_regenerate_btn"))}</button>
        <button type="button" class="acc-btn-ghost is-danger" data-mfa="disable"><i class="fa-solid fa-power-off" aria-hidden="true"></i>${esc(t("mfa_disable_btn"))}</button></div>`;
    }
    if (u.twoFactor && mfa.mode) {
      body += `<form class="acc-form" data-mfa-form="${mfa.mode}">
        <p class="acc-muted">${esc(t(mfa.mode === "disable" ? "mfa_disable_confirm" : "mfa_regenerate_confirm"))}</p>
        ${u.hasPassword ? field("mfa-pw", t("account_current_password"), passwordInput("mfa-pw", "current-password")) : ""}
        ${field("mfa-setup-code", t("mfa_code_or_recovery"), codeInput)}
        ${errorBox(mfa.error)}
        <div class="acc-actions"><button type="submit" class="acc-btn" disabled>${esc(t(mfa.mode === "disable" ? "mfa_disable_btn" : "mfa_regenerate_btn"))}</button><button type="button" class="acc-btn-ghost" data-mfa="cancel-mode">${esc(t("account_cancel"))}</button></div>
      </form>`;
    }
    if (!mfa.setup && !mfa.mode) body += errorBox(mfa.error);
    body += noticeBox(mfa.notice);
    return `<div data-mfa-panel>${panel(t("mfa_title"), t("mfa_sub"), body, status)}</div>`;
  }

  function redrawMfa() {
    const holder = root.querySelector("[data-mfa-panel]");
    if (holder) holder.outerHTML = twoFactorPanel();
    renderNav();
  }

  async function mfaCall(body) {
    mfa.error = null;
    mfa.notice = null;
    const result = await postJson("/api/auth/2fa", body);
    if (!result.ok) {
      mfa.error = result.error;
      redrawMfa();
      return null;
    }
    if (result.data?.user) state.user = result.data.user;
    return result.data || {};
  }

  function securityTab() {
    const u = state.user;
    return `${sectionTitle(t("account_tab_security"), t("account_security_sub"))}
      <div class="acc-stack is-lg">
        ${twoFactorPanel()}
        ${panel(
          t(u.hasPassword ? "account_change_password" : "account_set_password"),
          t(u.hasPassword ? "account_password_sub" : "account_set_password_sub"),
          `<form class="acc-form" data-password-form>
            ${u.hasPassword ? field("acc-current", t("account_current_password"), passwordInput("acc-current", "current-password")) : ""}
            <div class="acc-grid-2 is-tight">
              ${field("acc-new", t("account_new_password"), passwordInput("acc-new", "new-password"), t("auth_password_hint"))}
              ${field("acc-repeat", t("account_repeat_password"), passwordInput("acc-repeat", "new-password"))}
            </div>
            <div data-panel-msg></div>
            <button type="submit" class="acc-btn acc-self-start">${esc(t(u.hasPassword ? "account_save" : "account_set_password"))}</button>
          </form>`
        )}
        <div class="acc-grid-2">
          ${panel(
            t("account_sessions"),
            t("account_signout_all_hint"),
            `<div class="acc-actions">
              <button type="button" class="acc-btn-ghost" data-signout-all ${u.hasPassword ? "disabled" : ""} title="${u.hasPassword ? esc(t("account_signout_all_need_pw")) : ""}"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i>${esc(t("account_signout_all"))}</button>
              <button type="button" class="acc-btn-ghost" data-logout><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>${esc(t("account_signout"))}</button>
            </div>
            ${u.hasPassword ? `<p class="acc-hint" data-signout-hint>${esc(t("account_signout_all_need_pw"))}</p>` : ""}`
          )}
          ${panel(
            t("account_security_tips"),
            "",
            `<ul class="acc-checks">${["account_tip_1", "account_tip_2", "account_tip_3"].map((k) => `<li><i class="fa-solid fa-check" aria-hidden="true"></i>${esc(t(k))}</li>`).join("")}</ul>`
          )}
        </div>
      </div>`;
  }

  const PROVIDER_META = { google: ["Google", "fa-google"], discord: ["Discord", "fa-discord is-discord"] };

  function settingsTab() {
    const u = state.user;
    const shown = ["google", "discord"].filter((p) => u.providers.includes(p) || state.providers.includes(p));
    return `${sectionTitle(t("account_tab_settings"), t("account_settings_sub"))}
      <div class="acc-grid-2">
        ${panel(
          t("account_profile"),
          t("account_profile_sub"),
          `<form class="acc-form" data-profile-form>
            ${field("acc-name", t("auth_name"), `<input id="acc-name" required minlength="2" maxlength="40" autocomplete="name" value="${esc(u.name)}" class="acc-input">`)}
            ${field(
              "acc-email",
              t("auth_email"),
              `<div class="acc-locked"><input id="acc-email" value="${esc(u.email)}" readonly class="acc-input"><span class="acc-pill ${u.emailVerified ? "is-on" : "is-warn"}"><i class="fa-solid ${u.emailVerified ? "fa-circle-check" : "fa-circle-exclamation"}" aria-hidden="true"></i>${esc(t(u.emailVerified ? "account_verified" : "account_unverified"))}</span></div>`,
              t("account_email_locked")
            )}
            <div data-panel-msg></div>
            <button type="submit" class="acc-btn acc-self-start" disabled>${esc(t("account_profile_save"))}</button>
          </form>`
        )}
        ${
          shown.length
            ? panel(
                t("account_linked_accounts"),
                t("account_linked_sub"),
                `<ul class="acc-providers">${shown
                  .map((p) => {
                    const linked = u.providers.includes(p);
                    return `<li><span><i class="fa-brands ${PROVIDER_META[p][1]}" aria-hidden="true"></i><span><strong>${PROVIDER_META[p][0]}</strong><small class="${linked ? "is-on" : ""}">${esc(
                      linked ? (p === "discord" && u.discordName ? u.discordName : t("account_connected")) : t("account_not_connected")
                    )}</small></span></span>${
                      linked
                        ? `<button type="button" class="acc-btn-ghost is-sm" data-unlink="${p}">${esc(t("account_disconnect"))}</button>`
                        : `<a class="acc-btn is-sm" href="/api/auth/oauth/${p}?link=1">${esc(t("account_connect"))}</a>`
                    }</li>`;
                  })
                  .join("")}</ul><div data-panel-msg></div>`
              )
            : ""
        }
      </div>`;
  }

  function verifyCard() {
    return `<section class="acc-verify" data-verify>
      <div class="acc-verify-text"><span><i class="fa-solid fa-envelope-circle-check" aria-hidden="true"></i></span>
        <div><h2>${esc(t("verify_title"))}</h2><p>${esc(t("verify_body", { email: state.user.email }))}</p></div></div>
      <form class="acc-verify-form" data-verify-form>
        <div class="acc-verify-row"><input data-verify-code inputmode="numeric" autocomplete="one-time-code" placeholder="000000" aria-label="${esc(t("verify_code_label"))}" class="acc-input acc-code">
        <button type="submit" class="acc-btn" disabled>${esc(t("verify_confirm_btn"))}</button></div>
        <button type="button" class="acc-link" data-verify-send><i class="fa-solid fa-paper-plane" aria-hidden="true"></i>${esc(t("verify_send_btn"))}</button>
        <div data-verify-msg></div>
      </form>
    </section>`;
  }

  let verifyCooldown = 0;
  let verifyTimer = null;
  function tickCooldown(button) {
    clearInterval(verifyTimer);
    const draw = () => {
      if (!button.isConnected) return clearInterval(verifyTimer);
      button.disabled = verifyCooldown > 0;
      button.innerHTML = `<i class="fa-solid fa-paper-plane" aria-hidden="true"></i>${esc(verifyCooldown > 0 ? t("verify_resend_in", { seconds: verifyCooldown }) : t("verify_send_btn"))}`;
    };
    draw();
    verifyTimer = setInterval(() => {
      verifyCooldown = Math.max(0, verifyCooldown - 1);
      draw();
      if (!verifyCooldown) clearInterval(verifyTimer);
    }, 1000);
  }

  function renderContent() {
    const content = root.querySelector("[data-acc-content]");
    const reset = params.get("reset") === "1" && state.tab === "overview" && !state.notice ? noticeBox(t("reset_done")) : "";
    const link = LINK_NOTICES[params.get("link") || ""];
    const linkHtml = link ? (link[0] === "ok" ? noticeBox(t(link[1])) : errorBox(link[1])) : "";
    const showVerify = !state.user.emailVerified && !["settings", "security", "discord", "support"].includes(state.tab);
    const body = { overview: overviewTab, orders: ordersTab, licenses: licensesTab, discord: discordTab, support: supportTab, security: securityTab, settings: settingsTab }[state.tab]();
    content.innerHTML = `${reset}${linkHtml}${showVerify ? verifyCard() : ""}${body}`;
    if (showVerify && verifyCooldown > 0) tickCooldown(content.querySelector("[data-verify-send]"));
  }

  function panelMsg(el, { error, notice }) {
    const box = el.closest(".acc-panel")?.querySelector("[data-panel-msg]") || el.querySelector("[data-panel-msg]");
    if (box) box.innerHTML = error ? errorBox(error) : noticeBox(notice);
  }

  async function logout() {
    await postJson("/api/auth/logout", {});
    window.location.assign("/");
  }

  function bindDashboard() {
    const nav = root.querySelector("[data-acc-nav]");
    const content = root.querySelector("[data-acc-content]");

    nav.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tab]");
      if (btn) setTab(btn.dataset.tab);
    });

    content.addEventListener("input", (e) => {
      const target = e.target;
      if (target.matches("[data-search]")) {
        state.query = target.value;
        const results = content.querySelector("[data-results]");
        const html = state.tab === "orders" ? ordersTab() : licensesTab();
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        const fresh = tmp.querySelector("[data-results]");
        if (results && fresh) results.replaceWith(fresh);
        return;
      }
      if (target.matches("[data-verify-code]")) {
        target.value = target.value.replace(/\D/g, "").slice(0, 6);
        target.form.querySelector('button[type="submit"]').disabled = target.value.length !== 6;
        return;
      }
      if (target.matches("[data-mfa-code]")) {
        target.value = mfa.mode ? target.value.toUpperCase() : target.value.replace(/\D/g, "");
        target.form.querySelector('button[type="submit"]').disabled = mfa.mode ? target.value.length < 6 : target.value.length !== 6;
        return;
      }
      if (target.id === "acc-name") {
        target.form.querySelector('button[type="submit"]').disabled = target.value.trim() === state.user.name;
        return;
      }
      if (target.id === "acc-current") {
        const btn = content.querySelector("[data-signout-all]");
        if (btn) btn.disabled = !target.value;
        const hint = content.querySelector("[data-signout-hint]");
        if (hint) hint.hidden = Boolean(target.value);
      }
    });

    content.addEventListener("click", async (e) => {
      const el = e.target.closest("button, a");
      if (!el) return;

      if (el.matches("[data-tab]")) return setTab(el.dataset.tab);
      if (el.matches("[data-refresh]")) return loadOrders(true);
      if (el.matches("[data-filter]")) {
        state.filter = el.dataset.filter;
        return renderContent();
      }
      if (el.matches("[data-order-toggle]")) {
        const body = el.parentElement.querySelector(".acc-order-body");
        const open = body.hidden;
        body.hidden = !open;
        el.setAttribute("aria-expanded", String(open));
        el.classList.toggle("is-open", open);
        return;
      }
      if (el.matches("[data-key-toggle]")) {
        const code = el.parentElement.querySelector("[data-key-text]");
        const shown = code.textContent === code.dataset.value;
        code.textContent = shown ? code.dataset.masked : code.dataset.value;
        el.innerHTML = `<i class="fa-regular ${shown ? "fa-eye" : "fa-eye-slash"}" aria-hidden="true"></i>${esc(t(shown ? "account_key_show" : "account_key_hide"))}`;
        return;
      }
      if (el.matches("[data-print]")) {
        const order = state.orders.list.find((o) => o.id === el.dataset.print);
        if (order) printReceipt(order);
        return;
      }
      if (el.matches("[data-logout]")) {
        setBusy(el, true);
        return logout();
      }
      if (el.matches("[data-unlink]")) {
        setBusy(el, true);
        const result = await postJson("/api/auth/unlink", { provider: el.dataset.unlink });
        if (!result.ok || !result.data?.user) {
          setBusy(el, false);
          return panelMsg(el, { error: result.error });
        }
        return setUser(result.data.user);
      }
      if (el.matches("[data-verify-send]")) {
        el.disabled = true;
        el.innerHTML = `${spinner}${esc(t("verify_send_btn"))}`;
        const msg = content.querySelector("[data-verify-msg]");
        const result = await postJson("/api/auth/verify/send", {});
        if (!result.ok) {
          if (result.error === "verify_err_cooldown") verifyCooldown = 60;
          msg.innerHTML = errorBox(result.error);
        } else {
          verifyCooldown = 60;
          msg.innerHTML = noticeBox(t("verify_sent", { email: state.user.email }));
          content.querySelector("[data-verify-code]")?.focus();
        }
        return tickCooldown(el);
      }
      if (el.matches("[data-signout-all]")) {
        return submitPassword(content.querySelector("[data-password-form]"), true, el);
      }
      if (el.matches("[data-mfa-download]")) {
        const url = URL.createObjectURL(new Blob([`LOLScript recovery codes\n\n${mfa.codes.join("\n")}\n`], { type: "text/plain" }));
        Object.assign(document.createElement("a"), { href: url, download: "lolscript-recovery-codes.txt" }).click();
        URL.revokeObjectURL(url);
        return;
      }
      if (el.matches("[data-mfa]")) {
        const action = el.dataset.mfa;
        if (action === "setup") {
          setBusy(el, true);
          const data = await mfaCall({ action: "setup" });
          if (data?.secret && data.qr) {
            mfa.setup = { secret: data.secret, qr: data.qr };
            mfa.codes = null;
          }
          return redrawMfa();
        }
        if (action === "cancel-setup") mfa.setup = null;
        if (action === "cancel-mode") mfa.mode = null;
        if (action === "regenerate" || action === "disable") mfa.mode = action;
        mfa.error = null;
        return redrawMfa();
      }
    });

    content.addEventListener("submit", async (e) => {
      const form = e.target;
      e.preventDefault();
      const submit = form.querySelector('button[type="submit"]');

      if (form.matches("[data-verify-form]")) {
        const input = form.querySelector("[data-verify-code]");
        if (input.value.length !== 6) return;
        setBusy(submit, true);
        const result = await postJson("/api/auth/verify/confirm", { code: input.value });
        if (!result.ok || !result.data?.user) {
          setBusy(submit, false);
          if (result.error !== "verify_err_invalid") input.value = "";
          submit.disabled = input.value.length !== 6;
          form.querySelector("[data-verify-msg]").innerHTML = errorBox(result.error);
          return;
        }
        return setUser(result.data.user);
      }

      if (form.matches("[data-profile-form]")) {
        setBusy(submit, true);
        const result = await postJson("/api/auth/profile", { name: form.querySelector("#acc-name").value });
        setBusy(submit, false);
        if (!result.ok || !result.data?.user) return panelMsg(form, { error: result.error });
        state.user = result.data.user;
        renderHero();
        submit.disabled = true;
        return panelMsg(form, { notice: t("account_profile_saved") });
      }

      if (form.matches("[data-password-form]")) return submitPassword(form, false, submit);

      if (form.matches('[data-mfa-form="setup"]')) {
        setBusy(submit, true);
        const data = await mfaCall({ action: "setup", password: form.querySelector("#mfa-pw")?.value || "" });
        if (data?.secret && data.qr) {
          mfa.setup = { secret: data.secret, qr: data.qr };
          mfa.codes = null;
        }
        return redrawMfa();
      }
      if (form.matches("[data-mfa-form]")) {
        const code = form.querySelector("[data-mfa-code]").value;
        setBusy(submit, true);
        if (form.dataset.mfaForm === "enable") {
          const data = await mfaCall({ action: "enable", code });
          if (data?.recoveryCodes) {
            mfa.setup = null;
            mfa.codes = data.recoveryCodes;
            mfa.notice = t("mfa_enabled_notice");
          }
          return redrawMfa();
        }
        const mode = form.dataset.mfaForm;
        const data = await mfaCall({ action: mode, code, password: form.querySelector("#mfa-pw")?.value || "" });
        if (!data) return;
        mfa.mode = null;
        mfa.codes = data.recoveryCodes || null;
        mfa.notice = t(mode === "disable" ? "mfa_disabled_notice" : "mfa_regenerated_notice");
        return redrawMfa();
      }
    });
  }

  async function submitPassword(form, signOutEverywhere, button) {
    const current = form.querySelector("#acc-current")?.value || "";
    const next = form.querySelector("#acc-new").value;
    if (!signOutEverywhere && next !== form.querySelector("#acc-repeat").value) return panelMsg(form, { error: "reset_err_mismatch" });
    setBusy(button, true);
    const result = await postJson("/api/auth/password", { currentPassword: current, newPassword: next, signOutEverywhere });
    setBusy(button, false);
    if (!result.ok) {
      if (result.error === "auth_err_session") window.location.assign("/login");
      return panelMsg(form, { error: result.error });
    }
    form.reset();
    if (!signOutEverywhere && !state.user.hasPassword) {
      state.user = { ...state.user, hasPassword: true };
      renderContent();
      return panelMsg(root.querySelector("[data-password-form]"), { notice: t("account_password_updated") });
    }
    const signOutBtn = root.querySelector("[data-signout-all]");
    if (signOutBtn && state.user.hasPassword) signOutBtn.disabled = true;
    panelMsg(form, { notice: t(signOutEverywhere ? "account_signout_all_done" : "account_password_updated") });
  }

  async function renderAccount() {
    root.innerHTML = `<div class="acc-loading">${spinner}</div>`;
    const session = await getSession();
    if (!session.user) {
      const tab = params.get("tab");
      window.location.replace(`/login?next=${encodeURIComponent(tab ? `/account?tab=${tab}` : "/account")}`);
      return;
    }
    state.user = session.user;
    state.providers = session.providers;
    state.tab = TABS.includes(params.get("tab")) ? params.get("tab") : "overview";
    state.invite = await discordInvite();

    root.innerHTML = `<div class="acc-dashboard">
      <div class="acc-hero" data-acc-hero></div>
      <div class="acc-layout">
        <nav class="acc-nav" data-acc-nav aria-label="${esc(t("account_title"))}"></nav>
        <div class="acc-content" data-acc-content></div>
      </div>
    </div>`;
    renderHero();
    renderNav();
    renderContent();
    bindDashboard();
    if (state.user.emailVerified) loadOrders();
  }

  /* ---------- boot ---------- */

  async function bootAuth(mode) {
    const session = await getSession();
    if (session.user) return window.location.replace("/account");
    const oauthError = params.get("oauth_error");
    const initialError = oauthError && /^[a-z_]{1,30}$/.test(oauthError) ? `auth_err_oauth_${oauthError}` : null;
    renderAuthForm(mode, session.providers, initialError, mode === "login" && params.get("mfa") === "1", session.captcha);
  }

  if (page === "login" || page === "register") bootAuth(page);
  else if (page === "forgot") renderForgot();
  else if (page === "reset") renderReset();
  else if (page === "account") renderAccount();
})();

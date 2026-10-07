(function () {
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const menuToggle = document.querySelector("[data-menu-toggle]");

  if (header) {
    header.classList.add("scrolled");
  }

  if (nav && !nav.querySelector('a[href="/terms"]')) {
    const faqLink = nav.querySelector('a[href="/#faq"], a[href="#faq"]');
    const termsLink = document.createElement("a");
    termsLink.href = "/terms";
    termsLink.textContent = "Terms";
    if (faqLink) faqLink.before(termsLink);
    else nav.appendChild(termsLink);
  }

  document.querySelectorAll(".footer-links").forEach((footerNav) => {
    const supportCol = Array.from(footerNav.children).find((col) => {
      const heading = col.querySelector("h3");
      return heading && /support/i.test(heading.textContent || "");
    });
    if (supportCol && !supportCol.querySelector('a[href="/terms"]')) {
      const termsLink = document.createElement("a");
      termsLink.href = "/terms";
      termsLink.textContent = "Terms of Service";
      const discord = supportCol.querySelector('a[href*="discord"]');
      if (discord) discord.before(termsLink);
      else supportCol.appendChild(termsLink);
    }
  });

  if (menuToggle && nav) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-controls", "primary-nav");
    if (!nav.id) nav.id = "primary-nav";

    const setMenu = (open) => {
      nav.classList.toggle("open", open);
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-open", open);
    };

    menuToggle.addEventListener("click", () => {
      setMenu(!nav.classList.contains("open"));
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("open")) {
        setMenu(false);
        menuToggle.focus();
      }
    });

    document.addEventListener("click", (event) => {
      if (
        nav.classList.contains("open") &&
        !nav.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        setMenu(false);
      }
    });

    const desktopQuery = window.matchMedia("(min-width: 981px)");
    desktopQuery.addEventListener("change", (event) => {
      if (event.matches) setMenu(false);
    });
  }

  document.querySelectorAll(".has-dropdown").forEach((item) => {
    let closeTimer;

    const open = () => {
      clearTimeout(closeTimer);
      item.classList.add("dropdown-open");
    };

    const close = () => {
      clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => item.classList.remove("dropdown-open"), 450);
    };

    item.addEventListener("pointerenter", open);
    item.addEventListener("pointerleave", close);
    item.addEventListener("focusin", open);
    item.addEventListener("focusout", close);
  });

  const shell = header && header.querySelector(".header-shell");
  if (shell && !shell.querySelector("[data-account-menu]")) {
    const esc = (s) =>
      String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

    window.lsAuthSession = fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data && data.user) || null)
      .catch(() => null);

    const menu = document.createElement("div");
    menu.className = "account-menu";
    menu.dataset.accountMenu = "";
    const cta = shell.querySelector(".header-cta");
    if (cta) cta.before(menu);
    else shell.appendChild(menu);
    shell.classList.add("has-account");

    const navLink = document.createElement("a");
    navLink.className = "nav-account-link";
    if (nav) nav.appendChild(navLink);

    const renderSignedOut = () => {
      const next = location.pathname === "/" ? "" : `?next=${encodeURIComponent(location.pathname + location.search)}`;
      const isAuthPage = /^\/(login|register|forgot-password|reset-password)/.test(location.pathname);
      const href = isAuthPage ? "/login" : `/login${next}`;
      menu.innerHTML = `<a class="account-link" href="${esc(href)}" aria-label="Sign in" title="Sign in"><i class="fa-solid fa-user" aria-hidden="true"></i></a>`;
      navLink.href = href;
      navLink.textContent = "Sign in";
    };

    const renderSignedIn = (user) => {
      const label = user.name || user.email || "";
      const initial = esc((label.trim()[0] || "?").toUpperCase());
      menu.innerHTML = `<button class="account-link is-user" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Account menu" data-account-toggle>${initial}${
        user.emailVerified ? "" : '<span class="account-dot" aria-hidden="true"></span>'
      }</button>
      <div class="account-dropdown" role="menu" hidden data-account-dropdown>
        <div class="account-dropdown-head">
          <strong>${esc(user.name || "Account")}</strong>
          <small>${esc(user.email)}</small>
          ${user.emailVerified ? "" : '<a href="/account"><i class="fa-solid fa-envelope-circle-check" aria-hidden="true"></i>Verify your email</a>'}
        </div>
        <div class="account-dropdown-list">
          <a href="/account" role="menuitem"><i class="fa-solid fa-gauge" aria-hidden="true"></i>Overview</a>
          <a href="/account?tab=orders" role="menuitem"><i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>Orders</a>
          <a href="/account?tab=licenses" role="menuitem"><i class="fa-solid fa-key" aria-hidden="true"></i>License keys</a>
          <a href="/account?tab=security" role="menuitem"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i>Security</a>
        </div>
        <div class="account-dropdown-list">
          <button type="button" role="menuitem" data-account-signout><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>Sign out</button>
        </div>
      </div>`;
      navLink.href = "/account";
      navLink.textContent = "My account";

      const toggle = menu.querySelector("[data-account-toggle]");
      const dropdown = menu.querySelector("[data-account-dropdown]");
      const setOpen = (open) => {
        dropdown.hidden = !open;
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      };
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        setOpen(dropdown.hidden);
      });
      document.addEventListener("click", (event) => {
        if (!menu.contains(event.target)) setOpen(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !dropdown.hidden) {
          setOpen(false);
          toggle.focus();
        }
      });
      menu.querySelector("[data-account-signout]").addEventListener("click", async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
        } catch {}
        location.href = "/";
      });
    };

    renderSignedOut();
    window.lsAuthSession.then((user) => {
      if (user) renderSignedIn(user);
    });
  }

  if (!document.querySelector("script[data-discord-links]")) {
    const script = document.createElement("script");
    script.src = "/discord-links.js?v=discord-20260617";
    script.defer = true;
    script.dataset.discordLinks = "true";
    document.head.appendChild(script);
  }
})();

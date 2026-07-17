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

  if (!document.querySelector("script[data-discord-links]")) {
    const script = document.createElement("script");
    script.src = "/discord-links.js?v=discord-20260617";
    script.defer = true;
    script.dataset.discordLinks = "true";
    document.head.appendChild(script);
  }
})();

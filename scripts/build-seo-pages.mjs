// Generates keyword landing pages from the /lol-script template (header, footer, styles).
//   node scripts/build-seo-pages.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { LOCALES, LOL_SCRIPT_ALTERNATES, SERVERS } from "./seo-locales.mjs";

const SITE = "https://www.lolscript.store";
const template = readFileSync("public/lol-script.html", "utf8");
const pick = (re) => {
  const m = template.match(re);
  if (!m) throw new Error(`Template block not found: ${re}`);
  return m[0];
};
const style = pick(/<style>[\s\S]*?<\/style>/);
const header = pick(/<header class="site-header[\s\S]*?<\/header>/);
const footer = pick(/<footer class="footer">[\s\S]*?<\/footer>/);
const stylesheet = pick(/<link rel="stylesheet" href="\/style\.css[^"]*">/);
const checkoutScripts = [
  pick(/<script src="\/terms-acceptance\.js[^"]*"><\/script>/),
  pick(/<script src="\/sellhub-checkout\.js[^"]*"><\/script>/),
  pick(/<script src="\/spin-wheel\.js[^"]*" defer><\/script>/),
].join("\n  ");

/** Hero purchase block, same markup as the product page so sellhub-checkout.js opens checkout in place. */
const buyLabels = {
  en: { note: "per plan &bull; instant delivery", buy: "Buy Now", discord: "Join Discord", trust: ["Instant key delivery", "Secure checkout", "Setup guidance included", "Live Discord support"] },
  tr: { note: "plan başına &bull; anında teslimat", buy: "Satın Al", discord: "Discord'a Katıl", trust: ["Anında key teslimatı", "Güvenli ödeme", "Kurulum rehberi dahil", "Canlı Discord desteği"] },
};
const buyBlock = (slug, cents, lang = "en", labels) => {
  const t = labels || buyLabels[lang] || buyLabels.en;
  return `<div class="variant-picker" data-variant-picker="${slug}"></div>
          <div class="price-row">
            <span class="price" data-price-slug="${slug}" data-money-usd-cents="${cents}">$${(cents / 100).toFixed(2)}</span>
            <span class="price-note" data-price-note-slug="${slug}">${t.note}</span>
          </div>
          <div class="hero-actions">
            <a class="button primary" data-buy-slug="${slug}" href="/#products">${t.buy}</a>
            <a class="button secondary" href="https://discord.gg/n2ng5mJjhm" target="_blank" rel="noreferrer">${t.discord}</a>
          </div>
          <ul class="trust-list">
            ${t.trust.map((x) => `<li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${x}</li>`).join("\n            ")}
          </ul>`;
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const stripTags = (s) => String(s).replace(/<[^>]+>/g, "");

function faqHtml(items) {
  return items
    .map((f, i) => `<details${i === 0 ? " open" : ""}><summary>${f.q}</summary><p>${f.a}</p></details>`)
    .join("\n          ");
}

function faqLd(items) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: stripTags(f.q),
      acceptedAnswer: { "@type": "Answer", text: stripTags(f.a) },
    })),
  };
}

function page(p) {
  const url = `${SITE}/${p.path || p.slug}`;
  const ogImage = `${SITE}/assets/og/${p.ogImage || "lol-script.png"}`;
  const parent = p.parent || { name: "LoL Script", href: "/lol-script" };
  const home = p.home || (p.lang === "tr" ? "Ana Sayfa" : "Home");
  const alternates = (p.alternates || [])
    .map(([lang, href]) => `\n  <link rel="alternate" hreflang="${lang}" href="${SITE}${href}">`)
    .join("");
  const cta = p.cta || [
    { label: "View LoL Script Plans", href: "/lol-script", primary: true },
    { label: "Setup Guide", href: "/setup-guide-lol-script" },
  ];
  const ctaHtml = cta
    .map((c) => `<a class="button ${c.primary ? "primary" : "secondary"}" href="${c.href}">${c.label}</a>`)
    .join("\n            ");
  const graph = [
    ...(p.article
      ? [{
          "@type": "Article",
          "@id": `${url}#article`,
          headline: p.h1,
          description: p.description,
          image: ogImage,
          datePublished: p.article.published,
          dateModified: p.article.modified,
          author: { "@type": "Organization", name: "LOLScript.store", url: `${SITE}/` },
          publisher: { "@id": `${SITE}/#organization` },
          mainEntityOfPage: url,
        }]
      : []),
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: home, item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: parent.name, item: `${SITE}${parent.href}` },
        { "@type": "ListItem", position: 3, name: p.crumb, item: url },
      ],
    },
    faqLd(p.faq),
  ];

  return `<!doctype html>
<html lang="${p.lang || "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(p.title)}</title>
  <meta name="description" content="${esc(p.description)}">
  <meta name="keywords" content="${esc(p.keywords)}">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="${p.article ? "article" : "website"}">
  <meta property="og:site_name" content="LOLScript.store">${p.ogLocale ? `\n  <meta property="og:locale" content="${p.ogLocale}">` : ""}
  <meta property="og:title" content="${esc(p.ogTitle)}">
  <meta property="og:description" content="${esc(p.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(p.ogTitle)}">
  <meta name="twitter:description" content="${esc(p.description)}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="canonical" href="${url}">${alternates}
  <link rel="icon" href="/favicon.ico">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#0b0712">
  <link rel="apple-touch-icon" href="/assets/image/logo.png">
  ${stylesheet}
  <script src="/patch-status.js?v=patch-status-20260618" defer></script>
  <script src="/site-header.js?v=responsive-apple-20260618b" defer></script>
  <script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2)}
  </script>
  ${style}
</head>
<body>
  ${header}

  <main>
    <section class="product-hero">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">${home}</a> / <a href="${parent.href}">${parent.name}</a> / <b>${p.crumb}</b>
      </nav>
      <div class="product-hero-grid">
        <div class="product-copy">
          <p class="badge">${p.badge}</p>
          <h1>${p.h1}</h1>
          <p class="lead">${p.lead}</p>
          ${p.buy ? buyBlock(p.buy, 399, p.lang, p.buyLabels) : `<div class="hero-actions">
            ${ctaHtml}
            <a class="button secondary" href="https://discord.gg/n2ng5mJjhm" target="_blank" rel="noreferrer">Join Discord</a>
          </div>`}
        </div>
        <div class="product-visual">
          <div class="product-hero-visual" aria-hidden="true">
            <img class="product-hero-character" src="/assets/image/hero-image.webp" alt="">
          </div>
        </div>
      </div>
    </section>
${p.sections}
    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">FAQ</p>
          <h2>${p.faqTitle}</h2>
        </div>
        <div class="faq-list">
          ${faqHtml(p.faq)}
        </div>
      </div>
    </section>

    <section class="product-section alt">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">${p.relatedEyebrow || (p.lang === "tr" ? "İlgili" : "Related")}</p>
          <h2>${p.relatedTitle || "More about the LoL Script"}</h2>
        </div>
        <div class="spec-grid">
          ${p.related
            .map((r) => `<article class="spec-card"><h3><a href="${r.href}">${r.title}</a></h3><p>${r.text}</p></article>`)
            .join("\n          ")}
        </div>
      </div>
    </section>
  </main>

  ${footer}

  <script src="/currency.js?v=currency-20261010"></script>
  <script src="/cart.js?v=conversion-20260513"></script>${p.buy ? `\n  ${checkoutScripts}` : ""}
  <script src="/analytics.js?v=conversion-20260513" defer></script>
</body>
</html>
`;
}

const related = {
  script: { href: "/lol-script", title: "LoL Script", text: "The full League of Legends script: evade, prediction, orbwalker, target selector, combos, and activator for 150+ champions." },
  orbwalker: { href: "/lol-orbwalker-script", title: "LoL Orbwalker Script", text: "Attack-move timing, kiting, spacing, and last-hit flow for champions that depend on clean auto attacks." },
  evade: { href: "/lol-evade-script", title: "LoL Evade Script", text: "Configurable skillshot dodging that works together with the prediction engine and your champion profile." },
  vanguard: { href: "/league-of-legends-scripting-after-vanguard", title: "Scripting After Vanguard", text: "What changed for League of Legends scripts after Riot Vanguard, and how the current setup works." },
  guide: { href: "/setup-guide-lol-script", title: "LoL Script Setup Guide", text: "BIOS and Windows checklist, USB boot loader, hotkeys, and first champion profile, step by step." },
  spoofer: { href: "/lol-perm-spoofer", title: "LoL Spoofer", text: "Permanent HWID perm spoofer for League of Legends: TPM, MAC, and hardware serials, verified step by step." },
  spooferGuide: { href: "/setup-guide-perm-spoofer", title: "Perm Spoofer Setup Guide", text: "Clean Windows install, BIOS flash, TPM clear, MAC and TPM spoof, perm spoof, and serial verification." },
  hwid: { href: "/league-of-legends-hwid-ban", title: "League of Legends HWID Ban", text: "What a LoL hardware ban is, how it differs from an account ban, and what your options are." },
  emulator: { href: "/lol-vanguard-emulator", title: "LoL Vanguard Emulator", text: "Removes Riot Vanguard from your PC so League of Legends runs without the anti-cheat." },
};

const productCards = `
        <div class="spec-grid">
          <article class="spec-card"><h3><i class="fa-solid fa-code" aria-hidden="true"></i> <a href="/lol-script">LoL Script</a></h3><p>Evade, prediction, orbwalker, target selector, combos, and activator for 150+ champions. <strong>From $3.99.</strong></p><p><a class="button primary" data-buy-slug="lol-script" href="/lol-script">Buy Now</a></p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> <a href="/lol-vanguard-emulator">LoL Vanguard Emulator</a></h3><p>Removes Riot Vanguard from your PC so League of Legends runs without the anti-cheat. <strong>From $79.99.</strong></p><p><a class="button primary" data-buy-slug="lol-vanguard-emulator" href="/lol-vanguard-emulator">Buy Now</a></p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-fingerprint" aria-hidden="true"></i> <a href="/lol-perm-spoofer">LoL Perm Spoofer</a></h3><p>Permanent HWID spoofer for a clean League of Legends start. Supports most motherboards and disks. <strong>From $19.99.</strong></p><p><a class="button primary" data-buy-slug="lol-perm-spoofer" href="/lol-perm-spoofer">Buy Now</a></p></article>
        </div>`;

const lolscriptPitch = `
          <article class="spec-card"><h3><i class="fa-solid fa-desktop" aria-hidden="true"></i> No second PC</h3><p>The LoL Script runs from a prepared USB loader on your own PC. See the <a href="/setup-guide-lol-script">setup guide</a>.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-rotate" aria-hidden="true"></i> Same-day patch updates</h3><p>Updates are normally ready the day League patches. Check the live <a href="/status">status page</a> any time.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-bolt-lightning" aria-hidden="true"></i> Instant delivery</h3><p>Your key appears on-screen and by email right after checkout with card, crypto, or Binance Gift Card.</p></article>
          <article class="spec-card"><h3><i class="fa-brands fa-discord" aria-hidden="true"></i> Live Discord</h3><p>Ask questions, read patch notes, and see community activity before you pay.</p></article>`;

const howItWorks = `
        <ol class="steps">
          <li><div><h3>Pick your product</h3><p>Choose the <a href="/lol-script">LoL Script</a>, and add the Vanguard Emulator or Perm Spoofer if your setup needs them.</p></div></li>
          <li><div><h3>Checkout in a minute</h3><p>Pay with card, crypto, or Binance Gift Card and get your key instantly.</p></div></li>
          <li><div><h3>Follow the setup guide</h3><p>Step-by-step instructions for every product on the <a href="/setup-guide">setup guides page</a>.</p></div></li>
          <li><div><h3>Load in and climb</h3><p>Tune evade, prediction, orbwalker, and combos around your champions.</p></div></li>
        </ol>`;

const riskAnswer =
  'Every LOLScript product is tested on each League of Legends patch, and the current status is shown live on the <a href="/status">status page</a>. Follow the setup guide step by step and pair it with the <a href="/lol-vanguard-emulator">Vanguard Emulator</a> and <a href="/lol-perm-spoofer">Perm Spoofer</a> for the cleanest setup. Usage terms are in the <a href="/terms">Terms of Service</a>.';

const section = ({ eyebrow, h2, sub, alt, body }) => `
    <section class="product-section${alt ? " alt" : ""}">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">${eyebrow}</p>
          <h2>${h2}</h2>${sub ? `\n          <p>${sub}</p>` : ""}
        </div>${body || ""}
      </div>
    </section>
`;
const cards = (items) => `
        <div class="spec-grid">
${items.map(([icon, h3, text]) => `          <article class="spec-card"><h3><i class="${icon}" aria-hidden="true"></i> ${h3}</h3><p>${text}</p></article>`).join("\n")}
        </div>`;
const steps = (items) => `
        <ol class="steps">
${items.map(([h3, text]) => `          <li><div><h3>${h3}</h3><p>${text}</p></div></li>`).join("\n")}
        </ol>`;

Object.assign(related, {
  best: { href: "/best-lol-scripts", title: "Best LoL Script 2026", text: "What to look for in a LoL script in 2026 and why a maintained, Vanguard-ready script matters." },
  safe: { href: "/safe-lol-script", title: "Safe LoL Script", text: "The undetected setup: Vanguard Emulator, Perm Spoofer, patch-day updates, and settings that look natural." },
  free: { href: "/free-lol-script", title: "Free LoL Script", text: "Why free LoL scripts stop working and how to start a working LoL script for $3.99." },
  download: { href: "/lol-script-download", title: "LoL Script Download", text: "Where the official LoL Script loader comes from and how to install it step by step." },
  aimbot: { href: "/lol-aimbot", title: "LoL Aimbot Script", text: "Skillshot prediction that leads moving targets, with hit chance and range settings per champion." },
});

const intentPages = [
  {
    slug: "safe-lol-script",
    article: { published: "2026-10-01", modified: "2026-10-01" },
    parent: { name: "Best LoL Script", href: "/best-lol-scripts" },
    relatedTitle: "Explore LOLScript",
    buy: "lol-script",
    title: "Safe LoL Script 2026: Undetected, No-Ban Setup | LOLScript",
    ogTitle: "Safe LoL Script 2026: Undetected, No-Ban Setup",
    description:
      "Safe LoL script for 2026: undetected League of Legends script with Vanguard Emulator, Perm Spoofer, and patch-day updates. From $3.99, instant delivery.",
    keywords: "safe lol script, undetected lol script, lol script no ban, no ban lol script, ban free lol script, safe league of legends script, undetected league script, lol script undetected 2026, safest lol script",
    crumb: "Safe LoL Script",
    badge: "Undetected LoL Script",
    h1: "Safe LoL script: the undetected setup for 2026",
    lead:
      "A safe LoL script is more than the script itself. LOLScript combines an undetected League of Legends script with a Vanguard Emulator, a Perm Spoofer, and same-day patch updates, so every part of your setup is covered.",
    sections:
      section({
        eyebrow: "The safe setup",
        h2: "Four layers of a safe LoL script",
        sub: "Each layer covers a different part of your setup. Use the ones your PC needs.",
        body: cards([
          ["fa-solid fa-shield-halved", '<a href="/lol-vanguard-emulator">Vanguard Emulator</a>', "Removes Riot Vanguard from your PC so League of Legends runs without the kernel anti-cheat."],
          ["fa-solid fa-fingerprint", '<a href="/lol-perm-spoofer">Perm Spoofer</a>', "Gives your PC fresh, permanent hardware identifiers for a clean start: TPM, MAC, disk, and board serials."],
          ["fa-solid fa-rotate", "Patch-day updates", 'Every product is tested on each League patch. The live <a href="/status">status page</a> shows the current state before you play.'],
          ["fa-solid fa-sliders", "Natural settings", "Tune evade aggressiveness, cast delay, and orbwalker timing so your gameplay looks like a strong player, not a bot."],
        ]),
      }) +
      section({
        eyebrow: "Step by step",
        h2: "The safest way to set up your LoL script",
        alt: true,
        body: steps([
          ["Start clean", 'If your hardware was flagged before, run the <a href="/lol-perm-spoofer">Perm Spoofer</a> first and verify every serial.'],
          ["Install the Vanguard Emulator", 'Follow the <a href="/setup-guide-vanguard-emulator">Vanguard Emulator setup guide</a> so League runs without Vanguard.'],
          ["Load the LoL Script", 'Prepare the USB loader with the <a href="/setup-guide-lol-script">LoL Script setup guide</a> and pick your champion profile.'],
          ["Test before ranked", "Try your settings in Practice Tool or normals, then take them to ranked once everything feels natural."],
        ]),
      }) +
      section({ eyebrow: "Products", h2: "Build your safe setup", sub: "Every key is delivered instantly after checkout.", body: productCards }),
    faqTitle: "Safe LoL script questions",
    faq: [
      { q: "What is the safest LoL script in 2026?", a: 'The safest LoL script is one that is updated on patch day and used with a clean setup. LOLScript pairs the <a href="/lol-script">LoL Script</a> with the Vanguard Emulator and Perm Spoofer for exactly that.' },
      { q: "Is there a no-ban LoL script?", a: riskAnswer },
      { q: "Do I need the Vanguard Emulator for a safe setup?", a: 'It is the recommended setup. The <a href="/lol-vanguard-emulator">Vanguard Emulator</a> removes Riot Vanguard from your PC, so League of Legends runs without the anti-cheat while the script is loaded.' },
      { q: "When do I need the Perm Spoofer?", a: 'If your PC was hardware banned before, or you want a fresh start, the <a href="/lol-perm-spoofer">Perm Spoofer</a> gives your hardware new permanent identifiers.' },
      { q: "Are free LoL scripts safe?", a: 'Free LoL scripts are rarely updated after a patch and are a common way to spread malware. See <a href="/free-lol-script">why free LoL scripts fail</a>.' },
    ],
    related: [related.script, related.emulator, related.spoofer, related.best],
  },
  {
    slug: "free-lol-script",
    article: { published: "2026-10-01", modified: "2026-10-01" },
    relatedTitle: "Explore LOLScript",
    buy: "lol-script",
    title: "Free LoL Script? Get a Working One From $3.99 | LOLScript",
    ogTitle: "Free LoL Script? Get a Working One From $3.99",
    description:
      "Looking for a free LoL script? Most stopped working after Vanguard. Get a working, undetected LoL script with every feature from $3.99, delivered instantly.",
    keywords: "free lol script, lol script free, free lol script download, lol script free download, free league of legends script, lol free script 2026, cheap lol script, lol script trial",
    crumb: "Free LoL Script",
    badge: "From $3.99",
    h1: "Free LoL script? Here is one that actually works",
    lead:
      "Free LoL scripts mostly disappeared after Riot Vanguard. The ones left are outdated, broken after the next patch, or packed with malware. LOLScript gives you a working LoL script with every feature for $3.99.",
    sections:
      section({
        eyebrow: "Why free fails",
        h2: "Why free LoL scripts stop working",
        body: cards([
          ["fa-solid fa-calendar-xmark", "No patch updates", "League patches every two weeks. A free script without a team behind it breaks with the next patch and stays broken."],
          ["fa-solid fa-shield-virus", "Malware risk", "Free downloads are a common way to spread stealers and miners. Your Riot account and PC are worth more than $3.99."],
          ["fa-solid fa-shield-halved", "No Vanguard setup", 'Free scripts rarely come with a Vanguard solution. LOLScript ships a <a href="/lol-vanguard-emulator">Vanguard Emulator</a> and a full <a href="/setup-guide">setup guide</a>.'],
          ["fa-solid fa-headset", "No support", "When something does not work, there is nobody to ask. LOLScript has a live Discord with patch notes and support."],
        ]),
      }) +
      section({
        eyebrow: "The $3.99 start",
        h2: "Try the full LoL script for one day",
        sub: "A 1-day key is the cheapest way to see every feature before a longer plan.",
        alt: true,
        body: cards([
          ["fa-solid fa-person-running", "Evade", '<a href="/lol-evade-script">Skillshot dodging</a> tuned per champion.'],
          ["fa-solid fa-crosshairs", "Prediction", '<a href="/lol-aimbot">Skillshot prediction</a> that leads moving targets.'],
          ["fa-solid fa-shoe-prints", "Orbwalker", '<a href="/lol-orbwalker-script">Attack-move timing</a>, kiting, and last hits.'],
          ["fa-solid fa-wand-magic-sparkles", "Combos and activator", "Champion combos, target selector, and item and summoner activator."],
        ]),
      }) +
      section({ eyebrow: "How it works", h2: "From checkout to your first game", body: howItWorks }),
    faqTitle: "Free LoL script questions",
    faq: [
      { q: "Is there a free LoL script download?", a: "There are free downloads online, but almost none still work after Vanguard, and many carry malware. A maintained script with patch updates is the reliable choice." },
      { q: "Is there a free trial of the LoL Script?", a: 'There is no free trial, but the 1-day key from $3.99 works like one: it unlocks every feature of the <a href="/lol-script">LoL Script</a> so you can test it in your own games.' },
      { q: "What is the cheapest working LoL script?", a: "The LOLScript 1-day key starts at $3.99. Longer plans lower the price per day." },
      { q: "Can I pay with crypto or a gift card?", a: "Yes. Checkout supports card, crypto, and Binance Gift Card, and your key is delivered instantly." },
      { q: "Is a paid LoL script safe?", a: riskAnswer },
    ],
    related: [related.script, related.safe, related.best, related.guide],
  },
  {
    slug: "lol-script-download",
    relatedTitle: "Explore LOLScript",
    buy: "lol-script",
    title: "LoL Script Download 2026: Official Loader | LOLScript",
    ogTitle: "LoL Script Download 2026: Official Loader",
    description:
      "LoL Script download: get the official LOLScript loader after checkout, with a step-by-step setup guide, patch-day updates, and Discord support.",
    keywords: "lol script download, download lol script, lol script loader, league of legends script download, lol script download 2026, lol script exe, lol script install",
    crumb: "LoL Script Download",
    badge: "Official loader",
    h1: "LoL Script download: the official loader",
    lead:
      "The LOLScript loader is only shared with customers, together with a step-by-step setup guide. Buy a key, follow the guide, and you are in game the same day, with updates delivered every patch.",
    sections:
      section({
        eyebrow: "Download in 4 steps",
        h2: "How to download and install the LoL Script",
        body: steps([
          ["Buy your key", "Choose a plan above. Your key appears on-screen and in your email right after checkout."],
          ["Join the Discord", 'Loader links, patch notes, and support tickets are in the <a href="https://discord.gg/n2ng5mJjhm" target="_blank" rel="noreferrer">LOLScript Discord</a>.'],
          ["Prepare the USB loader", 'Follow the <a href="/setup-guide-lol-script">LoL Script setup guide</a>: BIOS and Windows checklist, then the USB boot loader.'],
          ["Activate and play", "Enter your key, pick a champion profile, and tune evade, prediction, and orbwalker."],
        ]),
      }) +
      section({
        eyebrow: "Requirements",
        h2: "What you need before you download",
        alt: true,
        body: cards([
          ["fa-brands fa-windows", "Windows 10 or 11", "A 64-bit Windows install with access to BIOS settings."],
          ["fa-brands fa-usb", "A USB drive", "Used for the boot loader. The setup guide shows how to prepare it."],
          ["fa-solid fa-shield-halved", "Vanguard setup", 'The <a href="/lol-vanguard-emulator">Vanguard Emulator</a> is the recommended way to run League without Vanguard.'],
          ["fa-solid fa-key", "An active key", "Plans start at one day, so you can test the full download before a longer plan."],
        ]),
      }) +
      section({
        eyebrow: "Official only",
        h2: "Only download the LoL Script from LOLScript",
        sub: 'Files shared on forums or video descriptions as a "free LoL script download" are not from us and often contain malware. The real loader is only shared in the LOLScript Discord after purchase.',
      }),
    faqTitle: "LoL Script download questions",
    faq: [
      { q: "Where do I download the LoL Script?", a: 'After checkout, loader links are shared in the LOLScript Discord together with the <a href="/setup-guide-lol-script">setup guide</a>.' },
      { q: "Is the LoL Script download free?", a: 'The loader requires an active key. Plans start at $3.99 for one day. See <a href="/free-lol-script">why free LoL scripts fail</a>.' },
      { q: "Does the LoL Script update automatically?", a: 'Updates are released the day League patches. The live <a href="/status">status page</a> shows when each product is ready.' },
      { q: "Does it work on Windows 11?", a: "Yes. The LoL Script works on 64-bit Windows 10 and Windows 11." },
      { q: "Is the LoL Script download safe?", a: riskAnswer },
    ],
    related: [related.guide, related.script, related.emulator, related.safe],
  },
  {
    slug: "league-of-legends-cheats",
    article: { published: "2026-10-01", modified: "2026-10-01" },
    parent: { name: "Best LoL Script", href: "/best-lol-scripts" },
    relatedTitle: "Explore LOLScript",
    buy: "lol-script",
    title: "LoL Hack & League of Legends Cheats 2026 | LOLScript",
    ogTitle: "LoL Hack & League of Legends Cheats 2026",
    description:
      "LoL hack and League of Legends cheats that work in 2026: an undetected script with evade, skillshot aimbot, orbwalker, and combos. From $3.99.",
    keywords: "lol hack, lol hacks, lol cheat, lol cheats, league of legends hack, league of legends cheats, league hack 2026, lol cheat undetected, lol hack no ban, league of legends script hack",
    crumb: "LoL Hack",
    badge: "LoL hack 2026",
    h1: "LoL hack and League of Legends cheats in 2026",
    lead:
      'When players search for a "LoL hack", they usually mean a League of Legends script: automatic dodging, skillshot aim, and perfect kiting. LOLScript bundles all of it into one undetected LoL Script that is updated every patch.',
    sections:
      section({
        eyebrow: "What a LoL hack does",
        h2: "The features players look for",
        body: cards([
          ["fa-solid fa-person-running", '<a href="/lol-evade-script">Evade</a>', "Dodges incoming skillshots automatically, tuned per champion and danger level."],
          ["fa-solid fa-crosshairs", '<a href="/lol-aimbot">Skillshot aimbot</a>', "Prediction that leads moving targets so your skillshots land more often."],
          ["fa-solid fa-shoe-prints", '<a href="/lol-orbwalker-script">Orbwalker</a>', "Attack-move timing, kiting, spacing, and last-hit flow for every auto-attack champion."],
          ["fa-solid fa-wand-magic-sparkles", "Combos, target selector, activator", "Full champion combos, smart target selection, and automatic items and summoners."],
        ]),
      }) +
      section({
        eyebrow: "What works in 2026",
        h2: "League of Legends cheats after Vanguard",
        sub: 'Riot Vanguard ended most old LoL hacks. A working setup in 2026 needs a maintained script, a Vanguard solution, and patch-day updates. <a href="/league-of-legends-scripting-after-vanguard">How Vanguard changed scripting</a>.',
        alt: true,
        body: cards([
          ["fa-solid fa-code", '<a href="/lol-script">LoL Script</a>', "Every feature above in one loader for 150+ champions."],
          ["fa-solid fa-shield-halved", '<a href="/lol-vanguard-emulator">Vanguard Emulator</a>', "Runs League of Legends without Riot Vanguard on your PC."],
          ["fa-solid fa-fingerprint", '<a href="/lol-perm-spoofer">Perm Spoofer</a>', "Fresh permanent hardware identifiers for a clean start."],
          ["fa-solid fa-rotate", "Patch-day updates", 'Live product state on the <a href="/status">status page</a>.'],
        ]),
      }) +
      section({ eyebrow: "Why LOLScript", h2: "Why players choose LOLScript", body: `\n        <div class="spec-grid">${lolscriptPitch}\n        </div>` }),
    faqTitle: "LoL hack questions",
    faq: [
      { q: "Is a LoL hack the same as a LoL script?", a: 'Mostly, yes. "LoL hack" and "League of Legends cheat" are common names for a script with evade, prediction, and orbwalker, like the <a href="/lol-script">LOLScript LoL Script</a>.' },
      { q: "Do League of Legends cheats still work in 2026?", a: "Old free hacks mostly stopped working after Vanguard. A maintained script with a Vanguard Emulator and patch-day updates works in 2026." },
      { q: "Is there a LoL hack with no ban?", a: riskAnswer },
      { q: "How much does a LoL hack cost?", a: "The LOLScript LoL Script starts at $3.99 for a 1-day key, with longer plans available. Delivery is instant." },
    ],
    related: [related.script, related.aimbot, related.evade, related.safe],
  },
  {
    slug: "lol-aimbot",
    relatedTitle: "More LoL Script features",
    buy: "lol-script",
    title: "LoL Aimbot Script: Skillshot Prediction | LOLScript",
    ogTitle: "LoL Aimbot Script: Skillshot Prediction",
    description:
      "LoL aimbot script for League of Legends: skillshot prediction that leads moving targets, with hit chance settings per champion. Included in the LoL Script.",
    keywords: "lol aimbot, lol aimbot script, league of legends aimbot, lol skillshot script, lol prediction script, skillshot aimbot lol, lol auto aim, league skillshot prediction",
    crumb: "LoL Aimbot",
    badge: "Skillshot prediction",
    h1: "LoL aimbot: skillshot prediction for every champion",
    lead:
      "The LOLScript prediction engine is the aimbot of League of Legends. It reads enemy movement, cast time, and projectile speed, then aims your skillshots where the target will be, not where it is.",
    sections:
      section({
        eyebrow: "How it aims",
        h2: "What the LoL aimbot calculates",
        body: cards([
          ["fa-solid fa-route", "Movement prediction", "Follows pathing, dashes, and stop-and-go movement to find the most likely position on impact."],
          ["fa-solid fa-gauge-high", "Cast time and speed", "Accounts for each spell's cast delay, projectile speed, width, and range."],
          ["fa-solid fa-users-slash", "Minion collision", "Skips casts that would hit a minion first, so linear skillshots reach the champion."],
          ["fa-solid fa-percent", "Hit chance control", "Set a minimum hit chance per spell to choose between more casts and more accurate casts."],
        ]),
      }) +
      section({
        eyebrow: "Best champions",
        h2: "Where the LoL aimbot shines",
        alt: true,
        body: cards([
          ["fa-solid fa-bullseye", "Skillshot mages", "Xerath, Lux, Ziggs, Vel'Koz, and other long-range mages land more abilities from safe range."],
          ["fa-solid fa-hand-back-fist", "Hook supports", "Blitzcrank, Thresh, Nautilus, and Pyke hooks benefit most from collision checks."],
          ["fa-solid fa-location-arrow", "Skillshot marksmen", "Ezreal, Varus, Ashe, and Jhin follow up auto attacks with more reliable skillshots."],
          ["fa-solid fa-person-running", "Paired with evade", 'Combine prediction with the <a href="/lol-evade-script">evade script</a> to win skillshot duels on both sides.'],
        ]),
      }) +
      section({ eyebrow: "Products", h2: "Get the LoL aimbot", sub: "Prediction is part of every LoL Script plan.", body: productCards }),
    faqTitle: "LoL aimbot questions",
    faq: [
      { q: "Is there an aimbot for League of Legends?", a: 'Yes. In League of Legends, an aimbot is skillshot prediction. It is built into the <a href="/lol-script">LOLScript LoL Script</a> for 150+ champions.' },
      { q: "Can I control how often it casts?", a: "Yes. Each spell has its own prediction settings, such as minimum hit chance, so you decide between more casts and more accurate casts." },
      { q: "Does the aimbot work for every champion?", a: "Champion profiles cover 150+ champions, including every skillshot-based champion." },
      { q: "Is the LoL aimbot safe?", a: riskAnswer },
    ],
    related: [related.script, related.evade, related.orbwalker, related.safe],
  },
  {
    slug: "lol-hile",
    lang: "tr",
    ogLocale: "tr_TR",
    article: { published: "2026-10-01", modified: "2026-10-01" },
    relatedTitle: "LOLScript ürünleri",
    buy: "lol-script",
    title: "LoL Hile 2026: Güvenli LoL Script | LOLScript",
    ogTitle: "LoL Hile 2026: Güvenli LoL Script",
    description:
      "LoL hile 2026: evade, skillshot tahmini, orbwalker ve kombolarla undetected LoL script. Vanguard Emulator ve Perm Spoofer, $3.99'dan başlayan fiyat, anında teslimat.",
    keywords: "lol hile, lol hilesi, league of legends hile, lol script, lol script türkçe, bansız lol hile, lol hile satın al, lol hile 2026, güvenli lol hile, lol vanguard hile, lol hile indir",
    crumb: "LoL Hile",
    badge: "LoL Hile 2026",
    h1: "LoL hile: Vanguard sonrası çalışan LoL script",
    lead:
      "LOLScript, League of Legends için evade, skillshot tahmini, orbwalker ve kombolar sunan undetected bir LoL script. Vanguard Emulator ve Perm Spoofer ile birlikte, her yamada güncellenir ve anında teslim edilir.",
    sections:
      section({
        eyebrow: "Özellikler",
        h2: "LoL hilede neler var",
        body: cards([
          ["fa-solid fa-person-running", "Evade", "Gelen skillshot'lardan otomatik kaçar, her şampiyona göre ayarlanır."],
          ["fa-solid fa-crosshairs", "Skillshot tahmini", "Hareket eden rakibin nerede olacağını hesaplar ve büyülerini oraya atar."],
          ["fa-solid fa-shoe-prints", "Orbwalker", "Attack-move zamanlaması, kiting ve son vuruşlar her ADC için kusursuz."],
          ["fa-solid fa-wand-magic-sparkles", "Kombo ve activator", "Şampiyon komboları, hedef seçici, otomatik item ve sihirdar büyüleri."],
        ]),
      }) +
      section({
        eyebrow: "Güvenli kurulum",
        h2: "Güvenli LoL hile kurulumu",
        sub: "Her parça kurulumunun farklı bir kısmını kapsar. Sadece ihtiyacın olanı al.",
        alt: true,
        body: cards([
          ["fa-solid fa-shield-halved", '<a href="/lol-vanguard-emulator">Vanguard Emulator</a>', "Riot Vanguard'ı bilgisayarından kaldırır, League of Legends anti-cheat olmadan çalışır."],
          ["fa-solid fa-fingerprint", '<a href="/lol-perm-spoofer">Perm Spoofer</a>', "Donanım kimliklerini kalıcı olarak yeniler. Daha önce HWID ban yediysen temiz bir başlangıç sağlar."],
          ["fa-solid fa-rotate", "Yama günü güncelleme", 'Her ürün her LoL yamasında test edilir. Güncel durumu <a href="/status">durum sayfasında</a> canlı görebilirsin.'],
          ["fa-solid fa-desktop", "İkinci PC gerekmez", 'LoL script kendi bilgisayarında USB loader ile çalışır. Adım adım <a href="/setup-guide-lol-script">kurulum rehberi</a> dahil.'],
        ]),
      }) +
      section({
        eyebrow: "Nasıl çalışır",
        h2: "Satın almadan ilk maça",
        body: steps([
          ["Planını seç", "1 günlük key $3.99'dan başlar. Uzun planlarda günlük fiyat düşer."],
          ["Hızlıca öde", "Kart, kripto veya Binance Gift Card ile öde, key ekranda ve e-postanda anında belirir."],
          ["Kurulum rehberini takip et", 'Tüm ürünlerin adım adım rehberi <a href="/setup-guide">kurulum rehberleri</a> sayfasında.'],
          ["Oyuna gir ve elo kas", "Evade, tahmin, orbwalker ve komboları şampiyonlarına göre ayarla."],
        ]),
      }),
    faqTitle: "LoL hile hakkında sorular",
    faq: [
      { q: "Bansız LoL hile var mı?", a: 'Tüm LOLScript ürünleri her League of Legends yamasında test edilir ve güncel durum <a href="/status">durum sayfasında</a> canlı gösterilir. En temiz kurulum için LoL Script\'i <a href="/lol-vanguard-emulator">Vanguard Emulator</a> ve <a href="/lol-perm-spoofer">Perm Spoofer</a> ile birlikte kullan. Kullanım şartları <a href="/terms">Hizmet Şartları</a> sayfasında.' },
      { q: "Vanguard sonrası LoL hile çalışıyor mu?", a: "Eski ücretsiz hilelerin çoğu Vanguard ile çalışmaz oldu. LOLScript, Vanguard Emulator ve yama günü güncellemelerle 2026'da çalışır." },
      { q: "LoL hile fiyatı ne kadar?", a: 'LoL Script 1 günlük key ile $3.99\'dan başlar. Tüm planlar <a href="/lol-script">LoL Script</a> sayfasında.' },
      { q: "Ücretsiz LoL hile indirsem olur mu?", a: "Ücretsiz hileler genelde güncel değildir ve sık sık virüs veya stealer içerir. Hesabın ve bilgisayarın $3.99'dan değerli." },
      { q: "Türkçe destek var mı?", a: 'Evet. <a href="https://discord.gg/n2ng5mJjhm" target="_blank" rel="noreferrer">LOLScript Discord</a> üzerinden destek alabilirsin.' },
    ],
    related: [
      { href: "/lol-script", title: "LoL Script", text: "Evade, tahmin, orbwalker, hedef seçici, kombolar ve activator, 150+ şampiyon." },
      { href: "/lol-vanguard-emulator", title: "LoL Vanguard Emulator", text: "Riot Vanguard'ı kaldırır, League of Legends anti-cheat olmadan çalışır." },
      { href: "/lol-perm-spoofer", title: "LoL Perm Spoofer", text: "Kalıcı HWID spoofer: TPM, MAC ve donanım seri numaraları." },
      { href: "/setup-guide-lol-script", title: "LoL Script Kurulum Rehberi", text: "BIOS ve Windows kontrol listesi, USB loader ve ilk şampiyon profili." },
    ],
  },
];

const pages = [
  {
    slug: "lol-orbwalker-script",
    title: "LoL Orbwalker Script | League of Legends Orbwalker 2026 | LOLScript",
    ogTitle: "LoL Orbwalker Script | League of Legends Orbwalker",
    description:
      "LoL orbwalker script for League of Legends: attack-move timing, kiting, spacing, and last-hit flow for 150+ champions. Included in the LOLScript LoL Script and updated every patch.",
    keywords: "lol orbwalker script, lol orbwalker, league of legends orbwalker, lol orbwalker 2026, lol kiting script, league orbwalker script",
    crumb: "Orbwalker Script",
    badge: "LoL orbwalker",
    h1: "LoL Orbwalker Script",
    lead:
      "The LoL orbwalker is built into the LOLScript League of Legends script. It handles attack-move rhythm, kiting, spacing, and last hits so auto-attack champions feel smoother in every lane.",
    sections: `
    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">What it does</p>
          <h2>What a League of Legends orbwalker does</h2>
          <p>An orbwalker times movement commands between auto attacks. Instead of standing still after every attack, your champion moves during the window where movement does not cancel the attack, which keeps damage up while you kite forward or backward.</p>
        </div>
        <div class="spec-grid">
          <article class="spec-card"><h3><i class="fa-solid fa-stopwatch" aria-hidden="true"></i> Attack timing</h3><p>Moves between auto attacks at the right moment so attacks are not cancelled early or delayed.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-person-running" aria-hidden="true"></i> Kiting and spacing</h3><p>Keeps distance from melee threats while staying in attack range, forward or backward.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-coins" aria-hidden="true"></i> Last hit and lane clear</h3><p>Dedicated last-hit and lane-clear modes help with minion farming and wave control.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-user-check" aria-hidden="true"></i> Target selector link</h3><p>Uses the same target priority as the rest of the script, so the orbwalker attacks the target you actually want.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-users" aria-hidden="true"></i> 150+ champions</h3><p>Champion-specific logic and role-based settings, saved per champion profile.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-rotate" aria-hidden="true"></i> Patch updates</h3><p>Updates are normally ready the same day a League of Legends patch releases.</p></article>
        </div>
      </div>
    </section>

    <section class="product-section alt">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">Hotkeys</p>
          <h2>Orbwalker modes and default hotkeys</h2>
          <p>Each mode is held on a key, so you decide when the orbwalker is active.</p>
        </div>
        <ol class="steps">
          <li><div><h3>Space: Combo</h3><p>All-in mode. The orbwalker and champion combo logic work together on your selected target.</p></div></li>
          <li><div><h3>V: Lane clear</h3><p>Clears minion waves and farms quickly.</p></div></li>
          <li><div><h3>C: Harass</h3><p>Last hits minions and pokes enemy champions when they are in range.</p></div></li>
          <li><div><h3>X: Last hit only</h3><p>Only last hits minions, without harassing enemies.</p></div></li>
        </ol>
      </div>
    </section>
`,
    faqTitle: "LoL orbwalker questions",
    faq: [
      { q: "Is the orbwalker included in the LoL Script?", a: 'Yes. The orbwalker is part of the <a href="/lol-script">LoL Script</a>, together with evade, prediction, target selector, combos, and activator. It is not sold separately.' },
      { q: "Which champions does the orbwalker support?", a: "150+ League of Legends champions are supported, with champion-specific logic and role-based settings." },
      { q: "Can I change the orbwalker hotkeys and settings?", a: "Yes. Hotkeys and orbwalker settings are saved per champion profile in the loader. Start from the default profile, then change one setting at a time." },
      { q: "Does the orbwalker work after a League of Legends patch?", a: 'Open the loader and follow the update prompt. Updates are normally ready the same day, and you can check the current patch on the <a href="/status">status page</a>.' },
      { q: "Is the LoL orbwalker undetected?", a: riskAnswer },
    ],
    related: [related.script, related.evade, related.vanguard, related.guide],
  },
  {
    slug: "lol-evade-script",
    title: "LoL Evade Script | League of Legends Dodge Script | LOLScript",
    ogTitle: "LoL Evade Script | League of Legends Dodge Script",
    description:
      "LoL evade script for League of Legends: configurable skillshot dodging with prediction, a quick on/off toggle, and champion profiles for 150+ champions. Included in the LOLScript LoL Script.",
    keywords: "lol evade script, lol dodge script, league of legends evade, lol evade, league evade script, lol skillshot dodge",
    crumb: "Evade Script",
    badge: "LoL evade",
    h1: "LoL Evade Script",
    lead:
      "The LoL evade script is built into the LOLScript League of Legends script. It helps dodge dangerous skillshots, stays fully configurable, and can be switched on or off with a single key.",
    sections: `
    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">What it does</p>
          <h2>How the LoL evade script works</h2>
          <p>Evade reads incoming skillshots and moves your champion out of their path when it is safe to do so. It works together with the prediction engine, the orbwalker, and your champion profile, so dodging does not fight against your own movement.</p>
        </div>
        <div class="spec-grid">
          <article class="spec-card"><h3><i class="fa-solid fa-wind" aria-hidden="true"></i> Skillshot dodging</h3><p>Moves out of dangerous skillshots and pressure patterns while staying configurable.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-toggle-on" aria-hidden="true"></i> One-key toggle</h3><p>Turn evade on or off instantly with the K key, without opening the menu.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-crosshairs" aria-hidden="true"></i> Prediction engine</h3><p>Uses the same movement prediction as the rest of the script to judge which spells are a real threat.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-sliders" aria-hidden="true"></i> Configurable</h3><p>Choose how aggressively evade reacts, and save the settings in each champion profile.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-bullseye" aria-hidden="true"></i> Works with the orbwalker</h3><p>Evade and the orbwalker share movement control, so dodging and kiting do not cancel each other.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-users" aria-hidden="true"></i> 150+ champions</h3><p>Champion-specific logic and role-based settings for every supported champion.</p></article>
        </div>
      </div>
    </section>

    <section class="product-section alt">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">Setup</p>
          <h2>Getting started with LoL evade</h2>
        </div>
        <ol class="steps">
          <li><div><h3>Install the LoL Script</h3><p>Follow the <a href="/setup-guide-lol-script">LoL Script setup guide</a> to prepare your PC and open the loader.</p></div></li>
          <li><div><h3>Start with the default profile</h3><p>Load the default champion profile. Evade is already configured with safe starting values.</p></div></li>
          <li><div><h3>Test in practice tool</h3><p>Try evade in practice tool or a custom game before ranked, and use K to toggle it while you test.</p></div></li>
          <li><div><h3>Tune one setting at a time</h3><p>Adjust how evade reacts, save the profile, and test again.</p></div></li>
        </ol>
      </div>
    </section>
`,
    faqTitle: "LoL evade questions",
    faq: [
      { q: "Is the evade script included in the LoL Script?", a: 'Yes. Evade is part of the <a href="/lol-script">LoL Script</a>, together with prediction, orbwalker, target selector, combos, and activator. It is not sold separately.' },
      { q: "How do I turn evade on or off?", a: "Press K to toggle evade on or off during a game. You can change the hotkey in the loader." },
      { q: "Is evade the same as a dodge script?", a: "Yes. Evade and dodge script describe the same feature: automatically moving out of incoming skillshots." },
      { q: "Does evade work after a League of Legends patch?", a: 'Open the loader and follow the update prompt. Updates are normally ready the same day, and you can check the current patch on the <a href="/status">status page</a>.' },
      { q: "Is the LoL evade script undetected?", a: riskAnswer },
    ],
    related: [related.script, related.orbwalker, related.vanguard, related.guide],
  },
  {
    slug: "league-of-legends-scripting-after-vanguard",
    article: { published: "2026-09-30", modified: "2026-09-30" },
    title: "League of Legends Scripting After Vanguard (2026 Guide) | LOLScript",
    ogTitle: "League of Legends Scripting After Vanguard (2026 Guide)",
    description:
      "What changed for League of Legends scripts after Riot Vanguard, why most old LoL scripts stopped working, and how the current LOLScript setup works in 2026.",
    keywords: "league scripts after vanguard, league of legends script 2026, lol script after vanguard, league of legends scripting, lol scripting 2026, lol vanguard script",
    crumb: "Scripting After Vanguard",
    badge: "Guide",
    h1: "League of Legends scripting after Vanguard",
    lead:
      "Riot Vanguard changed League of Legends scripting completely. This guide explains what changed, why most older LoL scripts stopped working, and how the current LOLScript setup is structured in 2026.",
    sections: `
    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">What changed</p>
          <h2>Vanguard in League of Legends</h2>
          <p>Riot brought Vanguard, its kernel-level anti-cheat, to League of Legends in 2024. Vanguard starts with Windows and runs below normal applications, which is a very different environment from the user-mode protection League used before.</p>
          <p>For League of Legends scripts, this meant that the tools and loaders built for the old environment stopped working almost overnight. Many long-running public scripts shut down or moved to private access.</p>
        </div>
      </div>
    </section>

    <section class="product-section alt">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">Current setup</p>
          <h2>How the LOLScript setup works today</h2>
          <p>LOLScript is sold as three separate products. You can buy only the one you need, or run all three in this order:</p>
        </div>
        <ol class="steps">
          <li><div><h3>LoL Perm Spoofer</h3><p>A permanent HWID spoofer that masks hardware identifiers for a clean start. <a href="/lol-perm-spoofer">See the LoL Spoofer</a>.</p></div></li>
          <li><div><h3>LoL Vanguard Emulator</h3><p>Removes Riot Vanguard from your PC so League of Legends runs without the anti-cheat. <a href="/lol-vanguard-emulator">See the Vanguard Emulator</a>.</p></div></li>
          <li><div><h3>LoL Script</h3><p>The League of Legends script itself: evade, prediction, orbwalker, target selector, combos, and activator for 150+ champions. <a href="/lol-script">See the LoL Script</a>.</p></div></li>
        </ol>
        <p style="margin-top:20px;color:var(--muted);">The LoL Script loader runs from a prepared USB drive. Each product has its own step-by-step instructions on the <a href="/setup-guide">setup guides page</a>.</p>
      </div>
    </section>

    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">What to expect</p>
          <h2>What to expect from a League of Legends script in 2026</h2>
        </div>
        <div class="spec-grid">
          <article class="spec-card"><h3><i class="fa-solid fa-rotate" aria-hidden="true"></i> Patch-day updates</h3><p>League patches every two weeks. Updates are normally ready the same day; check the <a href="/status">status page</a> before you play.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-signal" aria-hidden="true"></i> Live status</h3><p>Every product is checked against the current patch, and the result is shown on the <a href="/status">status page</a> before you play.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-flask" aria-hidden="true"></i> Test before ranked</h3><p>Start with default settings and test in practice tool or normals before using the script in ranked games.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-headset" aria-hidden="true"></i> Active support</h3><p>Loader links, patch notes, and support tickets are handled in the LOLScript Discord.</p></article>
        </div>
      </div>
    </section>
`,
    faqTitle: "Scripting after Vanguard questions",
    faq: [
      { q: "Do League of Legends scripts still work after Vanguard?", a: "Scripts built for the old environment stopped working when Vanguard arrived. Current tools use a different setup; the LOLScript stack is described above." },
      { q: "Do I need the Vanguard Emulator to use the LoL Script?", a: 'The products are sold separately. If you run the full stack, the recommended order is Perm Spoofer, then Vanguard Emulator, then LoL Script. Ask in Discord if you are unsure which products you need.' },
      { q: "Does the LoL Script work on Mac?", a: "The setup guides are written for Windows 10 and 11 PCs. Ask in the LOLScript Discord before buying if you use a different system." },
      { q: "What happens to scripts when League of Legends patches?", a: "Open the loader and follow the update prompt. Updates are normally ready the same day, and patch notes are posted in the LOLScript Discord." },
      { q: "Is using a League of Legends script safe?", a: riskAnswer },
    ],
    related: [related.script, related.orbwalker, related.evade, related.guide],
  },
  {
    slug: "league-of-legends-hwid-ban",
    article: { published: "2026-09-30", modified: "2026-09-30" },
    ogImage: "lol-perm-spoofer.png",
    parent: { name: "LoL Spoofer", href: "/lol-perm-spoofer" },
    cta: [
      { label: "View LoL Spoofer", href: "/lol-perm-spoofer", primary: true },
      { label: "Spoofer Setup Guide", href: "/setup-guide-perm-spoofer" },
    ],
    relatedTitle: "More about HWID bans and spoofing",
    title: "League of Legends HWID Ban: How It Works and How Long It Lasts | LOLScript",
    ogTitle: "League of Legends HWID Ban: How It Works and How Long It Lasts",
    description:
      "What a League of Legends HWID ban is, how a Riot hardware ban differs from an account ban, how long a LoL HWID ban lasts, and what your options are, including appeals and HWID spoofers.",
    keywords: "lol hwid ban, league of legends hwid ban, lol hwid ban how long, league of legends hwid ban duration, riot hwid ban, vanguard hwid ban, lol hardware ban, league hardware id ban",
    crumb: "HWID Ban",
    badge: "Guide",
    h1: "League of Legends HWID ban explained",
    lead:
      "A League of Legends HWID ban blocks your computer, not just your account. This guide explains how Riot hardware bans work, how long a LoL HWID ban lasts, and what your options are.",
    sections: `
    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">The basics</p>
          <h2>What is a HWID ban in League of Legends?</h2>
          <p>HWID stands for hardware ID. Your PC exposes identifiers such as motherboard, disk, network adapter (MAC), and TPM serial numbers. A hardware ban links those identifiers to a ban, so the restriction follows the computer instead of a single Riot account.</p>
          <p>Riot's Vanguard anti-cheat, which came to League of Legends in 2024, runs at kernel level and can read these identifiers. That is why a Riot hardware ban can also block new accounts created on the same PC.</p>
        </div>
      </div>
    </section>

    <section class="product-section alt">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">Comparison</p>
          <h2>HWID ban vs account ban</h2>
        </div>
        <div class="spec-grid">
          <article class="spec-card"><h3><i class="fa-solid fa-user-slash" aria-hidden="true"></i> Account ban</h3><p>Applies to one Riot account. You can usually still log in with a different account on the same computer.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-microchip" aria-hidden="true"></i> HWID ban</h3><p>Applies to the hardware. New accounts created on the same PC can be blocked as well, because the ban is tied to your hardware identifiers.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-hourglass-half" aria-hidden="true"></i> How long it lasts</h3><p>Riot does not publish a fixed length for hardware bans. Players report both temporary and permanent ones, and hardware bans are generally tied to serious violations such as cheating.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-circle-question" aria-hidden="true"></i> How to tell</h3><p>If fresh accounts on the same PC are also restricted while other PCs work, the restriction is most likely tied to your hardware rather than to one account.</p></article>
        </div>
      </div>
    </section>

    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">Your options</p>
          <h2>What you can do after a LoL HWID ban</h2>
        </div>
        <ol class="steps">
          <li><div><h3>Appeal if you think it is a mistake</h3><p>Submit a ticket to Riot Support. Riot is the only party that can review or lift a ban on its side.</p></div></li>
          <li><div><h3>Wait out a temporary restriction</h3><p>If Riot tells you the restriction is temporary, the only official option is to wait until it expires.</p></div></li>
          <li><div><h3>Understand what a HWID spoofer does</h3><p>A HWID spoofer changes the hardware identifiers your PC reports. A perm spoofer applies the change persistently, while a temp spoofer resets on restart. <a href="/lol-perm-spoofer">The LoL Spoofer</a> is a perm spoofer; its <a href="/setup-guide-perm-spoofer">setup guide</a> starts with a clean Windows install and BIOS flash.</p></div></li>
          <li><div><h3>Follow the guide step by step</h3><p>Spoofing works best on a clean setup. Verify every serial before you launch League, and ask in the LOLScript Discord if a step does not match.</p></div></li>
        </ol>
      </div>
    </section>
`,
    faqTitle: "LoL HWID ban questions",
    faq: [
      { q: "Does League of Legends HWID ban?", a: "Yes. Riot can issue hardware bans in League of Legends. Since Vanguard arrived in 2024, the anti-cheat can read hardware identifiers such as disk, motherboard, MAC, and TPM serials." },
      { q: "How long does a LoL HWID ban last?", a: "Riot does not publish a fixed duration for hardware bans. Players report both temporary and permanent hardware bans. Riot Support is the only reliable source for the status of your own ban." },
      { q: "Can I create a new account after a HWID ban?", a: "A new account on the same PC can be blocked as well, because the ban is tied to your hardware identifiers rather than to one account." },
      { q: "What is the difference between a perm spoofer and a temp spoofer?", a: 'A temp spoofer changes hardware identifiers until the next restart. A perm spoofer applies the change persistently, so it survives restarts. <a href="/lol-perm-spoofer">The LoL Spoofer</a> is a perm spoofer.' },
      { q: "Is using a HWID spoofer safe?", a: riskAnswer },
    ],
    related: [related.spoofer, related.spooferGuide, related.emulator, related.vanguard],
  },
  {
    slug: "best-lol-scripts",
    article: { published: "2026-10-01", modified: "2026-10-01" },
    relatedTitle: "Explore LOLScript",
    buy: "lol-script",
    title: "Best LoL Script 2026: Undetected League Script | LOLScript",
    ogTitle: "Best LoL Script 2026: Undetected League Script",
    description:
      "The best LoL script for 2026: an undetected League of Legends script with evade, prediction, orbwalker, and combos, plus Vanguard Emulator and Perm Spoofer.",
    keywords: "best lol script, best lol scripts, best lol script 2026, lol scripts, league of legends scripts, best league of legends script, undetected lol script, buy lol script, lol script no ban, ban free lol script, safe lol script, no ban lol script",
    crumb: "Best LoL Script",
    badge: "Undetected LoL Script 2026",
    h1: "The best LoL script for 2026",
    lead:
      "Most LoL scripts sold before Vanguard stopped working. LOLScript is built for League of Legends in 2026: a full-featured script, a Vanguard Emulator, and a Perm Spoofer, all delivered instantly.",
    sections: `
    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">Products</p>
          <h2>Everything you need for League of Legends</h2>
          <p>Buy only what your setup needs. Every key is delivered instantly after checkout.</p>
        </div>${productCards}
      </div>
    </section>

    <section class="product-section alt">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">How to choose</p>
          <h2>What makes a LoL script worth buying</h2>
        </div>
        <div class="spec-grid">
          <article class="spec-card"><h3><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Built for Vanguard</h3><p>A modern LoL script needs a clear Vanguard setup. LOLScript pairs the script with the <a href="/lol-vanguard-emulator">Vanguard Emulator</a>. <a href="/league-of-legends-scripting-after-vanguard">How Vanguard changed scripting</a>.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-sliders" aria-hidden="true"></i> Full feature set</h3><p>Evade, prediction, orbwalker, target selector, combos, and activator in one loader, not as paid add-ons.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-coins" aria-hidden="true"></i> Short plans first</h3><p>Start with a 1-day key from $3.99 to try the setup and features before a longer plan.</p></article>
          <article class="spec-card"><h3><i class="fa-solid fa-user-shield" aria-hidden="true"></i> Safe, no-ban setup</h3><p>Undetected status is checked every patch, and the Vanguard Emulator plus Perm Spoofer give you the cleanest setup for ranked. See the live <a href="/status">status page</a>.</p></article>
        </div>
      </div>
    </section>

    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">Why LOLScript</p>
          <h2>Why players choose LOLScript</h2>
        </div>
        <div class="spec-grid">${lolscriptPitch}
        </div>
      </div>
    </section>
`,
    faqTitle: "Best LoL script questions",
    faq: [
      { q: "What is the best LoL script in 2026?", a: 'A good LoL script in 2026 needs a Vanguard setup, same-day patch updates, and a full feature set. The <a href="/lol-script">LOLScript LoL Script</a> covers all three, with instant delivery.' },
      { q: "Are free LoL scripts still working?", a: "Free LoL scripts are usually outdated or unmaintained since Vanguard, and some are bundled with malware. A maintained script with patch updates is the better choice." },
      { q: "Do I need a spoofer to use a LoL script?", a: 'Not always. A spoofer matters if your hardware was banned before. LOLScript sells the <a href="/lol-perm-spoofer">Perm Spoofer</a> separately so you only buy it if you need it.' },
      { q: "Is there a safe, no-ban LoL script?", a: riskAnswer },
    ],
    related: [related.script, related.emulator, related.spoofer, related.guide],
  },
  ...intentPages,
  ...LOCALES.map(localePage),
];

/** Translated LoL Script page (scripts/seo-locales.mjs), part of the /lol-script hreflang group. */
function localePage(t) {
  const servers = `
        <ul class="server-list">
${SERVERS.map((s) => `          <li><b>${s}</b> ${esc(t.servers.names[s])}</li>`).join("\n")}
        </ul>
        <p class="server-note">${t.servers.note}</p>`;
  return {
    slug: t.path,
    path: t.path,
    lang: t.lang,
    ogLocale: t.ogLocale,
    alternates: LOL_SCRIPT_ALTERNATES,
    home: t.home,
    relatedEyebrow: t.relatedEyebrow,
    relatedTitle: t.relatedTitle,
    buy: "lol-script",
    buyLabels: t.buy,
    title: t.title,
    ogTitle: t.ogTitle,
    description: t.description,
    keywords: t.keywords,
    crumb: t.crumb,
    badge: t.badge,
    h1: t.h1,
    lead: t.lead,
    sections:
      section({ eyebrow: t.features.eyebrow, h2: t.features.h2, sub: t.features.sub, body: cards(t.features.cards) }) +
      section({ eyebrow: t.servers.eyebrow, h2: t.servers.h2, sub: t.servers.sub, alt: true, body: servers }) +
      section({ eyebrow: t.setup.eyebrow, h2: t.setup.h2, sub: t.setup.sub, body: cards(t.setup.cards) }) +
      section({ eyebrow: t.how.eyebrow, h2: t.how.h2, alt: true, body: steps(t.how.steps) }),
    faqTitle: t.faqTitle,
    faq: t.faq,
    related: t.related,
  };
}

for (const p of pages) {
  const file = `public/${p.path || p.slug}.html`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page(p));
  console.log(`wrote ${file}`);
}

// Translated pages are new URLs, so make sure the sitemap and llms.txt list them.
let sitemap = readFileSync("public/sitemap.xml", "utf8");
const today = new Date().toISOString().slice(0, 10);
for (const t of LOCALES) {
  const loc = `${SITE}/${t.path}`;
  if (sitemap.includes(`<loc>${loc}</loc>`)) continue;
  sitemap = sitemap.replace(
    "</urlset>",
    `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n</urlset>`
  );
}
writeFileSync("public/sitemap.xml", sitemap);

const llms = readFileSync("public/llms.txt", "utf8");
const LLMS_START = "<!-- languages:start -->";
const LLMS_END = "<!-- languages:end -->";
const llmsBlock = [
  LLMS_START,
  "",
  "## LoL Script in other languages",
  "",
  ...LOCALES.map((t) => `- [${stripTags(t.ogTitle)}](${SITE}/${t.path}) (${t.lang})`),
  "",
  LLMS_END,
].join("\n");
writeFileSync(
  "public/llms.txt",
  llms.includes(LLMS_START)
    ? llms.replace(new RegExp(`${LLMS_START}[\\s\\S]*?${LLMS_END}`), llmsBlock)
    : `${llms.trimEnd()}\n\n${llmsBlock}\n`
);

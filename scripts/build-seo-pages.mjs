// Generates keyword landing pages from the /lol-script template (header, footer, styles).
//   node scripts/build-seo-pages.mjs

import { readFileSync, writeFileSync } from "node:fs";

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
  const url = `${SITE}/${p.slug}`;
  const ogImage = `${SITE}/assets/og/${p.ogImage || "lol-script.png"}`;
  const parent = p.parent || { name: "LoL Script", href: "/lol-script" };
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
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: parent.name, item: `${SITE}${parent.href}` },
        { "@type": "ListItem", position: 3, name: p.crumb, item: url },
      ],
    },
    faqLd(p.faq),
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(p.title)}</title>
  <meta name="description" content="${esc(p.description)}">
  <meta name="keywords" content="${esc(p.keywords)}">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="${p.article ? "article" : "website"}">
  <meta property="og:site_name" content="LOLScript.store">
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
  <link rel="canonical" href="${url}">
  <link rel="icon" href="/favicon.ico">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#0b0712">
  <link rel="apple-touch-icon" href="/assets/image/logo.png">
  <link rel="stylesheet" href="/style.css?v=responsive-apple-20260618b">
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
        <a href="/">Home</a> / <a href="${parent.href}">${parent.name}</a> / <b>${p.crumb}</b>
      </nav>
      <div class="product-hero-grid">
        <div class="product-copy">
          <p class="badge">${p.badge}</p>
          <h1>${p.h1}</h1>
          <p class="lead">${p.lead}</p>
          <div class="hero-actions">
            ${ctaHtml}
            <a class="button secondary" href="https://discord.gg/n2ng5mJjhm" target="_blank" rel="noreferrer">Join Discord</a>
          </div>
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
          <p class="eyebrow">Related</p>
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

  <script src="/currency.js?v=currency-20260428"></script>
  <script src="/cart.js?v=conversion-20260513"></script>
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

const riskAnswer =
  'Status is based on internal testing at the time and is not a guarantee for your account. Anti-cheat systems change constantly, and account bans are not refunded. Read the <a href="/terms#risk">risk section of the Terms of Service</a> before buying.';

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
          <article class="spec-card"><h3><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Real account risk</h3><p>No script can promise zero risk. "Undetected" describes internal testing at the time, not a guarantee. Read the <a href="/terms#risk">Terms of Service</a>.</p></article>
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
          <li><div><h3>Know the risk</h3><p>Using a spoofer or any third-party tool breaks Riot's terms and can lead to further bans. No tool can guarantee your account's safety; read the <a href="/terms#risk">risk section of our Terms of Service</a>.</p></div></li>
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
];

for (const p of pages) {
  writeFileSync(`public/${p.slug}.html`, page(p));
  console.log(`wrote public/${p.slug}.html`);
}

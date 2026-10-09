// Builds /setup-guide-<slug> for every product in scripts/products.mjs from the /setup-guide-lol-script
// template, refreshes the product grid on /setup-guide, and lists the guides in sitemap.xml.
//   node scripts/build-setup-guides.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { CATEGORY_LABELS, PRODUCTS } from "./products.mjs";

const SITE = "https://www.lolscript.store";
const today = new Date().toISOString().slice(0, 10);
const template = readFileSync("public/setup-guide-lol-script.html", "utf8");
const pick = (re) => {
  const m = template.match(re);
  if (!m) throw new Error(`Template block not found: ${re}`);
  return m[0];
};
const verification = pick(/  <meta name="google-site-verification"[^>]*>\n  <meta name="yandex-verification"[^>]*>/);
const assets = pick(/  <link rel="stylesheet" href="\/style\.css[^"]*">\n  <script src="\/patch-status\.js[^"]*" defer><\/script>\n  <script src="\/site-header\.js[^"]*" defer><\/script>/);
const header = pick(/  <header class="site-header[\s\S]*?<\/header>/);
const footer = pick(/  <footer class="footer">[\s\S]*?<\/footer>/).replace(
  /<div class="footer-brand">[\s\S]*?<\/div>/,
  '<div class="footer-brand"><img src="/assets/image/logo.png" alt="LOLScript"><p>LOLScript setup guides for every product, with Discord support.</p></div>'
);
const tail = pick(/  <script src="\/currency\.js[^"]*"><\/script>\n  <script src="\/cart\.js[^"]*"><\/script>/);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const text = (s) => String(s).replace(/<[^>]+>/g, "");
const blurb = (p) => text(p.card).replace(/,? delivered instantly/i, "");
const bySlug = new Map(PRODUCTS.map((p) => [p.slug, p]));
const guideHref = (slug) => `/setup-guide-${slug}`;
const DISCORD = '<a href="/discord" target="_blank" rel="noreferrer">lolscript.store/discord</a>';

const EMULATOR_GUIDES = ["oxa-vanguard-emulator", "soyuz-vanguard-emulator", "noi-vanguard-emulator", "seraph-vanguard-emulator"];
const emulatorLinks = EMULATOR_GUIDES.map((s) => `<a href="${guideHref(s)}">${bySlug.get(s).name.replace(" Vanguard Emulator", "")}</a>`).join(", ");
// Add-ons run on top of another script; everything else in lol-scripts loads on its own.
const ADDON_BASE = {
  "us-tool-pro-aio": ["hanbot-key"],
  "rs-pro-aio": ["legend-sense-key", "hanbot-key"],
};

/** Preparation steps that depend on what kind of product it is. */
function preparation(p) {
  const common = [
    ["Prepare your Windows PC", "Use an up-to-date Windows 10 or 11 PC with League of Legends installed and opening normally through the Riot Client."],
    ["Get your key and loader", `After checkout, join ${DISCORD}, open a ticket and send your order ID. Our team sends your key and the official loader link there.`],
  ];
  if (p.category === "vanguard-bypass") {
    return [
      ...common,
      ["Use an administrator account", "The emulator has to run as administrator. Close League of Legends and the Riot Client before you start."],
      ["One PC per key", "Emulator keys are bound to one PC. Ask support before moving a key to another computer."],
    ];
  }
  if (p.category === "bundles") {
    const [emu, script] = p.parts.map((s) => bySlug.get(s));
    return [
      ...common,
      ["Two keys, one order", `The bundle contains a ${emu.name} key and a ${script.name} key with the same plan length.`],
      ["Follow the order below", `Set up <a href="${guideHref(emu.slug)}">${emu.name}</a> first, then <a href="${guideHref(script.slug)}">${script.name}</a>.`],
    ];
  }
  const base = ADDON_BASE[p.slug];
  return [
    ...common,
    ["Have a Vanguard emulator ready", `${p.name} loads while Riot Vanguard is not running. Set up an emulator first: ${emulatorLinks}.`],
    ...(base
      ? [["Install the base script", `${p.name} is an add-on and needs an active ${base.map((s) => `<a href="${guideHref(s)}">${bySlug.get(s).name.replace(" Key", "")}</a>`).join(" or ")} key.`]]
      : []),
  ];
}

/** Product steps without the purchase step, which the preparation already covers. */
const installSteps = (p) => p.steps.filter(([title]) => !/^(choose your plan|buy\b|get your key)/i.test(title));

function guidePage(p) {
  const url = `${SITE}${guideHref(p.slug)}`;
  const og = `${SITE}/assets/og/${p.slug}.png`;
  const prep = preparation(p);
  const steps = installSteps(p);
  const short = p.name.replace(/ Key$/, "");
  const title = `${short} Setup Guide: How to Install ${short} | LOLScript`;
  const description = text(`How to set up ${p.name} step by step: preparation, getting your key and loader, installation and troubleshooting. ${blurb(p)}`).slice(0, 300);
  const faq = [
    { q: `How do I receive my ${short} key?`, a: `After checkout, join ${DISCORD}, open a ticket and send your order ID. You get your key and the official loader link in the ticket.` },
    ...p.faq.filter((f) => !/delivery|how fast/i.test(f.q)).slice(0, 3),
    { q: "What do I do after a League of Legends patch?", a: 'Wait for the update notice in Discord, then restart the loader. You can follow compatibility on the <a href="/status">status page</a>.' },
  ];
  const howTo = {
    "@type": "HowTo",
    name: `How to set up ${p.name}`,
    description: blurb(p),
    image: og,
    step: [...prep, ...steps].map(([name, body], i) => ({ "@type": "HowToStep", position: i + 1, name, text: text(body) })),
  };
  const graph = [
    howTo,
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Setup Guides", item: `${SITE}/setup-guide` },
        { "@type": "ListItem", position: 3, name: short, item: url },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: text(f.q), acceptedAnswer: { "@type": "Answer", text: text(f.a) } })),
    },
  ];
  const related = (p.category === "bundles" ? p.parts : p.related || [])
    .map((s) => bySlug.get(s))
    .filter(Boolean)
    .slice(0, 4);
  const li = ([h, body]) => `        <li><div><h3>${esc(h)}</h3><p>${body}</p></div></li>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${verification}
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="LOLScript.store">
  <meta property="og:title" content="${esc(`${short} Setup Guide`)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${og}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(`${short} Setup Guide`)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${og}">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="/favicon.ico">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#0b0712">
  <link rel="apple-touch-icon" href="/assets/image/logo.png">
${assets}
  <script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2)}
  </script>
</head>
<body class="guide-page">
${header}

  <nav class="guide-breadcrumbs" aria-label="Breadcrumb">
    <a href="/">Home</a> / <a href="/setup-guide">Setup Guides</a> / <b>${esc(short)}</b>
  </nav>

  <main>
    <section class="guide-hero compact-page">
      <div class="hero-overlay"></div>
      <div class="guide-hero-content">
        <p class="badge">${esc(short)} setup</p>
        <h1>${esc(short)} setup guide</h1>
        <p class="lead">${esc(blurb(p))} Follow the steps below after checkout. Your key and the official loader link arrive through a Discord ticket.</p>
        <div class="hero-actions">
          <a class="button primary" href="/${p.slug}">Buy ${esc(short)}</a>
          <a class="button secondary" href="/discord" target="_blank" rel="noreferrer">Open a Discord ticket</a>
        </div>
      </div>
    </section>

    <section class="section guide-section">
      <div class="section-heading">
        <p class="eyebrow">Preparation</p>
        <h2>Before you start</h2>
        <p>Check these points before installing ${esc(short)}. Use only the loader link sent by LOLScript support.</p>
      </div>
      <ol class="guide-steps">
${prep.map(li).join("\n")}
      </ol>
    </section>

    <section class="section guide-section">
      <div class="section-heading">
        <p class="eyebrow">Installation</p>
        <h2>How to install ${esc(short)}</h2>
        <p>Follow these steps in order. Ask in your Discord ticket if a step does not match what you see.</p>
      </div>
      <div class="guide-card-grid cols-2">
${steps.map(([h, body], i) => `        <article>\n          <span>Step ${i + 1}</span>\n          <h3>${esc(h)}</h3>\n          <p>${body}</p>\n        </article>`).join("\n")}
      </div>
      <div class="guide-warning">
        <strong>Before your first game</strong>
        <ul>
          <li>Only use the loader link sent in your LOLScript Discord ticket.</li>
          <li>Start with default settings, then change one option at a time.</li>
          <li>Test in practice tool or a custom game before ranked.</li>
        </ul>
      </div>
    </section>

    <section class="section faq">
      <div class="section-heading"><p class="eyebrow">Support</p><h2>${esc(short)} setup questions</h2></div>
      <div class="faq-list">
${faq.map((f, i) => `        <details${i === 0 ? " open" : ""}><summary>${f.q}</summary><p>${f.a}</p></details>`).join("\n")}
      </div>
      <div class="hero-actions guide-cta-row">
        <a class="button primary" href="/discord" target="_blank" rel="noreferrer">Join Discord for support</a>
        <a class="button secondary" href="/setup-guide">All setup guides</a>
      </div>
    </section>
${related.length ? `
    <section class="section guide-section">
      <div class="section-heading"><p class="eyebrow">Related guides</p><h2>Setting up more products?</h2></div>
      <div class="guide-hub-grid">
${related.map(hubCard).join("\n")}
      </div>
    </section>
` : ""}  </main>

${footer}

${tail}
</body>
</html>
`;
}

// ---------------------------------------------------------------- /setup-guide hub
const ORIGINAL_GUIDES = {
  "lol-scripts": [{ href: "/setup-guide-lol-script", name: "LoL Script", icon: "fa-solid fa-code", text: "Loader access, USB boot checklist, champion profiles, hotkeys, and script configuration." }],
  "vanguard-bypass": [{ href: "/setup-guide-vanguard-emulator", name: "LoL Vanguard Emulator", icon: "fa-solid fa-shield-halved", text: "Riot Client login, Vanguard removal, loader authentication, inject options, and troubleshooting." }],
  spoofers: [{ href: "/setup-guide-perm-spoofer", name: "LoL Perm Spoofer", icon: "fa-solid fa-fingerprint", text: "TPM cleanup, MAC spoof, PERM spoof sequence, loader steps, and serial verification." }],
};

function hubCard(g) {
  const item = g.href ? g : { href: guideHref(g.slug), name: g.name, icon: g.icon, text: blurb(g) };
  return `        <a class="guide-hub-card" href="${item.href}">
          <div class="guide-hub-icon" aria-hidden="true"><i class="${item.icon}"></i></div>
          <h3>${esc(item.name)}</h3>
          <p>${esc(item.text)}</p>
          <span class="guide-hub-link">Open guide <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>`;
}

const HUB_START = "<!-- guides:start -->";
const HUB_END = "<!-- guides:end -->";
const hubSections = [
  HUB_START,
  ...Object.entries(CATEGORY_LABELS).map(([id, label]) => {
    const cards = [...(ORIGINAL_GUIDES[id] || []), ...PRODUCTS.filter((p) => p.category === id)];
    if (!cards.length) return "";
    return `    <section class="section guide-section" id="${id}">
      <div class="section-heading">
        <p class="eyebrow">${cards.length} guide${cards.length === 1 ? "" : "s"}</p>
        <h2>${esc(label)}</h2>
      </div>
      <div class="guide-hub-grid">
${cards.map(hubCard).join("\n")}
      </div>
    </section>`;
  }).filter(Boolean),
  `    ${HUB_END}`,
].join("\n");

const hubPath = "public/setup-guide.html";
let hub = readFileSync(hubPath, "utf8");
if (hub.includes(HUB_START)) {
  hub = hub.replace(new RegExp(`${HUB_START}[\\s\\S]*?${HUB_END}`), hubSections.trimStart());
} else {
  hub = hub.replace(/    <section class="section guide-section">\s*<div class="guide-hub-grid">[\s\S]*?<\/section>/, hubSections);
}
const count = (id) => PRODUCTS.filter((p) => p.category === id).length + (ORIGINAL_GUIDES[id] || []).length;
const total = PRODUCTS.length + 3;
const hubDescription = "Setup guides for every LOLScript product: LoL scripts (Hanbot, Legend Sense, EngineSoul, Pvlol, BGX), Vanguard emulators (OXA, Soyuz, NOI, Seraph), bundles and Perm Spoofer.";
const firstText = "If you use a separate script, set up a Vanguard emulator first (OXA, Soyuz, NOI, Seraph or the LoL Vanguard Emulator), then follow your script guide. Bundle guides show the order for both keys. If you also use the Perm Spoofer, run it before everything else.";
const firstHtml = 'If you use a separate script, set up a Vanguard emulator first (<a href="/setup-guide-oxa-vanguard-emulator">OXA</a>, <a href="/setup-guide-soyuz-vanguard-emulator">Soyuz</a>, <a href="/setup-guide-noi-vanguard-emulator">NOI</a>, <a href="/setup-guide-seraph-vanguard-emulator">Seraph</a> or the <a href="/setup-guide-vanguard-emulator">LoL Vanguard Emulator</a>), then follow your script guide. Bundle guides show the order for both keys. If you also use the <a href="/setup-guide-perm-spoofer">Perm Spoofer</a>, run it before everything else.';
const loaderText = "Some keys are shown on-screen and emailed right after checkout; for others you open a ticket in the LOLScript Discord with your order ID. Each product guide says which applies. The official loader link and update notes are shared in Discord.";
const needText = "No. Every product is sold separately. Most scripts need a Vanguard emulator, and US Tool Pro AIO and RS Pro AIO also need a Hanbot or Legend Sense key. Bundles include an emulator and a script in one order.";
const answer = (q, a) => [new RegExp(`("name": "${q}", "acceptedAnswer": \\{ "@type": "Answer", "text": ")[^"]*`), `$1${a}`];
const details = (q, a) => [new RegExp(`(<summary>${q}</summary><p>).*?(</p></details>)`), `$1${a}$2`];
for (const [re, to] of [
  [/<title>.*<\/title>/, "<title>LoL Setup Guides for Every Product | Scripts, Vanguard Emulators &amp; Bundles | LOLScript</title>"],
  [/(name="description" content=")[^"]*/, `$1${hubDescription}`],
  [/(og:description" content=")[^"]*/, `$1${hubDescription}`],
  [/(og:title" content=")[^"]*/, "$1LoL Setup Guides for Every Product"],
  [/(twitter:description" content=")[^"]*/, `$1Install guides for all ${total} LOLScript products: scripts, Vanguard emulators, bundles and Perm Spoofer.`],
  [/<p class="lead">.*<\/p>/, `<p class="lead">Every LOLScript product has its own setup guide: ${count("lol-scripts")} LoL scripts, ${count("vanguard-bypass")} Vanguard emulators, ${count("bundles")} bundles and the Perm Spoofer. Open the guide that matches what you purchased.</p>`],
  [/(<h2>Not sure which guide to use\?<\/h2>\s*<p>).*?(<\/p>)/, "$1Scripts run on top of a Vanguard emulator, so set up the emulator first. Bundle guides list the order for both keys. Join Discord if you need the current loader link or a support ticket.$2"],
  [/<p>LOLScript setup guides for LoL Script, Vanguard Emulator, and Perm Spoofer\.<\/p>/, "<p>LOLScript setup guides for every product, with Discord support.</p>"],
  answer("Which setup guide should I follow first\\?", firstText),
  answer("Where do I get the loader after purchase\\?", loaderText),
  [/"Do I need all three products\?"/, '"Do I need more than one product?"'],
  answer("Do I need more than one product\\?", needText),
  details("Which setup guide should I follow first\\?", firstHtml),
  details("Where do I get the loader after purchase\\?", loaderText),
  [/<summary>Do I need all three products\?<\/summary>/, "<summary>Do I need more than one product?</summary>"],
  details("Do I need more than one product\\?", needText),
]) hub = hub.replace(re, to);
writeFileSync(hubPath, hub);

// ---------------------------------------------------------------- pages and sitemap
let sitemap = readFileSync("public/sitemap.xml", "utf8");
for (const p of PRODUCTS) {
  writeFileSync(`public${guideHref(p.slug)}.html`, guidePage(p));
  const loc = `${SITE}${guideHref(p.slug)}`;
  if (!sitemap.includes(`<loc>${loc}</loc>`)) {
    sitemap = sitemap.replace(
      "</urlset>",
      `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n</urlset>`
    );
  }
}
writeFileSync("public/sitemap.xml", sitemap);
console.log(`Setup guides: ${PRODUCTS.length} written, /setup-guide lists ${PRODUCTS.length + 3} products.`);

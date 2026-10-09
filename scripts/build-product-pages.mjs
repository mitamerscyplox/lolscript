// Builds the product pages listed in scripts/products.mjs from the /lol-vanguard-emulator template,
// adds their cards to public/data.js and their URLs to public/sitemap.xml and public/llms.txt.
//   npm run products   (also refreshes the Shop menu)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORY_LABELS, PRODUCTS } from "./products.mjs";
import { storeProduct } from "../api/_lib/store-catalog.mjs";

const SITE = "https://www.lolscript.store";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = (file) => join(root, "public", file);
const today = new Date().toISOString().slice(0, 10);

const template = readFileSync(pub("lol-vanguard-emulator.html"), "utf8");
const pick = (re) => {
  const m = template.match(re);
  if (!m) throw new Error(`Template block not found: ${re}`);
  return m[0];
};
const verification = pick(/  <meta name="google-site-verification"[^>]*>\n  <meta name="yandex-verification"[^>]*>/);
const assets = pick(/  <link rel="stylesheet" href="\/style\.css[^"]*">\n  <script src="\/patch-status\.js[^"]*" defer><\/script>\n  <script src="\/site-header\.js[^"]*" defer><\/script>/);
const style = pick(/<style>[\s\S]*?<\/style>/).replace(
  "</style>",
  `  .product-hero-card { display:block; width:100%; height:auto; aspect-ratio:16/9; object-fit:cover; border:1px solid rgba(255,255,255,.12); border-radius:16px; box-shadow:0 24px 60px rgba(0,0,0,.45); }
    .buy-notes { width:min(1180px,100%); margin:0 auto; padding:18px 20px; border:1px solid rgba(251,191,36,.35); border-radius:12px; background:rgba(251,191,36,.06); }
    .buy-notes h2 { display:flex; align-items:center; gap:10px; margin:0 0 10px; font-size:18px; color:#fcd34d; }
    .buy-notes ul { margin:0; padding-left:20px; color:var(--muted); line-height:1.7; }
    .related-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-top:24px; }
    .related-card { display:grid; gap:10px; padding:12px; border:1px solid rgba(255,255,255,.1); border-radius:12px; background:rgba(255,255,255,.035); transition:border-color .18s ease, transform .18s ease; }
    .related-card:hover { border-color:rgba(167,139,250,.55); transform:translateY(-2px); }
    .related-card img { width:100%; height:auto; aspect-ratio:16/9; object-fit:cover; border-radius:8px; }
    .related-card strong { color:#fff; }
    .related-card span { color:var(--muted); font-size:14px; }
    .bundle-summary { display:grid; gap:8px; max-width:420px; margin:10px 0 24px; padding:14px 16px; border:1px solid rgba(255,255,255,.1); border-radius:12px; background:rgba(255,255,255,.035); font-size:14px; }
    .bundle-summary div { display:flex; justify-content:space-between; gap:16px; color:var(--muted); }
    .bundle-summary s { color:var(--muted); }
    .bundle-summary .bundle-saved, .bundle-summary .bundle-saved b { color:#4ade80; font-weight:800; }
    .bundle-parts { display:grid; gap:12px; margin-top:24px; }
    .bundle-part { display:grid; grid-template-columns:132px 1fr auto; align-items:center; gap:18px; padding:12px 18px 12px 12px; border:1px solid rgba(255,255,255,.1); border-radius:14px; background:rgba(255,255,255,.035); transition:border-color .18s ease, transform .18s ease; }
    .bundle-part:hover { border-color:rgba(245,158,11,.55); transform:translateY(-2px); }
    .bundle-part img { width:132px; height:auto; aspect-ratio:16/9; object-fit:cover; border-radius:8px; }
    .bundle-part strong { display:block; color:#fff; font-size:17px; }
    .bundle-part em { display:inline-block; margin-top:6px; padding:2px 10px; border:1px solid rgba(255,255,255,.14); border-radius:999px; color:var(--muted); font-size:12px; font-style:normal; }
    .bundle-part-price { color:#fff; font-weight:800; font-size:17px; }
    @media (max-width:560px) { .bundle-part { grid-template-columns:88px 1fr; } .bundle-part img { width:88px; } .bundle-part-price { grid-column:2; } }
  </style>`
);
const header = pick(/  <header class="site-header[\s\S]*?<\/header>/);
const footer = pick(/  <footer class="footer">[\s\S]*?<\/footer>/);
const tailScripts = pick(/  <script src="\/currency\.js[\s\S]*?(?=<\/body>)/);
const offerExtras = pick(/          "availability"[\s\S]*?"returnPolicyCategory": "[^"]*"\n          \}/);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const text = (html) => String(html).replace(/<[^>]+>/g, "");
const money = (n) => `$${n.toFixed(2)}`;

const bySlug = new Map(PRODUCTS.map((p) => [p.slug, p]));
const LEGACY = {
  "lol-script": { name: "LoL Script", card: "Undetected LoL Script with evade, prediction, orbwalker, and 150+ champions.", price: 3.99 },
  "lol-vanguard-emulator": { name: "LoL Vanguard Emulator", card: "Removes Riot Vanguard so League runs without anti-cheat.", price: 79.99 },
  "lol-perm-spoofer": { name: "LoL Perm Spoofer", card: "Permanent HWID spoofer for a clean League start.", price: 19.99 },
};
const relatedInfo = (slug) => bySlug.get(slug) || LEGACY[slug];

function jsonLd(p) {
  const url = `${SITE}/${p.slug}`;
  const image = `${SITE}/assets/og/${p.slug}.png`;
  const offers = `{
          "@type": "Offer",
          "url": "${url}",
          "priceCurrency": "USD",
          "price": "${p.price.toFixed(2)}",
${offerExtras}
        }`;
  const faq = p.faq
    .map((f) => `          {
            "@type": "Question",
            "name": ${JSON.stringify(text(f.q))},
            "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(text(f.a))} }
          }`)
    .join(",\n");
  return `  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": "${url}#product",
        "name": ${JSON.stringify(p.name)},
        "description": ${JSON.stringify(text(p.card))},
        "image": "${image}",
        "brand": { "@type": "Brand", "name": "LOLScript.store" },
        "category": ${JSON.stringify(CATEGORY_LABELS[p.category])},
        "offers": ${offers}
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "${SITE}/" },
          { "@type": "ListItem", "position": 2, "name": ${JSON.stringify(CATEGORY_LABELS[p.category])}, "item": "${SITE}/#${p.category}" },
          { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(p.name)}, "item": "${url}" }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
${faq}
        ]
      }
    ]
  }
  </script>`;
}

function page(p) {
  const url = `${SITE}/${p.slug}`;
  const og = `${SITE}/assets/og/${p.slug}.png`;
  const cents = Math.round(p.price * 100);
  const category = CATEGORY_LABELS[p.category];
  const notes = p.notes?.length
    ? `
    <section class="product-section">
      <div class="buy-notes">
        <h2><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Before you buy</h2>
        <ul>
          ${p.notes.map((n) => `<li>${n}</li>`).join("\n          ")}
        </ul>
      </div>
    </section>
`
    : "";
  const parts = (p.parts || []).map((slug) => ({
    slug,
    name: relatedInfo(slug).name,
    price: storeProduct(slug).fallback.find((v) => /^1 day/i.test(v.name))?.price ?? relatedInfo(slug).price,
  }));
  const regular = parts.reduce((sum, part) => sum + part.price, 0);
  const saved = regular - p.price;
  const bundleSummary = parts.length
    ? `
          <div class="bundle-summary" data-bundle-summary="${p.slug}">
            <div><span>Regular price</span><s data-bundle-regular data-money-usd-cents="${Math.round(regular * 100)}">${money(regular)}</s></div>
            <div class="bundle-saved"><span>You save</span><span><b data-bundle-saved data-money-usd-cents="${Math.round(saved * 100)}">${money(saved)}</b> (<span data-bundle-saved-pct>${Math.round((saved / regular) * 100)}</span>%)</span></div>
          </div>`
    : "";
  const bundleParts = parts.length
    ? `
    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">Bundle</p>
          <h2>Included in this bundle</h2>
          <p>Every product in the bundle is delivered for the plan length you select.</p>
        </div>
        <div class="bundle-parts">
          ${parts
            .map((part) => `<a class="bundle-part" href="/${part.slug}" data-bundle-part="${part.slug}" data-bundle-of="${p.slug}"><img src="/assets/products/${part.slug}.webp" alt="${esc(part.name)}" loading="lazy" decoding="async" width="1920" height="1080"><span><strong>${esc(part.name)}</strong><em data-part-plan>1 Day</em></span><span class="bundle-part-price" data-part-price data-money-usd-cents="${Math.round(part.price * 100)}">${money(part.price)}</span></a>`)
            .join("\n          ")}
        </div>
      </div>
    </section>
`
    : "";
  const related = (p.related || []).filter(relatedInfo);
  const relatedSection = related.length
    ? `
    <section class="product-section alt">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">Works well with</p>
          <h2>Related products</h2>
        </div>
        <div class="related-grid">
          ${related
            .map((slug) => {
              const r = relatedInfo(slug);
              return `<a class="related-card" href="/${slug}"><img src="/assets/products/${slug}.webp" alt="${esc(r.name)}" loading="lazy" decoding="async" width="1920" height="1080"><strong>${esc(r.name)}</strong><span>${esc(text(r.card))}</span><span data-price-slug="${slug}" data-money-usd-cents="${Math.round(r.price * 100)}">${money(r.price)}</span></a>`;
            })
            .join("\n          ")}
        </div>
      </div>
    </section>
`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${verification}
  <title>${esc(p.title)}</title>
  <meta name="description" content="${esc(p.metaDescription)}">
  <meta name="keywords" content="${esc(p.keywords)}">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="LOLScript.store">
  <meta property="og:title" content="${esc(p.name)} | LOLScript.store">
  <meta property="og:description" content="${esc(p.metaDescription)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${og}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(p.name)} | LOLScript.store">
  <meta name="twitter:description" content="${esc(p.metaDescription)}">
  <meta name="twitter:image" content="${og}">
  <link rel="canonical" href="${url}">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <link rel="icon" href="/favicon.ico">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#0b0712">
  <link rel="apple-touch-icon" href="/assets/image/logo.png">
${assets}
${jsonLd(p)}
  ${style}
</head>
<body data-product-slug="${p.slug}">
${header}

  <main>
    <section class="product-hero">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> / <a href="/#${p.category}">${esc(category)}</a> / <b>${esc(p.name)}</b>
      </nav>
      <div class="product-hero-grid">
        <div class="product-copy">
          <p class="badge">${esc(p.eyebrow)}</p>
          <h1>${esc(p.h1)}</h1>
          <p class="lead">${p.lead}</p>
          <div class="variant-picker" data-variant-picker="${p.slug}"></div>
          <div class="price-row">
            <span class="price" data-price-slug="${p.slug}" data-money-usd-cents="${cents}">${money(p.price)}</span>
            <span class="price-note" data-price-note-slug="${p.slug}">per plan &bull; instant delivery</span>
          </div>${bundleSummary}
          <div class="hero-actions">
            <a class="button primary" data-buy-slug="${p.slug}" href="/#products">Buy Now</a>
            <a class="button secondary" href="https://discord.gg/n2ng5mJjhm" target="_blank" rel="noreferrer">Join Discord</a>
          </div>
          <ul class="trust-list">
            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Instant key delivery</li>
            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Secure checkout</li>
            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Setup guidance included</li>
            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Live Discord support</li>
          </ul>
        </div>
        <div class="product-visual">
          <img class="product-hero-card" src="/assets/products/${p.slug}.webp" alt="${esc(p.name)}" width="1920" height="1080" fetchpriority="high">
        </div>
      </div>
    </section>
${bundleParts}${notes}
    <section class="product-section product-showcase-section" data-product-showcase="${p.slug}" hidden aria-hidden="true">
      <div class="product-inner product-showcase-inner">
        <div class="product-showcase-head">
          <span class="product-showcase-badge"><i class="fa-solid fa-play" aria-hidden="true"></i> Showcase</span>
          <p>Click play to open the preview. Press Esc to close.</p>
        </div>
        <div class="product-showcase-frame" data-product-showcase-player></div>
      </div>
    </section>

    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">Features</p>
          <h2>${esc(p.featuresTitle)}</h2>
          <p>${p.featuresText}</p>
        </div>
        <div class="spec-grid">
          ${p.features.map(([icon, title, body]) => `<article class="spec-card"><h3><i class="${icon}" aria-hidden="true"></i> ${esc(title)}</h3><p>${body}</p></article>`).join("\n          ")}
        </div>
      </div>
    </section>

    <section class="product-section alt">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">How it works</p>
          <h2>From checkout to playing</h2>
        </div>
        <ol class="steps">
          ${p.steps.map(([title, body]) => `<li><div><h3>${esc(title)}</h3><p>${body}</p></div></li>`).join("\n          ")}
        </ol>
        <div class="hero-actions" style="justify-content:center;margin-top:28px;">
          <a class="button secondary" href="/setup-guide-${p.slug}">Full ${esc(p.name.replace(/ Key$/, ""))} setup guide</a>
        </div>
      </div>
    </section>
${relatedSection}
    <section class="product-section">
      <div class="product-inner">
        <div class="section-heading">
          <p class="eyebrow">FAQ</p>
          <h2>${esc(p.name)} questions</h2>
        </div>
        <div class="faq-list">
          ${p.faq.map((f, i) => `<details${i === 0 ? " open" : ""}><summary>${f.q}</summary><p>${f.a}</p></details>`).join("\n          ")}
        </div>
      </div>
    </section>
  </main>

${footer}

${tailScripts}</body>
</html>
`;
}

for (const p of PRODUCTS) writeFileSync(pub(`${p.slug}.html`), page(p));

// ---------------------------------------------------------------- data.js cards
const dataPath = pub("data.js");
const dataSource = readFileSync(dataPath, "utf8");
const data = JSON.parse(dataSource.replace(/^window\.SITE_DATA\s*=\s*/, "").replace(/;\s*$/, ""));
for (const p of PRODUCTS) {
  const card = {
    category: p.category,
    name: p.name,
    slug: p.slug,
    description: text(p.card),
    price: money(p.price),
    icon: p.icon,
    image: `assets/products/${p.slug}.webp`,
    page: `/${p.slug}`,
    link: "#products",
    featured: false,
    ...(p.badge ? { badge: p.badge } : {}),
    metaTitle: p.title,
    metaDescription: p.metaDescription,
  };
  const index = data.products.findIndex((x) => x.slug === p.slug);
  if (index >= 0) data.products[index] = card;
  else data.products.push(card);
}
const eol = dataSource.includes("\r\n") ? "\r\n" : "\n";
writeFileSync(dataPath, `window.SITE_DATA = ${JSON.stringify(data, null, 2)};${eol}`.replace(/\n/g, eol));

// ---------------------------------------------------------------- sitemap.xml
const sitemapPath = pub("sitemap.xml");
let sitemap = readFileSync(sitemapPath, "utf8");
for (const p of PRODUCTS) {
  const loc = `${SITE}/${p.slug}`;
  const entry = `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
  const existing = new RegExp(`  <url>\\s*<loc>${loc.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}</loc>[\\s\\S]*?</url>\\n`);
  sitemap = existing.test(sitemap) ? sitemap : sitemap.replace("</urlset>", `${entry}</urlset>`);
}
writeFileSync(sitemapPath, sitemap);

// ---------------------------------------------------------------- llms.txt
const llmsPath = pub("llms.txt");
const llms = readFileSync(llmsPath, "utf8");
const START = "<!-- products:start -->";
const END = "<!-- products:end -->";
const block = [
  START,
  ...Object.entries(CATEGORY_LABELS)
    .filter(([id]) => PRODUCTS.some((p) => p.category === id))
    .flatMap(([id, label]) => [
      "",
      `### ${label}`,
      "",
      ...PRODUCTS.filter((p) => p.category === id).map((p) => `- [${p.name}](${SITE}/${p.slug}): ${text(p.card)} From ${money(p.price)}.`),
    ]),
  "",
  END,
].join("\n");
const llmsNext = llms.includes(START)
  ? llms.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block)
  : llms.replace(/\n## Setup guides/, `\n${block}\n\n## Setup guides`);
writeFileSync(llmsPath, llmsNext);

console.log(`Product pages: ${PRODUCTS.length} written, data.js has ${data.products.length} products.`);

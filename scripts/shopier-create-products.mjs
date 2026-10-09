// Creates a Shopier product for every Sellhub variant of the store's products, titled so
// api/_lib/shopier-catalog.mjs links it to that variant ("LoL Hanbot 1 Gün Lisans" <-> "Hanbot Key" / "1 Day Key").
// Delivery comes from Sellhub stock, so Shopier stock is not tracked. Dry run by default; --create to send.
// Shopier's API cannot edit products, so --replace=slug,...|all recreates listings (keeping their price) and deletes the old ones.
// Afterwards run scripts/shopier-snapshot.mjs so the deployed site (blocked by Shopier) knows the new listings.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envFile = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*((?:SHOPIER|SELLHUB)_[A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const { shopierApi, listShopierProducts } = await import("../api/_lib/shopier.mjs");
const { listingKey } = await import("../api/_lib/shopier-catalog.mjs");
const { fetchSellhubProducts } = await import("../api/_lib/sellhub-core.mjs");
const { exactStoreSlug } = await import("../api/_lib/store-catalog.mjs");

const CREATE = process.argv.includes("--create");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const REPLACE = process.argv.find((a) => a.startsWith("--replace="))?.slice(10).split(",") || [];
const TRY_PER_USD = 50;
const SITE = "https://www.lolscript.store";
// Shopier copies the image when the product is created, so the URL must be public at that moment;
// --media=file.json ({ slug: url }) overrides the site URL when the site has not been deployed yet.
const mediaFile = process.argv.find((a) => a.startsWith("--media="))?.slice(8);
const MEDIA = mediaFile ? JSON.parse(readFileSync(mediaFile, "utf8").replace(/^\uFEFF/, "")) : {};

const EMULATOR_NOTE = "Çalışması için bir Vanguard emülatörü gerekir (OXA, Soyuz, NOI veya Seraph).";
const bundle = (emu, script, extra) => ({
  intro: `${emu} Vanguard emülatörü ve ${script} tek pakette. İkisini ayrı ayrı almaktan daha uygun fiyatlı.`,
  features: [`${emu} Vanguard emülatörü anahtarı`, `${script} script anahtarı`, "İki anahtar da aynı süreli", "Kurulum için Discord desteği", ...(extra || [])],
});

// Shopier descriptions; instant products carry real Sellhub keys, the rest are delivered through a Discord ticket.
const TR = {
  "lol-script": {
    instant: true,
    intro: "League of Legends için tespit edilmeyen, 150+ şampiyon destekli script.",
    features: ["Evade (skill kaçırma)", "Prediction (isabet tahmini)", "Orbwalker ve hedef seçici", "Şampiyona özel kombolar", "Activator (eşya / büyü otomasyonu)"],
  },
  "lol-vanguard-emulator": {
    instant: true,
    intro: "Riot Vanguard'ı bilgisayarınızdan kaldırır; League of Legends'ı anti-cheat çalışmadan oynamanızı sağlar.",
    features: ["Vanguard olmadan oyuna giriş", "Script ve araçlarla uyumlu", "Kolay kurulum", "Kurulum desteği dahil"],
  },
  "lol-perm-spoofer": {
    instant: true,
    intro: "League of Legends için kalıcı HWID spoofer. Donanım kimliklerinizi değiştirerek temiz bir başlangıç sağlar.",
    features: ["HWID ban çözümü", "Kalıcı (perm) değişiklik", "Çoğu anakart ve disk ile uyumlu", "Kurulum desteği dahil"],
  },
  "hanbot-key": {
    intro: "Hanbot, 160+ şampiyonu destekleyen popüler League of Legends scripti.",
    features: ["Orbwalker", "Prediction (isabet tahmini)", "Evade (skill kaçırma)", "Şampiyona özel kombolar"],
    note: EMULATOR_NOTE,
  },
  "legend-sense-key": {
    intro: "Legend Sense (LS), şampiyon modülleri olan gelişmiş bir League of Legends scripti.",
    features: ["Şampiyon modülleri", "Evade (skill kaçırma)", "Prediction (isabet tahmini)", "Düzenli güncellemeler"],
    note: EMULATOR_NOTE,
  },
  enginesoul: {
    intro: "EngineSoul, 8 saatten 30 güne kadar esnek paketleri olan bir League of Legends scripti.",
    features: ["8 saat, 1 gün, 7 gün ve 30 gün seçenekleri", "Orbwalker ve evade", "Şampiyona özel kombolar"],
    note: EMULATOR_NOTE,
  },
  "us-tool-pro-aio": {
    intro: "Hanbot için gelişmiş eklenti.",
    features: ["Ayarlı evade ve orbwalker profilleri", "Akıllı activator", "Otomatik yetenek seviyesi", "Lobi otomasyonu"],
    note: "Çalışması için Hanbot gerekir.",
  },
  "rs-pro-aio": {
    intro: "Legend Sense ve Hanbot için gelişmiş eklenti.",
    features: ["Şampiyona özel kombolar", "Optimize edilmiş savaş mantığı", "Yuumi otomasyonu", "Ayarlı evade"],
    note: "Çalışması için Legend Sense veya Hanbot gerekir.",
  },
  "pvlol-script": {
    intro: "Uygun fiyatlı League of Legends scripti. Birkaç saatten bir aya kadar paket seçenekleri.",
    features: ["7 saat, 12 saat, 1 gün, 7 gün ve 30 gün seçenekleri", "Hızlı teslimat"],
    note: "Kullanım riski kullanıcıya aittir.",
  },
  "bgx-script": {
    intro: "BGX, League of Legends için script.",
    features: ["1 günlük anahtar", "Hızlı teslimat"],
    note: EMULATOR_NOTE,
  },
  "noi-vanguard-emulator": {
    intro: "NOI, tek bilgisayarlık Vanguard emülatörü. Vanguard'ı kaldırın, yönetici olarak çalıştırın ve oynayın.",
    features: ["Tek PC lisansı", "Kolay kurulum", "1 gün ve 7 gün seçenekleri"],
  },
  "seraph-vanguard-emulator": {
    intro: "Seraph, tek bilgisayarlık Vanguard emülatörü. League of Legends'ı Vanguard olmadan açar.",
    features: ["Tek PC lisansı", "Linux'ta da çalışır", "Riot telemetri ve takibini engeller", "Tüm scriptlerle uyumlu", "1 gün ve 7 gün seçenekleri"],
  },
  "oxa-vanguard-emulator": {
    intro: "OXA, slot sistemli tek bilgisayarlık Vanguard emülatörü.",
    features: ["Tek PC lisansı", "Slot sistemi", "1 gün ve 7 gün seçenekleri"],
    note: "Satın almadan önce Discord'dan slot durumunu sorun.",
  },
  "soyuz-vanguard-emulator": {
    intro: "Soyuz, tek bilgisayarlık Vanguard emülatörü.",
    features: ["Tek PC lisansı", "1 gün ve 7 gün seçenekleri"],
    note: "Herkese açık sürüm: ara sıra Vanguard event veya 2266 hatası görülebilir.",
  },
  "oxa-enginesoul-bundle": bundle("OXA", "EngineSoul"),
  "soyuz-enginesoul-bundle": bundle("Soyuz", "EngineSoul"),
  "oxa-hanbot-bundle": bundle("OXA", "Hanbot"),
  "soyuz-hanbot-bundle": bundle("Soyuz", "Hanbot"),
  "oxa-legend-sense-bundle": bundle("OXA", "Legend Sense"),
  "soyuz-legend-sense-bundle": bundle("Soyuz", "Legend Sense"),
};

const TERMS = [
  ["İade Politikası", "Dijital ürünlerde teslimat sonrası her ne sebeple olursa olsun iade ve değişim yapılmaz. Tüm satışlar finale tabidir."],
  ["Kullanım Riski", "Yazılım kullanımı sırasında oluşabilecek hesap engellemeleri (ban/suspension) kullanıcı sorumluluğundadır. Risk size aittir."],
  ["Tersine Mühendislik", "Yazılımın kaynak kodlarına erişmeye çalışmak, kırmak (crack) veya decompile etmek yasaktır; tespiti halinde lisans iptal edilir."],
  ["Ödeme İtirazları", "Haksız yere açılan \"Chargeback\" veya ödeme itirazları, tüm lisanslarınızın kalıcı olarak devre dışı bırakılmasına neden olur."],
  ["Ürün Ömrü", "\"Sınırsız (Lifetime)\" ibaresi, ürünün mağazamızda aktif olarak satıldığı ve güncellendiği süreyi kapsar."],
  ["Teknik Destek", "Sadece sunucu taraflı sorunlarda telafi sağlanır. Kullanıcı taraflı teknik aksaklıklardan Mitamers sorumlu tutulamaz."],
];

// Shopier keeps <p>, <b>, <ul> and <li> but drops newlines and <br>.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
function description(info, title) {
  const delivery = info.instant
    ? ["Ödemeden hemen sonra lisans anahtarınız otomatik olarak teslim edilir.", "Kurulum yardımı için Discord: lolscript.store/discord"]
    : ["Ödemeden sonra Discord sunucumuza katılın: lolscript.store/discord", "Ticket açıp sipariş numaranızı gönderin.", "Anahtarınız ekibimiz tarafından en kısa sürede teslim edilir."];
  return [
    `<p><b>${esc(title)}</b></p>`,
    `<p>${esc(info.intro)}</p>`,
    `<p><b>Özellikler</b></p>${list(info.features.map(esc))}`,
    info.note ? `<p><b>Not:</b> ${esc(info.note)}</p>` : "",
    `<p><b>Teslimat</b></p>${list(delivery.map(esc))}`,
    `<p><b>Satış ve Kullanım Şartları</b></p>`,
    `<p>Mitamers Software üzerinden ürün satın alarak veya lisans anahtarı kullanarak aşağıdaki şartları kabul etmiş sayılırsınız:</p>`,
    list(TERMS.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`)),
  ].join("");
}

// Shopier will not sell a product with 0 stock; the real stock lives on Sellhub.
const SHOPIER_STOCK = 999;

const tryPrice = (usd) => Math.max(50, Math.round((usd * TRY_PER_USD) / 10) * 10);
function planTr(variantName) {
  const s = String(variantName).replace(/\s*(key|bundle)$/i, "").trim().toLowerCase();
  if (/life\s*time/.test(s)) return "Ömür Boyu";
  if (/one\s*time/.test(s)) return "Tek Seferlik";
  const m = s.match(/^(\d+)\s*(hour|day)s?$/);
  return m ? `${m[1]} ${m[2] === "hour" ? "Saat" : "Gün"}` : s;
}
const shopierTitle = (productName, variantName) =>
  `LoL ${productName.replace(/^lol\s+/i, "").replace(/\s+key$/i, "")} ${planTr(variantName)} Lisans`;

const { products: shopierProducts, error } = await listShopierProducts();
if (error) throw new Error(`Shopier list: ${error}`);
// Listings are created hidden (customListing) so they stay off the main store; the store listing
// cannot show them, so they are tracked in the snapshot file.
const snapshotFile = fileURLToPath(new URL("../api/_lib/shopier-listings.mjs", import.meta.url));
const { default: saved } = await import("../api/_lib/shopier-listings.mjs");
const storeIds = new Set(shopierProducts.map((p) => String(p.id)));
const hiddenSaved = saved.filter((p) => p.hidden && !storeIds.has(p.id));
const created = [];
const deleted = new Set();
const existingByKey = new Map();
for (const p of [...shopierProducts, ...hiddenSaved]) {
  const key = listingKey(p.title, p.title);
  if (key && /\blol\b/i.test(p.title)) existingByKey.set(key, [...(existingByKey.get(key) || []), p]);
}
console.log(`Shopier has ${shopierProducts.length} products.`);

async function remove(listing) {
  const del = await shopierApi(`/products/${encodeURIComponent(listing.id)}`, { method: "DELETE" });
  console.log(del.ok ? `  deleted "${listing.title}" (${listing.id})` : `  could not delete ${listing.id}: ${del.status}`);
  if (del.ok) deleted.add(String(listing.id));
  saveSnapshot();
}

// Written after every change so an interrupted run never loses track of a hidden listing.
function saveSnapshot() {
  const kept = saved.filter((p) => !deleted.has(p.id));
  writeFileSync(
    snapshotFile,
    `/** Generated by scripts/shopier-snapshot.mjs on ${new Date().toISOString().slice(0, 10)}. */\nexport default ${JSON.stringify([...created, ...kept], null, 2)};\n`
  );
}

for (const product of await fetchSellhubProducts()) {
  const slug = exactStoreSlug({ sellhubSlug: product.sellhubSlug, name: product.name });
  const info = TR[slug];
  if (!info || (ONLY && !ONLY.includes(slug))) continue;
  for (const variant of product.variants || []) {
    const variantName = variant.title || variant.name || "";
    const title = shopierTitle(product.name, variantName);
    const key = listingKey(product.name, variantName);
    if (!key || listingKey(title, title) !== key) { console.log(`skip "${title}": does not match its Sellhub variant`); continue; }
    const olds = existingByKey.get(key) || [];
    const replacing = olds.length > 0 && (REPLACE.includes(slug) || REPLACE.includes("all"));
    if (olds.length && !replacing) { console.log(`exists "${olds[0].title}"`); continue; }
    // A rerun after a timeout: the new listing exists, only the old ones are left to delete.
    const done = olds.find((o) => o.title === title && o.hidden);
    if (done) {
      const stale = olds.filter((o) => o !== done);
      if (!stale.length) { console.log(`up to date "${title}"`); continue; }
      if (!CREATE) { console.log(`would delete ${stale.length} old listing(s) of "${title}"`); continue; }
      for (const o of stale) await remove(o);
      continue;
    }
    const oldPrice = olds.map((o) => Number(o.priceData?.price)).find((n) => n > 0);
    const price = oldPrice ? Math.round(oldPrice) : tryPrice(Number(variant.price));
    const action = replacing ? `replace "${olds[0].title}" with` : "create";
    if (!CREATE) { console.log(`would ${action} "${title}" ${price} TRY`); continue; }
    const body = {
      title,
      type: "digital",
      shippingPayer: "sellerPays",
      priceData: { currency: "TRY", price: String(price) },
      media: [{ type: "image", url: MEDIA[slug] || `${SITE}/assets/products/${slug}.webp`, placement: 1 }],
      stockQuantity: SHOPIER_STOCK,
      customListing: true,
      description: description(info, title),
    };
    const res = await shopierApi("/products", { method: "POST", body: JSON.stringify(body) });
    if (!res.ok) { console.log(`FAILED "${title}" -> ${res.status}; rerun to finish (old listings kept)`); continue; }
    console.log(`created "${title}" ${price} TRY -> ${res.data?.id}`);
    const id = String(res.data?.id);
    created.push({ id, title, url: `https://www.shopier.com/mitamers/${id}`, priceData: { price, currency: "TRY" }, stockStatus: "inStock", hidden: true });
    saveSnapshot();
    for (const o of olds) await remove(o);
  }
}
if (!CREATE) console.log("\nDry run. Re-run with --create to apply.");
else if (created.length || deleted.size) {
  console.log(`Snapshot updated: +${created.length} hidden, -${deleted.size}. Run scripts/shopier-snapshot.mjs to refresh the rest.`);
}

/**
 * Every product the site sells, keyed by the page slug used in data.js, data-buy-slug and /api/prices.
 *
 * A Sellhub product is linked to a slug when its Sellhub URL slug equals the slug, or when its name
 * equals one of `names` (case, spacing and punctuation ignored). `keywords` is a looser legacy match
 * kept only for the three original products. `fallback` prices show until the Sellhub product exists.
 */

function envPrice(key, fallback) {
  const raw = process.env[key];
  if (raw == null || String(raw).trim() === "") return fallback;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const plans = (slug, entries) =>
  entries.map(([label, price]) => ({
    id: `${slug}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-key$/, "")}`,
    name: label,
    title: label,
    price,
    stock: 100,
  }));

const product = (slug, name, names, entries, extra = {}) => ({
  slug,
  name,
  names: [name, slug, ...names],
  fallback: plans(slug, entries),
  ...extra,
});

export const STORE_PRODUCTS = [
  product("lol-script", "LoL Script", ["LOLScript"], [
    ["1 Day Key", envPrice("FALLBACK_LOL_SCRIPT_1_DAY", 3.99)],
    ["7 Day Key", envPrice("FALLBACK_LOL_SCRIPT_7_DAY", 11.99)],
    ["30 Day Key", envPrice("FALLBACK_LOL_SCRIPT_30_DAY", 27.99)],
  ], { keywords: ["lol-script", "lol script"] }),
  product("lol-vanguard-emulator", "LoL Vanguard Emulator", ["LOLScript Vanguard Emulator"], [
    ["7 Day Key", envPrice("FALLBACK_VANGUARD_7_DAY", 79.99)],
    ["30 Day Key", envPrice("FALLBACK_VANGUARD_30_DAY", 199.99)],
    ["Lifetime Key", envPrice("FALLBACK_VANGUARD_LIFETIME", 449.99)],
  ], { keywords: ["lol vanguard emulator", "bolt"] }),
  product("lol-perm-spoofer", "LoL Perm Spoofer", ["LOLScript Perm Spoofer"], [
    ["Onetime Key", envPrice("FALLBACK_SPOOFER_ONETIME", 19.99)],
    ["Lifetime Key", envPrice("FALLBACK_SPOOFER_LIFETIME", 49.99)],
  ], { keywords: ["perm spoofer", "hwid spoofer"] }),

  product("hanbot-key", "Hanbot Key", ["Hanbot", "Hanbot Bot Key", "Hanbot Script"], [
    ["1 Day Key", 1.99],
    ["30 Day Key", 37.99],
  ]),
  product("legend-sense-key", "Legend Sense Key", ["Legend Sense", "LegendSense", "LS"], [
    ["1 Day Key", 5.49],
    ["7 Day Key", 32.99],
    ["30 Day Key", 91.99],
  ]),
  product("enginesoul", "EngineSoul", ["Enginesoul Key", "Engine Soul"], [
    ["8 Hour Key", 2.79],
    ["1 Day Key", 4.69],
    ["7 Day Key", 18.49],
    ["30 Day Key", 38.99],
  ]),
  product("us-tool-pro-aio", "US Tool Pro AIO", ["US Tool", "UsTool Pro AIO"], [["1 Day Key", 1.99]]),
  product("rs-pro-aio", "RS Pro AIO", ["RS Pro", "RSPro AIO"], [["1 Day Key", 1.99]]),
  product("pvlol-script", "Pvlol Script", ["Pvlolscript", "Pvlol", "PV LoL Script"], [
    ["7 Hour Key", 1.09],
    ["12 Hour Key", 1.69],
    ["1 Day Key", 2.79],
    ["7 Day Key", 9.79],
    ["30 Day Key", 21.99],
  ]),
  product("bgx-script", "BGX Script", ["BGX"], [["1 Day Key", 4.69]]),

  product("noi-vanguard-emulator", "NOI Vanguard Emulator", ["NOI", "NOI Bypass", "NO1 Bypass", "NOI Emulator"], [
    ["1 Day Key", 3.89],
    ["7 Day Key", 21.69],
  ]),
  product("seraph-vanguard-emulator", "Seraph Vanguard Emulator", ["Seraph", "Seraph Bypass", "Seraph Bypass 1PC", "Seraph Emulator"], [
    ["1 Day Key", 4.69],
    ["7 Day Key", 22.79],
  ]),
  product("oxa-vanguard-emulator", "OXA Vanguard Emulator", ["OXA", "OXA 1PC", "OXA Bypass", "OXA Emulator"], [
    ["1 Day Key", 4.69],
    ["7 Day Key", 25.99],
  ]),
  product("soyuz-vanguard-emulator", "Soyuz Vanguard Emulator", ["Soyuz", "Soyuz 1PC", "Soyuz Bypass", "Soyuz 1PC Bypass", "Soyuz Emulator"], [
    ["1 Day Key", 4.69],
    ["7 Day Key", 18.79],
  ]),

  product("oxa-enginesoul-bundle", "OXA + EngineSoul Bundle", ["OXA + EngineSoul", "Oxa EngineSoul"], [
    ["1 Day Bundle", 8.89],
    ["7 Day Bundle", 41.29],
  ]),
  product("soyuz-enginesoul-bundle", "Soyuz + EngineSoul Bundle", ["Soyuz + EngineSoul", "Soyuz EngineSoul"], [
    ["1 Day Bundle", 8.89],
    ["7 Day Bundle", 34.79],
  ]),
  product("oxa-hanbot-bundle", "OXA + Hanbot Bundle", ["OXA + Hanbot", "Oxa Hanbot"], [["1 Day Bundle", 6.29]]),
  product("soyuz-hanbot-bundle", "Soyuz + Hanbot Bundle", ["Soyuz + Hanbot", "Soyuz Hanbot"], [["1 Day Bundle", 6.29]]),
  product("oxa-legend-sense-bundle", "OXA + Legend Sense Bundle", ["OXA + Legend Sense", "OXA + LegendSense", "Oxa LS"], [
    ["1 Day Bundle", 9.79],
    ["7 Day Bundle", 54.29],
  ]),
  product("soyuz-legend-sense-bundle", "Soyuz + Legend Sense Bundle", ["Soyuz + Legend Sense", "Soyuz + LegendSense", "Soyuz+LS", "Soyuz LS"], [
    ["1 Day Bundle", 9.79],
    ["7 Day Bundle", 49.99],
  ]),
];

export const STORE_SLUGS = STORE_PRODUCTS.map((p) => p.slug);

const BY_SLUG = Object.fromEntries(STORE_PRODUCTS.map((p) => [p.slug, p]));

export function storeProduct(slug) {
  return BY_SLUG[slug] || null;
}

export const normalizeName = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const NAME_INDEX = new Map(
  STORE_PRODUCTS.flatMap((p) => p.names.map((n) => [normalizeName(n), p.slug]))
);

/** The store slug an exact Sellhub slug or product name belongs to, or null. */
export function exactStoreSlug({ sellhubSlug, name } = {}) {
  if (sellhubSlug && BY_SLUG[sellhubSlug]) return sellhubSlug;
  return NAME_INDEX.get(normalizeName(name)) || null;
}

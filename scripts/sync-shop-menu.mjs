// Rebuilds the "Shop" dropdown on every public/*.html page from the categories
// and products in public/data.js. Run after adding or renaming a product:
//   npm run shop-menu
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(publicDir, "data.js"), "utf8"), sandbox);
const { categories = [], products = [] } = sandbox.window.SITE_DATA || {};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

const groups = categories
  .map((category) => ({ category, items: products.filter((product) => product.category === category.id && product.page) }))
  .filter(({ items }) => items.length > 0);

if (!groups.length) throw new Error("data.js has no categorized products with a page");

function menuMarkup(indent) {
  const inner = `${indent}  `;
  const lines = [`${indent}<div class="shop-dropdown" aria-label="Shop menu">`];
  for (const { category, items } of groups) {
    lines.push(`${inner}<div class="shop-group">`);
    lines.push(`${inner}  <a class="shop-group-label" href="/#${escapeHtml(category.id)}">${escapeHtml(category.name)}</a>`);
    for (const product of items) {
      lines.push(`${inner}  <a href="${escapeHtml(product.page)}">${escapeHtml(product.menuName || product.name)}</a>`);
    }
    lines.push(`${inner}</div>`);
  }
  lines.push(`${indent}</div>`);
  return lines.join("\n");
}

const dropdown = /^([ \t]*)<div class="shop-dropdown"[^>]*>[\s\S]*?^\1<\/div>/gm;
let changed = 0;
let found = 0;

for (const file of readdirSync(publicDir).filter((name) => name.endsWith(".html"))) {
  const path = join(publicDir, file);
  const source = readFileSync(path, "utf8");
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  let hits = 0;
  const next = source.replace(dropdown, (_match, indent) => {
    hits += 1;
    return menuMarkup(indent).replace(/\n/g, eol);
  });
  if (!hits) continue;
  found += 1;
  if (next !== source) {
    writeFileSync(path, next);
    changed += 1;
  }
}

console.log(`Shop menu: ${groups.length} categories, ${found} pages with a dropdown, ${changed} updated.`);

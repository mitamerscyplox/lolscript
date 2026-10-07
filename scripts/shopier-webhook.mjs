/**
 * Registers the Shopier order.created webhook for this site using a Personal Access Token.
 *
 *   node scripts/shopier-webhook.mjs https://www.lolscript.store              (SHOPIER_PAT from env or .env)
 *   node scripts/shopier-webhook.mjs https://www.lolscript.store --recreate   (replace an existing one)
 *
 * The signing token is returned only once; it is saved to .env, copy it to Vercel as SHOPIER_WEBHOOK_TOKEN.
 * Other webhooks on the same Shopier account (e.g. another store) are left untouched.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

function patFromDotEnv() {
  if (!existsSync(".env")) return "";
  const line = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((l) => /^\s*SHOPIER_PAT\s*=/.test(l));
  return line ? line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") : "";
}

const API = "https://api.shopier.com/v1";
const pat = (process.env.SHOPIER_PAT || patFromDotEnv()).trim();
const site = (process.argv[2] || "").replace(/\/+$/, "");
const recreate = process.argv.includes("--recreate");

if (!pat || !/^https:\/\//.test(site)) {
  console.error("Usage: put SHOPIER_PAT in .env, then run: node scripts/shopier-webhook.mjs https://www.lolscript.store [--recreate]");
  process.exit(1);
}

const url = `${site}/api/shopier-webhook`;

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${pat}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} failed (${res.status}): ${data?.message || JSON.stringify(data)}`);
  return data;
}

const list = await api("/webhooks?limit=50");
const hooks = Array.isArray(list) ? list : list?.data || [];
const existing = hooks.filter((w) => w.event === "order.created" && w.url === url);
const foreign = hooks.find((w) => w.event === "order.created" && w.url !== url);

if (foreign && !existing.length) {
  console.log(`Shopier allows one order.created webhook per account and it points to ${foreign.url}.`);
  console.log("That endpoint relays LoL orders here, so use its SHOPIER_WEBHOOK_TOKEN for this site too.");
  process.exit(0);
}

if (existing.length && !recreate) {
  console.log(`order.created webhook already registered for ${url}.`);
  console.log("Its token cannot be shown again. Run with --recreate if you lost SHOPIER_WEBHOOK_TOKEN.");
  process.exit(0);
}
for (const hook of existing) {
  await api(`/webhooks/${encodeURIComponent(hook.id)}`, { method: "DELETE" });
  console.log(`Deleted old webhook ${hook.id}`);
}

const created = await api("/webhooks", { method: "POST", body: JSON.stringify({ event: "order.created", url }) });
console.log(`Registered order.created -> ${url} (id ${created.id})`);

const envText = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const tokenLine = `SHOPIER_WEBHOOK_TOKEN=${created.token}`;
const nextEnv = /^\s*SHOPIER_WEBHOOK_TOKEN\s*=.*$/m.test(envText)
  ? envText.replace(/^\s*SHOPIER_WEBHOOK_TOKEN\s*=.*$/m, tokenLine)
  : `${envText.replace(/\s*$/, "")}\n${tokenLine}\n`;
writeFileSync(".env", nextEnv);
console.log("\nThe new signing token was saved to .env as SHOPIER_WEBHOOK_TOKEN (Shopier shows it only once).");
console.log("Copy that value into Vercel Environment Variables, then redeploy.");

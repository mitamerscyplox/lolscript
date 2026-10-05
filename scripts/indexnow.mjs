// Submits every sitemap URL to IndexNow (Bing, Yandex, and other participating engines).
// Run after deploying, once the key file is live:
//   node scripts/indexnow.mjs

import { readFileSync } from "node:fs";

const HOST = "www.lolscript.store";
const KEY = "d91ead421c7416b4ca79e30a2e34c519";

const sitemap = readFileSync("public/sitemap.xml", "utf8");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const keyCheck = await fetch(`https://${HOST}/${KEY}.txt`);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) {
  throw new Error(`Key file is not live at https://${HOST}/${KEY}.txt; deploy first.`);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
});
console.log(`IndexNow: HTTP ${res.status} for ${urlList.length} URLs`);
if (!res.ok) console.log(await res.text());

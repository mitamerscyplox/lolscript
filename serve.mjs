// Tiny static server for the mirrored LOLScript site.
// Handles extensionless routes (/lol-mmr-checker -> lol-mmr-checker.html),
// strips query strings, and serves checkout.php.
//
//   node serve.mjs            -> http://localhost:8080
//   node serve.mjs 3000       -> http://localhost:3000

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const BASE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(BASE, "public");
const API_DIR = join(BASE, "api");
const PORT = Number(process.argv[2]) || 8080;

// Load .env into process.env so the local API bridge can reach Sellhub.
(function loadEnv() {
  const envPath = join(BASE, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
})();

// Minimal Vercel-style res shim so api/*.js handlers run under the dev server.
function decorateRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => {
    if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(data));
    return res;
  };
  res.send = (data) => { res.end(data); return res; };
  return res;
}

async function readReqBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

// Mirrors the "rewrites" in vercel.json so /api/auth/login etc. reach the same function locally.
const REWRITES = (() => {
  try {
    return (JSON.parse(readFileSync(join(BASE, "vercel.json"), "utf8")).rewrites || []).map(({ source, destination }) => {
      const pattern = source
        .replace(/:(\w+)\(([^)]+)\)/g, "(?<$1>$2)")
        .replace(/:(\w+)\*/g, "(?<$1>.*)")
        .replace(/:(\w+)/g, "(?<$1>[^/]+)");
      return { re: new RegExp(`^${pattern}$`), destination };
    });
  } catch {
    return [];
  }
})();

function applyRewrite(url) {
  for (const { re, destination } of REWRITES) {
    const match = url.pathname.match(re);
    if (!match) continue;
    const target = new URL(destination.replace(/:(\w+)\*?/g, (_, name) => match.groups?.[name] ?? ""), url.origin);
    url.searchParams.forEach((value, key) => { if (!target.searchParams.has(key)) target.searchParams.set(key, value); });
    return target;
  }
  return url;
}

async function handleApi(pathname, req, res) {
  const name = pathname.replace(/^\/api\//, "").replace(/[^a-zA-Z0-9_-]/g, "");
  const file = join(API_DIR, `${name}.js`);
  if (!name || !file.startsWith(API_DIR) || !existsSync(file)) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }
  try {
    const mod = await import(`${pathToHref(file)}?t=${Date.now()}`);
    if (typeof mod.default !== "function") {
      const fn = mod[req.method];
      if (typeof fn !== "function") {
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.end("Method not allowed");
        return;
      }
      const raw = await readReqBody(req);
      const request = new Request(`http://localhost:${PORT}${req.url}`, {
        method: req.method,
        headers: Object.entries(req.headers).filter(([, v]) => typeof v === "string"),
        body: ["GET", "HEAD"].includes(req.method) ? undefined : raw,
      });
      const response = await fn(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    decorateRes(res);
    const rawBody = await readReqBody(req);
    let body = rawBody;
    if (rawBody && req.headers["content-type"]?.includes("application/json")) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = rawBody;
      }
    }
    const apiReq = Object.assign(req, { body });
    await mod.default(apiReq, res);
    if (!res.writableEnded) res.end();
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: String(error?.message || error) }));
  }
}

function pathToHref(p) {
  return "file:///" + p.replace(/\\/g, "/");
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".php": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

async function exists(p) {
  try { const s = await stat(p); return s.isFile(); } catch { return false; }
}

async function resolveFile(pathname) {
  // decode + strip leading slash, prevent path traversal
  let p = decodeURIComponent(pathname.split("?")[0]);
  p = normalize(p).replace(/^([/\\])+/, "");
  if (p === "" ) return join(ROOT, "index.html");

  const candidates = [
    join(ROOT, p),
    join(ROOT, p + ".html"),
    join(ROOT, p, "index.html"),
  ];
  for (const c of candidates) {
    if (!c.startsWith(ROOT + sep)) continue; // safety
    if (await exists(c)) return c;
  }
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname.startsWith("/api/")) {
      const target = applyRewrite(url);
      if (target !== url) req.url = target.pathname + target.search;
      await handleApi(target.pathname, req, res);
      return;
    }

    const file = await resolveFile(url.pathname);
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>404 Not Found</h1><p>" + url.pathname + "</p>");
      return;
    }
    const data = await readFile(file);
    const type = TYPES[extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    res.end(data);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("500: " + e.message);
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nPort ${PORT} is already in use - the dev server is probably already running.`);
    console.error(`Open http://localhost:${PORT} in your browser, or run "node serve.mjs 3000" to use another port.\n`);
    process.exit(0);
  }
  throw err;
});

// Loopback only: this dev server loads the real .env and trusts forwarded-IP headers.
server.listen(PORT, "127.0.0.1", () => {
  console.log(`LOLScript mirror serving at  http://localhost:${PORT}`);
  console.log(`Root: ${ROOT}`);
});

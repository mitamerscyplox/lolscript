/**
 * Tiny key-value store for rate limits and locks.
 * Uses Upstash Redis REST (Vercel KV / Upstash integration env vars) when configured,
 * otherwise falls back to per-instance memory (fine locally, weak on serverless).
 */

const memory = new Map();

function restConfig() {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim().replace(/\/+$/, "");
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  return url && token ? { url, token } : null;
}

export function isPersistentStore() {
  return Boolean(restConfig());
}

async function redis(command) {
  const cfg = restConfig();
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`KV ${data.error || res.status}`);
  return data.result;
}

function memGet(key) {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

export async function kvGet(key) {
  if (restConfig()) {
    const value = await redis(["GET", key]);
    return value == null ? null : String(value);
  }
  const value = memGet(key);
  return value == null ? null : String(value);
}

export async function kvIncr(key, ttlSeconds) {
  if (restConfig()) {
    const value = await redis(["INCR", key]);
    if (Number(value) === 1) await redis(["EXPIRE", key, ttlSeconds]);
    return Number(value);
  }
  const next = Number(memGet(key) || 0) + 1;
  const prev = memory.get(key);
  memory.set(key, { value: next, expiresAt: prev?.expiresAt || Date.now() + ttlSeconds * 1000 });
  return next;
}

/** Sets the key only if it does not exist. Returns true when the lock was acquired. */
export async function kvSetNx(key, value, ttlSeconds) {
  if (restConfig()) {
    const result = await redis(["SET", key, String(value), "NX", "EX", ttlSeconds]);
    return result === "OK";
  }
  if (memGet(key) != null) return false;
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return true;
}

export async function kvSet(key, value, ttlSeconds) {
  if (restConfig()) return redis(["SET", key, String(value), "EX", ttlSeconds]);
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return "OK";
}

/** Persistent write (no TTL) — for records like user accounts. */
export async function kvSetForever(key, value) {
  if (restConfig()) return redis(["SET", key, String(value)]);
  memory.set(key, { value: String(value), expiresAt: 0 });
  return "OK";
}

/** Persistent set-if-absent. Returns true when the key was created. */
export async function kvSetNxForever(key, value) {
  if (restConfig()) return (await redis(["SET", key, String(value), "NX"])) === "OK";
  if (memGet(key) != null) return false;
  memory.set(key, { value: String(value), expiresAt: 0 });
  return true;
}

/** Reads and deletes in one step, so a one-shot token cannot be used by two parallel requests. */
export async function kvGetDel(key) {
  if (restConfig()) {
    const value = await redis(["GETDEL", key]);
    return value == null ? null : String(value);
  }
  const value = memGet(key);
  memory.delete(key);
  return value == null ? null : String(value);
}

export async function kvDel(key) {
  if (restConfig()) return redis(["DEL", key]);
  memory.delete(key);
  return 1;
}

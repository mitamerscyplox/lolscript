/**
 * Customer accounts: scrypt password hashes, server-side sessions in KV (httpOnly cookie holds a random token),
 * email verification codes, password reset links, 2FA tickets and Google/Discord links.
 * Keys are prefixed with `ls:auth:` so a KV database shared with another store never mixes accounts.
 */

import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { isPersistentStore, kvDel, kvGet, kvGetDel, kvIncr, kvSet, kvSetForever, kvSetNxForever } from "./kv-store.mjs";

const PROD = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = PROD ? "__Host-ls_session" : "ls_session";
export const MFA_COOKIE = PROD ? "__Host-ls_mfa" : "ls_mfa";
export const OAUTH_COOKIE = PROD ? "__Host-ls_oauth" : "ls_oauth";
const SESSION_TTL_SEC = 60 * 60 * 24 * 30;
const MFA_TTL_SEC = 5 * 60;

const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

const scryptOpts = (n, r, p) => ({ N: n, r, p, maxmem: 256 * n * r });

function scrypt(password, salt, keylen, opts) {
  return new Promise((resolve, reject) => scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))));
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LEN, scryptOpts(SCRYPT_N, SCRYPT_R, SCRYPT_P));
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password, stored) {
  const [algo, n, r, p, saltB64, keyB64] = String(stored || "").split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, scryptOpts(Number(n), Number(r), Number(p)));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Burns the same CPU as a real check so response timing doesn't reveal whether an email exists. */
let dummyHash = null;
export async function verifyAgainstDummy(password) {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}

export function normalizeEmail(raw) {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

export function validatePassword(password, email) {
  if (typeof password !== "string") return "auth_err_password_length";
  if (password.length < 8 || password.length > 128) return "auth_err_password_length";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "auth_err_password_weak";
  if (password.toLowerCase() === email || password.toLowerCase() === email.split("@")[0]) return "auth_err_password_weak";
  return null;
}

/** Production must have Redis — the in-memory fallback would lose accounts between serverless instances. */
export function authStoreReady() {
  return isPersistentStore() || !PROD;
}

const userKey = (id) => `ls:auth:user:${id}`;
const emailKey = (email) => `ls:auth:email:${email}`;
const sessionKey = (tokenHash) => `ls:auth:session:${tokenHash}`;
const mfaKey = (tokenHash) => `ls:auth:mfa:${tokenHash}`;
const oauthKey = (provider, subject) => `ls:auth:oauth:${provider}:${subject}`;
const verifyKey = (userId) => `ls:auth:verify:${userId}`;
const resetKey = (tokenHash) => `ls:auth:reset:${tokenHash}`;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

export async function getUserById(id) {
  const raw = await kvGet(userKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getUserByEmail(email) {
  const id = await kvGet(emailKey(email));
  return id ? getUserById(id) : null;
}

/** Returns null when the email is already registered. */
export async function createUser(email, name, password) {
  const id = randomUUID();
  if (!(await kvSetNxForever(emailKey(email), id))) return null;
  const user = { id, email, name, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
  await kvSetForever(userKey(id), JSON.stringify(user));
  return user;
}

export async function saveUser(user) {
  await kvSetForever(userKey(user.id), JSON.stringify(user));
}

export function toPublicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    emailVerified: Boolean(u.emailVerifiedAt),
    hasPassword: u.passwordSet !== false,
    providers: u.providers ?? [],
    discordName: u.providers?.includes("discord") ? u.discordName || null : null,
    twoFactor: Boolean(u.totpEnabledAt),
    recoveryCodesLeft: u.totpEnabledAt ? u.recoveryCodes?.length ?? 0 : 0,
  };
}

/* ---------- cookies ---------- */

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers?.cookie || "").split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (name && !(name in out)) out[name] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

export function cookie(name, value, maxAge) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    ...(PROD ? ["Secure"] : []),
  ].join("; ");
}

export const sessionCookie = (token, maxAge = SESSION_TTL_SEC) => cookie(SESSION_COOKIE, token, maxAge);
export const mfaCookie = (token, maxAge = MFA_TTL_SEC) => cookie(MFA_COOKIE, token, maxAge);

/* ---------- sessions ---------- */

export async function createSession(user) {
  const token = randomBytes(32).toString("base64url");
  await kvSet(sessionKey(hashToken(token)), `${user.id}.${user.sessionVersion ?? 0}`, SESSION_TTL_SEC);
  return token;
}

export async function destroySession(token) {
  if (token) await kvDel(sessionKey(hashToken(token)));
}

/** Signed-in user from the session cookie; sessions from before a password change are rejected. */
export async function getCurrentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token || token.length > 100) return null;
  const value = await kvGet(sessionKey(hashToken(token)));
  if (!value) return null;
  const [userId, version] = value.split(".");
  const user = await getUserById(userId);
  if (!user || Number(version) !== (user.sessionVersion ?? 0)) return null;
  return user;
}

/* ---------- two-factor login ticket ---------- */

/** First factor passed: returns a short-lived ticket (sent as an httpOnly cookie) that only the 2FA step accepts. */
export async function issueMfaTicket(user) {
  const token = randomBytes(32).toString("base64url");
  await kvSet(mfaKey(hashToken(token)), `${user.id}.${user.sessionVersion ?? 0}`, MFA_TTL_SEC);
  return token;
}

export async function readMfaTicket(token) {
  if (!token || token.length > 100) return null;
  const value = await kvGet(mfaKey(hashToken(token)));
  if (!value) return null;
  const [userId, version] = value.split(".");
  const user = await getUserById(userId);
  return user && Number(version) === (user.sessionVersion ?? 0) && user.totpEnabledAt ? user : null;
}

export async function burnMfaTicket(token) {
  await kvDel(mfaKey(hashToken(token)));
}

/* ---------- Google / Discord ---------- */

/** Attaches a provider identity to an already signed-in user. */
export async function linkOAuthToUser(user, provider, subject, displayName) {
  const owner = await kvGet(oauthKey(provider, subject));
  if (owner && owner !== user.id) return "taken";
  const previous = user.oauthSubjects?.[provider];
  if (previous && previous !== subject) await kvDel(oauthKey(provider, previous));
  user.providers = [...new Set([...(user.providers ?? []), provider])];
  user.oauthSubjects = { ...user.oauthSubjects, [provider]: subject };
  if (provider === "discord") user.discordName = displayName.slice(0, 40);
  await saveUser(user);
  await kvSetForever(oauthKey(provider, subject), user.id);
  return "ok";
}

/** Refuses to remove the last way to sign in. */
export async function unlinkOAuth(user, provider) {
  const remaining = (user.providers ?? []).filter((p) => p !== provider);
  if (user.passwordSet === false && remaining.length === 0) return "last_method";
  const subject = user.oauthSubjects?.[provider];
  if (subject) await kvDel(oauthKey(provider, subject));
  user.providers = remaining;
  if (user.oauthSubjects) delete user.oauthSubjects[provider];
  if (provider === "discord") delete user.discordName;
  await saveUser(user);
  return "ok";
}

/**
 * The real owner of an address is taking over an account that was never verified. Whoever pre-registered it
 * may have attached their own Google/Discord identity or 2FA, so every sign-in method except the caller's
 * is removed and all sessions are revoked.
 */
export async function claimUnverifiedAccount(user) {
  for (const [provider, subject] of Object.entries(user.oauthSubjects ?? {})) {
    if (subject && (await kvGet(oauthKey(provider, subject))) === user.id) await kvDel(oauthKey(provider, subject));
  }
  user.providers = [];
  user.oauthSubjects = {};
  delete user.discordName;
  delete user.totpSecret;
  delete user.totpEnabledAt;
  delete user.totpLastStep;
  delete user.recoveryCodes;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
}

/**
 * Signs in through a provider that vouched for the email. Links to an existing account with the same email;
 * if that account was never verified, it is claimed first (see claimUnverifiedAccount) and its password is
 * replaced so whoever pre-registered the address can't share the real owner's account.
 */
export async function upsertOAuthUser(provider, subject, email, name) {
  const linkedId = await kvGet(oauthKey(provider, subject));
  let user = linkedId ? await getUserById(linkedId) : null;
  if (!user) user = await getUserByEmail(email);

  if (!user) {
    const id = randomUUID();
    if (!(await kvSetNxForever(emailKey(email), id))) return null;
    user = {
      id,
      email,
      name,
      passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
      passwordSet: false,
      createdAt: new Date().toISOString(),
      emailVerifiedAt: new Date().toISOString(),
      providers: [provider],
    };
  } else {
    if (!user.emailVerifiedAt) {
      if (user.email !== email) return null;
      await claimUnverifiedAccount(user);
      user.passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
      user.passwordSet = false;
      user.emailVerifiedAt = new Date().toISOString();
    }
    if (!user.providers?.includes(provider)) user.providers = [...(user.providers ?? []), provider];
  }
  const previous = user.oauthSubjects?.[provider];
  if (previous && previous !== subject) await kvDel(oauthKey(provider, previous));
  user.oauthSubjects = { ...user.oauthSubjects, [provider]: subject };
  if (provider === "discord") user.discordName = name.slice(0, 40);
  await saveUser(user);
  await kvSetForever(oauthKey(provider, subject), user.id);
  return user;
}

/* ---------- request guards ---------- */

export function clientIp(req) {
  return (
    String(req.headers?.["x-real-ip"] || "").trim() ||
    String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/** Rejects cross-site form posts: the Origin must match the host serving the request. */
export function sameOrigin(req) {
  const origin = req.headers?.origin;
  const host = req.headers?.["x-forwarded-host"] || req.headers?.host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Fixed-window counter; returns false once `limit` hits within `windowSec`. */
export async function allowAttempt(bucket, limit, windowSec) {
  return (await kvIncr(`ls:auth:rl:${bucket}`, windowSec)) <= limit;
}

export async function clearAttempts(bucket) {
  await kvDel(`ls:auth:rl:${bucket}`);
}

/* ---------- email verification ---------- */

const VERIFY_TTL_SEC = 15 * 60;

/** Stores a fresh 6-digit email code (hashed) for the user and returns it for mailing. */
export async function issueVerifyCode(userId) {
  const code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
  await kvSet(verifyKey(userId), hashToken(code), VERIFY_TTL_SEC);
  await clearAttempts(`verify:${userId}`);
  return code;
}

const VERIFY_DAILY_GUESSES = 10;
const verifyDayBucket = (userId) => `verify-day:${userId}`;

/**
 * Five wrong guesses burn the code, and a daily cap that resending does not reset keeps the
 * 10^6 space out of reach over weeks of retries.
 */
export async function checkVerifyCode(userId, raw) {
  const stored = await kvGet(verifyKey(userId));
  if (!stored) return "expired";
  if (Number((await kvGet(`ls:auth:rl:${verifyDayBucket(userId)}`)) || 0) >= VERIFY_DAILY_GUESSES) {
    await kvDel(verifyKey(userId));
    return "locked";
  }
  const code = typeof raw === "string" ? raw.replace(/\D/g, "") : "";
  const a = Buffer.from(hashToken(code), "hex");
  const b = Buffer.from(stored, "hex");
  if (code.length === 6 && a.length === b.length && timingSafeEqual(a, b)) {
    await kvDel(verifyKey(userId));
    await clearAttempts(`verify:${userId}`);
    return "ok";
  }
  const underDailyCap = await allowAttempt(verifyDayBucket(userId), VERIFY_DAILY_GUESSES, 24 * 60 * 60);
  if (!underDailyCap || !(await allowAttempt(`verify:${userId}`, 4, VERIFY_TTL_SEC))) {
    await kvDel(verifyKey(userId));
    return "locked";
  }
  return "invalid";
}

/* ---------- password reset ---------- */

const RESET_TTL_SEC = 30 * 60;

export async function issueResetToken(user) {
  const token = randomBytes(32).toString("base64url");
  await kvSet(resetKey(hashToken(token)), `${user.id}.${user.sessionVersion ?? 0}`, RESET_TTL_SEC);
  return token;
}

/** One-shot: the token is deleted on use and dies with any later password change. */
export async function consumeResetToken(token) {
  if (typeof token !== "string" || !token || token.length > 100) return null;
  const value = await kvGetDel(resetKey(hashToken(token)));
  if (!value) return null;
  const [userId, version] = value.split(".");
  const user = await getUserById(userId);
  if (!user || Number(version) !== (user.sessionVersion ?? 0)) return null;
  return user;
}

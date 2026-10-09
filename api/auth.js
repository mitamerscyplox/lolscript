import { createHash, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { getOrdersForEmail } from "./_lib/account-orders.mjs";
import {
  MFA_COOKIE,
  OAUTH_COOKIE,
  SESSION_COOKIE,
  allowAttempt,
  authStoreReady,
  burnMfaTicket,
  checkVerifyCode,
  claimUnverifiedAccount,
  clearAttempts,
  clientIp,
  consumeResetToken,
  cookie,
  createSession,
  createUser,
  destroySession,
  getCurrentUser,
  getUserByEmail,
  hashPassword,
  issueMfaTicket,
  linkOAuthToUser,
  mfaCookie,
  normalizeEmail,
  parseCookies,
  readMfaTicket,
  sameOrigin,
  saveUser,
  sessionCookie,
  toPublicUser,
  unlinkOAuth,
  upsertOAuthUser,
  validatePassword,
  verifyAgainstDummy,
  verifyPassword,
} from "./_lib/auth.mjs";
import { sendResetMail, sendVerifyCodeMail } from "./_lib/auth-mail.mjs";
import { kvDel, kvGet, kvSet, kvSetNx } from "./_lib/kv-store.mjs";
import { mailerReady } from "./_lib/mailer.mjs";
import { authorizeUrl, createPkce, enabledOAuthProviders, exchangeCode, isOAuthProvider, oauthEnabled } from "./_lib/oauth.mjs";
import { turnstileSiteKey, verifyTurnstile } from "./_lib/turnstile.mjs";
import { consumeRecoveryCode, generateRecoveryCodes, generateTotpSecret, otpauthUri, verifyTotp } from "./_lib/totp.mjs";

/**
 * Every /api/auth/* and /api/account/* endpoint in one function (vercel.json rewrites them here),
 * keeping the deployment under the serverless function limit.
 */

const PROD = process.env.NODE_ENV === "production";

function send(res, status, data, cookies = []) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  if (cookies.length) res.setHeader("Set-Cookie", cookies);
  res.end(JSON.stringify(data));
}

const fail = (res, error, status = 400) => send(res, status, { error });

function redirect(res, location, cookies = []) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.setHeader("Cache-Control", "no-store");
  if (cookies.length) res.setHeader("Set-Cookie", cookies);
  res.end();
}

async function body(req) {
  if (req.body != null && typeof req.body === "object") return req.body;
  let raw = typeof req.body === "string" ? req.body : "";
  if (req.body == null) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    raw = Buffer.concat(chunks).toString("utf8");
  }
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function requestUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const proto = String(req.headers["x-forwarded-proto"] || (PROD ? "https" : "http")).split(",")[0];
  return new URL(req.url || "/", `${proto}://${host}`);
}

function routeOf(req, url) {
  let route = url.searchParams.get("route") || req.query?.route;
  if (Array.isArray(route)) route = route.join("/");
  if (!route) {
    const m = url.pathname.match(/^\/api\/(auth|account)\/(.+)$/);
    if (m) route = m[1] === "account" ? `account/${m[2]}` : m[2];
  }
  return String(route || "").replace(/^\/+|\/+$/g, "");
}

/** Same-site path only; backslashes and control characters are rejected because browsers turn "/\evil.com" into "//evil.com". */
function safeNext(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.length > 300 || /[\\\x00-\x1f\x7f]/.test(raw)) return "";
  try {
    const u = new URL(raw, "https://same.invalid");
    return u.origin === "https://same.invalid" ? u.pathname + u.search + u.hash : "";
  } catch {
    return "";
  }
}

/** Atomically marks a TOTP step or recovery code as spent so two parallel requests can't both use it. */
const spendOnce = (userId, what) => kvSetNx(`ls:auth:spent:${userId}:${what}`, 1, 10 * 60);
const codeTag = (code) => createHash("sha256").update(String(code).toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex").slice(0, 32);

/* ---------- handlers ---------- */

async function me(req, res) {
  const user = await getCurrentUser(req).catch(() => null);
  send(res, 200, { user: user ? toPublicUser(user) : null, providers: enabledOAuthProviders(), captcha: turnstileSiteKey() });
}

async function register(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  if (!authStoreReady()) return fail(res, "auth_err_unavailable", 503);
  const b = await body(req);
  if (!b) return fail(res, "auth_err_generic");
  if (typeof b.website === "string" && b.website) return fail(res, "auth_err_generic");
  if (!(await allowAttempt(`register:ip:${clientIp(req)}`, 5, 60 * 60))) return fail(res, "auth_err_rate_limited", 429);
  if (!(await verifyTurnstile(b.captcha, clientIp(req), "register"))) return fail(res, "auth_err_captcha");

  const email = normalizeEmail(b.email);
  if (!email) return fail(res, "auth_err_email");
  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ").slice(0, 40) : "";
  if (name.length < 2) return fail(res, "auth_err_name");
  const pwError = validatePassword(b.password, email);
  if (pwError) return fail(res, pwError);

  const user = await createUser(email, name, b.password);
  if (!user) return fail(res, "auth_err_email_taken", 409);

  if (mailerReady() && (await kvSetNx(`ls:auth:verify-cooldown:${user.id}`, 1, 60))) {
    await sendVerifyCodeMail(user).catch(() => false);
  }
  send(res, 200, { user: toPublicUser(user) }, [sessionCookie(await createSession(user))]);
}

async function login(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  if (!authStoreReady()) return fail(res, "auth_err_unavailable", 503);
  const b = await body(req);
  if (!b) return fail(res, "auth_err_generic");
  if (typeof b.website === "string" && b.website) return fail(res, "auth_err_invalid", 401);
  if (!(await allowAttempt(`login:ip:${clientIp(req)}`, 20, 15 * 60))) return fail(res, "auth_err_rate_limited", 429);
  if (!(await verifyTurnstile(b.captcha, clientIp(req), "login"))) return fail(res, "auth_err_captcha");

  const email = normalizeEmail(b.email);
  const password = typeof b.password === "string" ? b.password : "";
  if (!email || !password || password.length > 128) return fail(res, "auth_err_invalid", 401);
  // Keyed by email+IP so a stranger can't lock the owner out; the looser email-only cap still stops distributed guessing.
  const emailIpKey = `login:email-ip:${email}:${clientIp(req)}`;
  if (!(await allowAttempt(emailIpKey, 8, 15 * 60))) return fail(res, "auth_err_rate_limited", 429);
  if (!(await allowAttempt(`login:email:${email}`, 60, 60 * 60))) return fail(res, "auth_err_rate_limited", 429);

  const user = await getUserByEmail(email);
  if (!user) {
    await verifyAgainstDummy(password);
    return fail(res, "auth_err_invalid", 401);
  }
  if (!(await verifyPassword(password, user.passwordHash))) return fail(res, "auth_err_invalid", 401);

  await clearAttempts(emailIpKey);
  if (user.totpEnabledAt) return send(res, 200, { mfa: true }, [mfaCookie(await issueMfaTicket(user))]);
  send(res, 200, { user: toPublicUser(user) }, [sessionCookie(await createSession(user))]);
}

async function logout(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  await destroySession(parseCookies(req)[SESSION_COOKIE]);
  send(res, 200, { ok: true }, [sessionCookie("", 0)]);
}

/** Always answers the same way so the form can't be used to probe which emails are registered. */
async function forgot(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  if (!authStoreReady()) return fail(res, "auth_err_unavailable", 503);
  if (!mailerReady()) return fail(res, "auth_err_mail_unavailable", 503);
  const b = await body(req);
  if (!b) return fail(res, "auth_err_generic");
  if (typeof b.website === "string" && b.website) return send(res, 200, { ok: true });
  if (!(await allowAttempt(`forgot:ip:${clientIp(req)}`, 8, 60 * 60))) return fail(res, "auth_err_rate_limited", 429);
  if (!(await verifyTurnstile(b.captcha, clientIp(req), "forgot"))) return fail(res, "auth_err_captcha");

  const email = normalizeEmail(b.email);
  if (!email) return fail(res, "auth_err_email");
  if (await allowAttempt(`forgot:email:${email}`, 3, 60 * 60)) {
    const user = await getUserByEmail(email);
    if (user) await sendResetMail(user, PROD ? undefined : req.headers.origin);
  }
  send(res, 200, { ok: true });
}

async function reset(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  if (!(await allowAttempt(`reset:ip:${clientIp(req)}`, 10, 60 * 60))) return fail(res, "auth_err_rate_limited", 429);
  const b = await body(req);
  if (!b) return fail(res, "auth_err_generic");
  if (typeof b.password !== "string" || b.password.length < 8 || b.password.length > 128) return fail(res, "auth_err_password_length");

  const user = await consumeResetToken(b.token);
  if (!user) return fail(res, "reset_err_token", 410);
  const pwError = validatePassword(b.password, user.email);
  if (pwError) return fail(res, pwError);

  if (!user.emailVerifiedAt) {
    await claimUnverifiedAccount(user);
    user.emailVerifiedAt = new Date().toISOString();
  } else {
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  }
  user.passwordHash = await hashPassword(b.password);
  user.passwordSet = true;
  await saveUser(user);

  if (user.totpEnabledAt) return send(res, 200, { ok: true, mfa: true }, [mfaCookie(await issueMfaTicket(user))]);
  send(res, 200, { ok: true }, [sessionCookie(await createSession(user))]);
}

async function verifySend(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  const user = await getCurrentUser(req);
  if (!user) return fail(res, "auth_err_session", 401);
  if (user.emailVerifiedAt) return send(res, 200, { ok: true, verified: true });
  if (!mailerReady()) return fail(res, "auth_err_mail_unavailable", 503);
  if (!(await kvSetNx(`ls:auth:verify-cooldown:${user.id}`, 1, 60))) return fail(res, "verify_err_cooldown", 429);
  if (!(await allowAttempt(`verify-send:${user.id}`, 6, 60 * 60))) return fail(res, "auth_err_rate_limited", 429);
  if (!(await allowAttempt(`verify-send-day:${user.email}`, 10, 24 * 60 * 60))) return fail(res, "auth_err_rate_limited", 429);
  if (!(await sendVerifyCodeMail(user))) return fail(res, "auth_err_mail_unavailable", 503);
  send(res, 200, { ok: true });
}

const VERIFY_ERRORS = { invalid: "verify_err_invalid", expired: "verify_err_expired", locked: "verify_err_locked" };

async function verifyConfirm(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  const user = await getCurrentUser(req);
  if (!user) return fail(res, "auth_err_session", 401);
  if (user.emailVerifiedAt) return send(res, 200, { user: toPublicUser(user) });
  const b = await body(req);
  const result = await checkVerifyCode(user.id, b?.code);
  if (result !== "ok") return fail(res, VERIFY_ERRORS[result], result === "invalid" ? 400 : 410);
  user.emailVerifiedAt = new Date().toISOString();
  await saveUser(user);
  send(res, 200, { user: toPublicUser(user) });
}

/** Changes the password (or, with `signOutEverywhere`, only rotates sessions) and revokes every other session. */
async function password(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  const user = await getCurrentUser(req);
  if (!user) return fail(res, "auth_err_session", 401);
  const b = await body(req);
  if (!b) return fail(res, "auth_err_generic");
  if (!(await allowAttempt(`password:${user.id}`, 6, 15 * 60))) return fail(res, "auth_err_rate_limited", 429);

  // Google/Discord-only accounts have no password to confirm yet; the session alone authorizes the first one.
  if (user.passwordSet !== false) {
    const current = typeof b.currentPassword === "string" ? b.currentPassword : "";
    if (!current || current.length > 128 || !(await verifyPassword(current, user.passwordHash))) {
      return fail(res, "auth_err_current_password", 401);
    }
  }
  if (b.signOutEverywhere !== true) {
    const pwError = validatePassword(b.newPassword, user.email);
    if (pwError) return fail(res, pwError);
    user.passwordHash = await hashPassword(b.newPassword);
    user.passwordSet = true;
  }
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await saveUser(user);
  send(res, 200, { ok: true }, [sessionCookie(await createSession(user))]);
}

async function profile(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  const user = await getCurrentUser(req);
  if (!user) return fail(res, "auth_err_session", 401);
  if (!(await allowAttempt(`profile:${user.id}`, 10, 15 * 60))) return fail(res, "auth_err_rate_limited", 429);
  const b = await body(req);
  const name = typeof b?.name === "string" ? b.name.trim().replace(/\s+/g, " ").slice(0, 40) : "";
  if (name.length < 2) return fail(res, "auth_err_name");
  user.name = name;
  await saveUser(user);
  send(res, 200, { user: toPublicUser(user) });
}

async function unlink(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  const user = await getCurrentUser(req);
  if (!user) return fail(res, "auth_err_session", 401);
  const b = await body(req);
  const provider = b?.provider || "";
  if (!isOAuthProvider(provider)) return fail(res, "auth_err_generic");
  if ((await unlinkOAuth(user, provider)) === "last_method") return fail(res, "account_err_last_method", 409);
  send(res, 200, { user: toPublicUser(user) });
}

const pendingTotpKey = (userId) => `ls:auth:totp-pending:${userId}`;

async function confirmPassword(user, b) {
  if (user.passwordSet === false) return null;
  const pw = typeof b.password === "string" ? b.password : "";
  return pw && pw.length <= 128 && (await verifyPassword(pw, user.passwordHash)) ? null : "auth_err_current_password";
}

/** Checks a TOTP or recovery code and burns it; returns false when invalid or already spent. */
async function useSecondFactor(user, code) {
  const step = verifyTotp(user.totpSecret || "", code, user.totpLastStep);
  if (step !== null) {
    if (!(await spendOnce(user.id, `totp:${step}`))) return false;
    user.totpLastStep = step;
    return true;
  }
  const remaining = consumeRecoveryCode(user.recoveryCodes, code);
  if (!remaining || !(await spendOnce(user.id, `rc:${codeTag(code)}`))) return false;
  user.recoveryCodes = remaining;
  return true;
}

/** Disabling or regenerating needs proof of both factors the account has. */
async function confirmFactors(user, b) {
  const pwError = await confirmPassword(user, b);
  if (pwError) return pwError;
  return (await useSecondFactor(user, b.code)) ? null : "mfa_err_invalid";
}

async function twoFactor(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  const user = await getCurrentUser(req);
  if (!user) return fail(res, "auth_err_session", 401);
  const b = await body(req);
  if (!b) return fail(res, "auth_err_generic");
  if (!(await allowAttempt(`2fa:${user.id}`, 12, 15 * 60))) return fail(res, "auth_err_rate_limited", 429);

  switch (b.action) {
    case "setup": {
      if (user.totpEnabledAt) return fail(res, "mfa_err_already_on", 409);
      if (!user.emailVerifiedAt) return fail(res, "mfa_err_unverified", 403);
      const pwError = await confirmPassword(user, b);
      if (pwError) return fail(res, pwError, 401);
      const secret = generateTotpSecret();
      await kvSet(pendingTotpKey(user.id), secret, 15 * 60);
      const uri = otpauthUri(secret, user.email);
      const qr = await QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b0712", light: "#ffffff" } });
      return send(res, 200, { secret, uri, qr });
    }
    case "enable": {
      if (user.totpEnabledAt) return fail(res, "mfa_err_already_on", 409);
      if (!user.emailVerifiedAt) return fail(res, "mfa_err_unverified", 403);
      const secret = await kvGet(pendingTotpKey(user.id));
      if (!secret) return fail(res, "mfa_err_setup_expired", 410);
      const step = verifyTotp(secret, b.code);
      if (step === null) return fail(res, "mfa_err_invalid", 401);
      const { codes, hashes } = generateRecoveryCodes();
      user.totpSecret = secret;
      user.totpEnabledAt = new Date().toISOString();
      user.totpLastStep = step;
      user.recoveryCodes = hashes;
      user.sessionVersion = (user.sessionVersion ?? 0) + 1;
      await saveUser(user);
      await kvDel(pendingTotpKey(user.id));
      return send(res, 200, { user: toPublicUser(user), recoveryCodes: codes }, [sessionCookie(await createSession(user))]);
    }
    case "disable": {
      if (!user.totpEnabledAt) return send(res, 200, { user: toPublicUser(user) });
      const err = await confirmFactors(user, b);
      if (err) return fail(res, err, 401);
      delete user.totpSecret;
      delete user.totpEnabledAt;
      delete user.totpLastStep;
      delete user.recoveryCodes;
      await saveUser(user);
      return send(res, 200, { user: toPublicUser(user) });
    }
    case "regenerate": {
      if (!user.totpEnabledAt) return fail(res, "mfa_err_not_on", 409);
      const err = await confirmFactors(user, b);
      if (err) return fail(res, err, 401);
      const { codes, hashes } = generateRecoveryCodes();
      user.recoveryCodes = hashes;
      await saveUser(user);
      return send(res, 200, { user: toPublicUser(user), recoveryCodes: codes });
    }
    default:
      return fail(res, "auth_err_generic");
  }
}

/** Second login step: TOTP code or a single-use recovery code, against the ticket cookie from step one. */
async function twoFactorVerify(req, res) {
  if (!sameOrigin(req)) return fail(res, "auth_err_generic", 403);
  const ticket = parseCookies(req)[MFA_COOKIE];
  const user = await readMfaTicket(ticket);
  if (!ticket || !user) return fail(res, "mfa_err_expired", 401);

  if (!(await allowAttempt(`mfa:ip:${clientIp(req)}`, 20, 15 * 60))) return fail(res, "auth_err_rate_limited", 429);
  if (!(await allowAttempt(`mfa:user:${user.id}`, 6, 15 * 60))) {
    await burnMfaTicket(ticket);
    return fail(res, "auth_err_rate_limited", 429);
  }

  const b = await body(req);
  if (!(await useSecondFactor(user, b?.code))) return fail(res, "mfa_err_invalid", 401);
  await saveUser(user);
  await burnMfaTicket(ticket);
  send(res, 200, { user: toPublicUser(user) }, [sessionCookie(await createSession(user)), mfaCookie("", 0)]);
}

async function oauthStart(req, res, url, provider) {
  const loginUrl = (error) => `/login?oauth_error=${error}`;
  if (!isOAuthProvider(provider) || !oauthEnabled(provider)) return redirect(res, loginUrl("unavailable"));
  if (!authStoreReady()) return redirect(res, loginUrl("unavailable"));
  if (!(await allowAttempt(`oauth:ip:${clientIp(req)}`, 30, 10 * 60))) return redirect(res, loginUrl("rate_limited"));

  let linkUserId = "";
  if (url.searchParams.get("link") === "1") {
    const user = await getCurrentUser(req).catch(() => null);
    if (!user) return redirect(res, loginUrl("state"));
    if (!user.emailVerifiedAt) return redirect(res, `/account?tab=${provider === "discord" ? "discord" : "settings"}&link=unverified`);
    linkUserId = user.id;
  }

  const { state, verifier, challenge } = createPkce();
  const pending = Buffer.from(
    JSON.stringify({ s: state, v: verifier, p: provider, n: safeNext(url.searchParams.get("next")), k: linkUserId })
  ).toString("base64url");
  redirect(res, authorizeUrl(provider, url.origin, state, challenge), [cookie(OAUTH_COOKIE, pending, 10 * 60)]);
}

function readPending(raw) {
  if (!raw || raw.length > 2000) return null;
  try {
    const data = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return typeof data.s === "string" && typeof data.v === "string" ? data : null;
  } catch {
    return null;
  }
}

const sameState = (a, b) => a.length === b.length && a.length > 0 && timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function oauthCallback(req, res, url, provider) {
  const pending = readPending(parseCookies(req)[OAUTH_COOKIE]);
  const clear = cookie(OAUTH_COOKIE, "", 0);
  const done = (location, extra = []) => redirect(res, location, [clear, ...extra]);
  const failTo = (error) => done(`/login?oauth_error=${error}`);

  if (!isOAuthProvider(provider) || !oauthEnabled(provider)) return failTo("unavailable");
  const q = url.searchParams;
  if (q.get("error")) return failTo("cancelled");
  const code = q.get("code") || "";
  if (!pending || pending.p !== provider || !code || !sameState(pending.s, q.get("state") || "")) return failTo("state");

  const profileData = await exchangeCode(provider, url.origin, code, pending.v).catch(() => null);

  if (pending.k) {
    const accountUrl = (result) => done(`/account?tab=${provider === "discord" ? "discord" : "settings"}&link=${result}`);
    const current = await getCurrentUser(req).catch(() => null);
    if (!current || current.id !== pending.k) return failTo("state");
    if (!profileData) return accountUrl("failed");
    const linked = await linkOAuthToUser(current, provider, profileData.subject, profileData.name || provider);
    return accountUrl(linked === "ok" ? `${provider}_ok` : "taken");
  }

  if (!profileData) return failTo("failed");
  const email = normalizeEmail(profileData.email);
  if (!email) return failTo("no_email");
  if (!profileData.emailVerified) return failTo("unverified_email");

  const name = (profileData.name.trim() || email.split("@")[0]).slice(0, 40);
  const user = await upsertOAuthUser(provider, profileData.subject, email, name.length >= 2 ? name : email.split("@")[0].slice(0, 40));
  if (!user) return failTo("failed");

  if (user.totpEnabledAt) {
    const next = pending.n ? `&next=${encodeURIComponent(pending.n)}` : "";
    return done(`/login?mfa=1${next}`, [mfaCookie(await issueMfaTicket(user))]);
  }
  done(pending.n || "/account", [sessionCookie(await createSession(user))]);
}

async function accountOrders(req, res, url) {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) return fail(res, "auth_err_session", 401);
  if (!user.emailVerifiedAt) return fail(res, "orders_err_unverified", 403);
  if (!(await allowAttempt(`orders:${user.id}`, 40, 10 * 60))) return fail(res, "auth_err_rate_limited", 429);
  const { orders, error } = await getOrdersForEmail(user.email, url.searchParams.get("fresh") === "1");
  if (error) return fail(res, "orders_err_load", 502);
  send(res, 200, { orders });
}

const POST_ROUTES = {
  register,
  login,
  logout,
  forgot,
  reset,
  "verify/send": verifySend,
  "verify/confirm": verifyConfirm,
  password,
  profile,
  unlink,
  "2fa": twoFactor,
  "2fa/verify": twoFactorVerify,
};

export default async function handler(req, res) {
  const url = requestUrl(req);
  const route = routeOf(req, url);
  try {
    if (req.method === "GET") {
      if (route === "me") return await me(req, res);
      if (route === "account/orders") return await accountOrders(req, res, url);
      const oauth = route.match(/^oauth\/([a-z]+)(\/callback)?$/);
      if (oauth) return await (oauth[2] ? oauthCallback : oauthStart)(req, res, url, oauth[1]);
    } else if (req.method === "POST" && POST_ROUTES[route]) {
      return await POST_ROUTES[route](req, res);
    }
    return fail(res, "not_found", 404);
  } catch (error) {
    console.error(`[auth] ${route} crashed`, error);
    return fail(res, "auth_err_generic", 500);
  }
}

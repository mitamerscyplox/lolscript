/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) compatible with Google Authenticator, Authy and 1Password. */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD = 30;

export function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input) {
  const clean = input.replace(/[\s=-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const generateTotpSecret = () => base32Encode(randomBytes(20));

function hotp(secret, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const offset = mac[mac.length - 1] & 15;
  const bin = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(bin).padStart(6, "0");
}

/**
 * Returns the matched time step (for replay protection) or null. Accepts ±1 step of clock drift and
 * rejects any step at or before `lastStep`, so a code can't be used twice.
 */
export function verifyTotp(secret, raw, lastStep = 0) {
  const code = typeof raw === "string" ? raw.replace(/\D/g, "") : "";
  if (code.length !== 6 || !secret) return null;
  const now = Math.floor(Date.now() / 1000 / PERIOD);
  for (const step of [now - 1, now, now + 1]) {
    if (step <= lastStep) continue;
    if (timingSafeEqual(Buffer.from(hotp(secret, step)), Buffer.from(code))) return step;
  }
  return null;
}

export function otpauthUri(secret, email) {
  const label = encodeURIComponent(`LOLScript:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=LOLScript&algorithm=SHA1&digits=6&period=${PERIOD}`;
}

const hashCode = (code) => createHash("sha256").update(code.replace(/[\s-]/g, "").toUpperCase()).digest("hex");

/** Ten single-use recovery codes; only their hashes are stored. */
export function generateRecoveryCodes() {
  const codes = Array.from({ length: 10 }, () => {
    const raw = base32Encode(randomBytes(5)).slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
  return { codes, hashes: codes.map(hashCode) };
}

/** Returns the remaining hashes when `raw` matches one, otherwise null. */
export function consumeRecoveryCode(hashes, raw) {
  if (!hashes?.length || typeof raw !== "string") return null;
  const clean = raw.replace(/[\s-]/g, "").toUpperCase();
  if (clean.length !== 8) return null;
  const target = Buffer.from(hashCode(clean), "hex");
  const idx = hashes.findIndex((h) => {
    const b = Buffer.from(h, "hex");
    return b.length === target.length && timingSafeEqual(b, target);
  });
  return idx < 0 ? null : hashes.filter((_, i) => i !== idx);
}

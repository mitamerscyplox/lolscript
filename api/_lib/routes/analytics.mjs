// Lightweight no-op analytics sink so the front-end beacons don't 404.
// Swap the body for a real store (KV, Upstash, log drain) whenever you want.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(204).end();
}

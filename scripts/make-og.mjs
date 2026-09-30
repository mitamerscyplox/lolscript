// Converts the branded 1200x630 OG SVGs into PNG files used for social previews.
//   node scripts/make-og.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "assets", "og");

const jobs = [
  ["og-home.svg", "home.png"],
  ["og-lol-script.svg", "lol-script.png"],
  ["og-lol-vanguard-emulator.svg", "lol-vanguard-emulator.png"],
  ["og-lol-perm-spoofer.svg", "lol-perm-spoofer.png"],
];

for (const [src, out] of jobs) {
  const svg = await readFile(join(here, src));
  await sharp(svg, { density: 200 })
    .resize(1200, 630, { fit: "cover" })
    .png({ quality: 90 })
    .toFile(join(outDir, out));
  console.log("wrote", out);
}

// One-off image optimizer. Run: node scripts/optimize-images.mjs
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "assets", "image");

const jobs = [
  { file: "logo.png", maxWidth: 512, format: "png" },
  { file: "order.webp", maxWidth: 1200, format: "webp", quality: 72 },
  { file: "hero-image.webp", maxWidth: 1100, format: "webp", quality: 78 },
  { file: "hero-bg.png", maxWidth: 1920, format: "png" },
  { file: "blog-bg.png", maxWidth: 1200, format: "png" },
];

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

for (const job of jobs) {
  const path = join(ROOT, job.file);
  let buf;
  try {
    buf = await readFile(path);
  } catch {
    console.log(`skip (missing): ${job.file}`);
    continue;
  }
  const before = buf.length;

  const meta = await sharp(buf).metadata();
  let pipeline = sharp(buf).rotate();
  if (meta.width && meta.width > job.maxWidth) {
    pipeline = pipeline.resize({ width: job.maxWidth, withoutEnlargement: true });
  }

  if (job.format === "png") {
    pipeline = pipeline.png({ compressionLevel: 9, palette: true, quality: 90, effort: 8 });
  } else if (job.format === "webp") {
    pipeline = pipeline.webp({ quality: job.quality ?? 75, effort: 6 });
  }

  const out = await pipeline.toBuffer();
  if (out.length < before) {
    await writeFile(path, out);
    console.log(`${job.file}: ${kb(before)} -> ${kb(out.length)}`);
  } else {
    console.log(`${job.file}: kept original (${kb(before)}; optimized ${kb(out.length)} was larger)`);
  }
}

console.log("done");

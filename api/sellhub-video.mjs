export function isEmbedVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  if (!u) return false;
  const lower = u.toLowerCase();
  if (/^streamable:[a-z0-9]+$/i.test(lower)) return true;
  if (/^youtube:[a-z0-9_-]+$/i.test(lower)) return true;
  if (/^vimeo:\d+$/i.test(lower)) return true;
  if (/streamable\.com\//i.test(lower)) return true;
  if (/youtube\.com\/(?:watch|embed|shorts|v)|youtu\.be\//i.test(lower)) return true;
  if (/vimeo\.com\//i.test(lower)) return true;
  if (/dailymotion\.com\//i.test(lower)) return true;
  if (/twitch\.tv\//i.test(lower)) return true;
  if (/cloudflarestream\.com|videodelivery\.net|iframe\.mediadelivery\.net|stream\.mux\.com/i.test(lower)) return true;
  const clean = lower.split("?")[0].split("#")[0];
  if (/\.(mp4|webm|ogg|mov|m4v|avi|mkv|flv|mpg|mpeg|3gp|m3u8|mpd)$/i.test(clean)) return true;
  return false;
}

export function normalizeShowcaseVideoUrl(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  const mStream = v.match(/^streamable:([a-z0-9]+)$/i);
  if (mStream?.[1]) return `https://streamable.com/${mStream[1]}`;
  const mYt = v.match(/^youtube:([a-z0-9_-]+)$/i);
  if (mYt?.[1]) return `https://www.youtube.com/watch?v=${mYt[1]}`;
  const mVim = v.match(/^vimeo:(\d+)$/i);
  if (mVim?.[1]) return `https://vimeo.com/${mVim[1]}`;
  return v;
}

export function extractShowcaseVideoUrl(product, rawImages = [], description = "") {
  const p = product || {};

  const directFields = [
    p.streamable,
    p.streamableUrl,
    p.videoUrl,
    p.video,
    p.previewVideo,
    p.preview,
    p.showcase,
    p.showcaseUrl,
    p.demo,
    p.demoUrl,
    p.youtube,
    p.youtubeUrl,
    p.vimeo,
    p.vimeoUrl,
    p.mediaUrl,
  ].filter((v) => typeof v === "string" && v.trim());

  for (const candidate of directFields) {
    const url = candidate.trim();
    if (isEmbedVideoUrl(url)) return normalizeShowcaseVideoUrl(url);
  }

  for (const arr of [p.videos, p.mediaFiles, p.media, p.attachments, rawImages, p.images]) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (typeof item === "string" && isEmbedVideoUrl(item)) {
        return normalizeShowcaseVideoUrl(item);
      }
      if (item && typeof item === "object") {
        const url = String(item.url ?? item.src ?? item.link ?? item.value ?? "").trim();
        if (url && isEmbedVideoUrl(url)) return normalizeShowcaseVideoUrl(url);
      }
    }
  }

  for (const source of [p.customFields, p.metadata, p.extra, p.productData]) {
    if (!source || typeof source !== "object") continue;
    for (const val of Object.values(source)) {
      if (typeof val === "string" && isEmbedVideoUrl(val)) {
        return normalizeShowcaseVideoUrl(val.trim());
      }
      if (val && typeof val === "object") {
        const nested = extractShowcaseVideoUrl(val, [], "");
        if (nested) return nested;
      }
    }
  }

  const deep = deepFindShowcaseVideo(p);
  if (deep) return deep;

  if (description) {
    const patterns = [
      /streamable:[a-z0-9]+/i,
      /https?:\/\/(?:www\.)?streamable\.com\/(?:e\/|o\/|s\/)?[a-z0-9]+/i,
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[a-z0-9_-]+/i,
      /https?:\/\/(?:www\.)?youtube\.com\/embed\/[a-z0-9_-]+/i,
      /https?:\/\/youtu\.be\/[a-z0-9_-]+/i,
      /https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?\d+/i,
      /https?:\/\/[\w.-]+\.(?:mp4|webm|mov|m4v)(?:\?[^"'\s<>]*)?/i,
    ];
    for (const re of patterns) {
      const match = description.match(re);
      if (match?.[0]) return normalizeShowcaseVideoUrl(match[0]);
    }
  }

  return "";
}

function deepFindShowcaseVideo(value, seen = new Set(), depth = 0) {
  if (depth > 6 || value == null) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return isEmbedVideoUrl(trimmed) ? normalizeShowcaseVideoUrl(trimmed) : "";
  }
  if (typeof value !== "object") return "";
  if (seen.has(value)) return "";
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFindShowcaseVideo(item, seen, depth + 1);
      if (found) return found;
    }
    return "";
  }

  for (const entry of Object.values(value)) {
    const found = deepFindShowcaseVideo(entry, seen, depth + 1);
    if (found) return found;
  }
  return "";
}

export function filterProductImages(rawImages = []) {
  return rawImages.filter(
    (u) => typeof u === "string" && u.trim().length > 0 && !isEmbedVideoUrl(u)
  );
}

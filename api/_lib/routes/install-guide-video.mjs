const LOCAL_FALLBACK = "/assets/video/lolscript-install-guide.mp4";

export default function handler(req, res) {
  const url = String(process.env.INSTALL_GUIDE_VIDEO_URL || "").trim() || LOCAL_FALLBACK;
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({ url });
}

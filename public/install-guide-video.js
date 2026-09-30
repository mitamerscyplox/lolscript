(function () {
  const LOCAL_FALLBACK = "/assets/video/lolscript-install-guide.mp4";

  async function resolveInstallGuideVideoUrl() {
    try {
      const res = await fetch("/api/install-guide-video", { cache: "no-store" });
      if (!res.ok) return LOCAL_FALLBACK;
      const data = await res.json();
      return data?.url || LOCAL_FALLBACK;
    } catch {
      return LOCAL_FALLBACK;
    }
  }

  function bindLazyInstallGuideVideo(video) {
    if (!video || video.dataset.lazyBound === "1") return;
    video.dataset.lazyBound = "1";

    let loading = false;

    async function ensureSource() {
      if (video.dataset.loaded === "1" || loading) return;
      loading = true;
      const url = await resolveInstallGuideVideoUrl();
      const source = document.createElement("source");
      source.src = url;
      source.type = "video/mp4";
      video.appendChild(source);
      video.load();
      video.dataset.loaded = "1";
      loading = false;
    }

    video.addEventListener("play", () => {
      void ensureSource();
    });

    video.addEventListener("click", () => {
      void ensureSource();
    });
  }

  document.querySelectorAll("[data-install-guide-video]").forEach(bindLazyInstallGuideVideo);
})();

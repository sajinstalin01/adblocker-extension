(() => {
  "use strict";

  const AD_SELECTORS = [
    "ins.adsbygoogle",
    "iframe[src*='doubleclick.net']",
    "iframe[src*='googlesyndication.com']",
    "[id^='google_ads']",
    "[id^='div-gpt-ad']",
    "[class~='ad-banner']",
    "[class~='ad-container']",
    "[class~='advertisement']",
    "[class~='advertising']",
    "[data-ad-slot]",
    "[data-ad-unit]",
    "[aria-label='Advertisement']"
  ];
  const HIDDEN_ATTR = "data-rolex-adblock-hidden";

  async function shouldRun() {
    try {
      const { enabled = true, allowlist = [] } = await chrome.storage.local.get(["enabled", "allowlist"]);
      if (!enabled) return false;
      const host = location.hostname.toLowerCase();
      return !allowlist.some((item) => {
        const domain = String(item).toLowerCase().replace(/^https?:\\/\\//, "").split("/")[0].replace(/:\\d+$/, "");
        return domain && (host === domain || host.endsWith("." + domain));
      });
    } catch (_) {
      return true;
    }
  }

  function hideAdSlots(root = document) {
    try {
      root.querySelectorAll(AD_SELECTORS.join(",")).forEach((element) => {
        if (element.closest("header, nav, main") && !element.matches("ins.adsbygoogle, [data-ad-slot], [data-ad-unit]")) {
          if (!element.matches("iframe, [id^='google_ads'], [id^='div-gpt-ad']")) return;
        }
        if (element.hasAttribute(HIDDEN_ATTR)) return;
        element.setAttribute(HIDDEN_ATTR, "1");
        element.style.setProperty("display", "none", "important");
        element.style.setProperty("visibility", "hidden", "important");
      });
    } catch (_) {}
  }

  function skipVideoAds() {
    if (location.hostname !== "www.youtube.com" && location.hostname !== "m.youtube.com") return;

    for (const selector of [".ytp-ad-skip-button", ".ytp-ad-skip-button-modern", ".ytp-skip-ad-button", "button.ytp-ad-skip-button"]) {
      const button = document.querySelector(selector);
      if (button && button.getClientRects().length && !button.disabled) {
        button.click();
        return;
      }
    }

    const player = document.querySelector(".html5-video-player");
    const video = document.querySelector("video");
    if (!player || !video) return;
    const isAd = player.classList.contains("ad-showing") ||
      !!document.querySelector(".ytp-ad-player-overlay, .ytp-ad-text-overlay");

    if (!isAd) {
      if (video.dataset.rolexAdMuted === "1") {
        video.muted = video.dataset.rolexWasMuted === "1";
        delete video.dataset.rolexAdMuted;
        delete video.dataset.rolexWasMuted;
      }
      if (video.dataset.rolexAdRate) {
        video.playbackRate = Number(video.dataset.rolexAdRate) || 1;
        delete video.dataset.rolexAdRate;
      }
      return;
    }

    // Best effort for ads that have no visible skip button.
    if (!video.dataset.rolexAdRate) video.dataset.rolexAdRate = String(video.playbackRate || 1);
    try { video.playbackRate = Math.min(16, Math.max(8, video.playbackRate)); } catch (_) {}
    if (video.dataset.rolexAdMuted !== "1") {
      video.dataset.rolexWasMuted = video.muted ? "1" : "0";
      video.dataset.rolexAdMuted = "1";
      video.muted = true;
    }
    if (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.25) {
      try { video.currentTime = Math.max(video.currentTime, video.duration - 0.2); } catch (_) {}
    }
  }

  let scanQueued = false;
  async function runCleanup() {
    if (!(await shouldRun())) return;
    hideAdSlots();
    skipVideoAds();
  }
  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      void runCleanup();
    });
  }

  void runCleanup();
  const observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(() => { void runCleanup(); }, 700);
  window.addEventListener("yt-navigate-finish", queueScan);
  chrome.storage.onChanged.addListener(() => queueScan());
})();
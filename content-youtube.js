(() => {
  "use strict";

  // Rolex Key AdBlocker — YouTube page cleanup
  // Cosmetic-only filtering. Does not alter media streams or DRM.

  const SUPPORTED_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com"
  ]);
  const HIDDEN_ATTR = "data-rolex-youtube-hidden";
  const SHORTS_NOTICE_ID = "rolex-shorts-block-notice";

  // Keep selectors independent: one selector unsupported by a future YouTube
  // layout must not prevent the remaining selectors from being processed.
  const AD_SELECTORS = [
    "ytd-ad-slot-renderer",
    "ytd-in-feed-ad-layout-renderer",
    "ytd-promoted-sparkles-web-renderer",
    "ytd-display-ad-renderer",
    "ytd-banner-promo-renderer",
    "ytd-video-masthead-ad-v3-renderer",
    "#player-ads",
    ".ytp-ad-overlay-container",
    ".ytp-ad-text-overlay",
    "#offer-module",
    "#sticker-layer",
    "#promotion-shelf",
    "#description-inner > ytd-merch-shelf-renderer > #main.ytd-merch-shelf-renderer",
    "#shorts-inner-container > .ytd-shorts:has(> .ytd-reel-video-renderer > ytd-ad-slot-renderer)",
    "ytd-rich-item-renderer:has(> #content > ytd-ad-slot-renderer)",
    ".ytReelMetapanelViewModelHost > .ytReelMetapanelViewModelMetapanelItem > .ytShortsSuggestedActionViewModelStaticHost",
    ".ytd-section-list-renderer > .ytd-item-section-renderer > ytd-search-pyv-renderer.ytd-item-section-renderer",
    ".ytd-two-column-browse-results-renderer > ytd-rich-grid-renderer > #masthead-ad.ytd-rich-grid-renderer",
    ".ytd-watch-flexy > .ytd-watch-next-secondary-results-renderer > ytd-ad-slot-renderer.ytd-watch-next-secondary-results-renderer",
    ".ytd-watch-flexy > ytd-merch-shelf-renderer > #main.ytd-merch-shelf-renderer",
    ".grid.ytd-browse > #primary > .style-scope > .ytd-rich-grid-renderer > .ytd-rich-grid-renderer > .ytd-ad-slot-renderer",
    ".ytd-rich-item-renderer.style-scope > .ytd-rich-item-renderer > .ytd-ad-slot-renderer.style-scope",
    "ytd-item-section-renderer > .ytd-item-section-renderer > ytd-ad-slot-renderer.style-scope",
    ".ytp-suggested-action > .ytp-suggested-action-badge",
    ".yt-badge-shape--ad",
    "ad-badge-view-model"
  ];

  const SHORTS_SELECTORS = [
    "ytd-guide-entry-renderer:has(a[title='Shorts'])",
    "ytd-mini-guide-entry-renderer:has(a[title='Shorts'])",
    "ytd-reel-shelf-renderer",
    "ytd-rich-shelf-renderer[is-shorts]",
    "ytd-reel-item-renderer",
    "ytd-shorts-lockup-view-model"
  ];

  let queued = false;

  function isSupported() {
    return SUPPORTED_HOSTS.has(location.hostname.toLowerCase());
  }

  function reportHiddenAd(element) {
    if (element.hasAttribute("data-rolex-ad-counted")) return;
    element.setAttribute("data-rolex-ad-counted", "1");

    try {
      const pending = chrome.runtime.sendMessage({
        type: "record-ad-action",
        kind: "pageAdHidden"
      });
      if (pending && typeof pending.catch === "function") pending.catch(() => {});
    } catch (_) {
      // Statistics are optional; page cleanup must continue.
    }
  }

  function restoreElement(element) {
    const display = element.dataset.rolexYoutubeDisplay || "";
    const priority = element.dataset.rolexYoutubePriority || "";

    if (display) element.style.setProperty("display", display, priority);
    else element.style.removeProperty("display");

    element.removeAttribute(HIDDEN_ATTR);
    delete element.dataset.rolexYoutubeDisplay;
    delete element.dataset.rolexYoutubePriority;
  }

  function restoreHiddenElements(selector = "[" + HIDDEN_ATTR + "]") {
    document.querySelectorAll(selector).forEach(restoreElement);
  }

  function restorePage() {
    restoreHiddenElements();
    document.getElementById(SHORTS_NOTICE_ID)?.remove();
  }

  function restoreShortsPage() {
    restoreHiddenElements("ytd-shorts[" + HIDDEN_ATTR + "]");
  }

  function isInsidePlayer(element) {
    return !!element.closest(
      "video, audio, .html5-video-player, #movie_player, video-player, [data-testid*='player' i]"
    );
  }

  function isAllowedInsidePlayer(element) {
    return element.matches(
      "#player-ads, .ytp-ad-overlay-container, .ytp-ad-text-overlay"
    );
  }

  function isCountableAd(element) {
    return element.matches([
      "ytd-ad-slot-renderer",
      "ytd-in-feed-ad-layout-renderer",
      "ytd-promoted-sparkles-web-renderer",
      "ytd-display-ad-renderer",
      "ytd-banner-promo-renderer",
      "#player-ads",
      ".ytp-ad-overlay-container",
      ".ytp-ad-text-overlay",
      "#offer-module",
      "#sticker-layer",
      "#promotion-shelf",
      "ytd-merch-shelf-renderer",
      "ytd-search-pyv-renderer",
      "#masthead-ad",
      ".ytp-suggested-action-badge",
      ".yt-badge-shape--ad",
      "ad-badge-view-model"
    ].join(","));
  }

  function hideElement(element) {
    if (!element || !element.isConnected || element.hasAttribute(HIDDEN_ATTR)) return;
    if (isInsidePlayer(element) && !isAllowedInsidePlayer(element)) return;

    element.dataset.rolexYoutubeDisplay = element.style.getPropertyValue("display");
    element.dataset.rolexYoutubePriority = element.style.getPropertyPriority("display");
    element.setAttribute(HIDDEN_ATTR, "1");
    element.style.setProperty("display", "none", "important");

    if (isCountableAd(element)) reportHiddenAd(element);
  }

  function scanSelectors(selectors) {
    for (const selector of selectors) {
      try {
        document.querySelectorAll(selector).forEach(hideElement);
      } catch (_) {
        // Ignore invalid/unsupported selectors individually.
      }
    }
  }

  function showShortsNotice() {
    if (!/^\/shorts\//.test(location.pathname)) {
      document.getElementById(SHORTS_NOTICE_ID)?.remove();
      return;
    }
    if (document.getElementById(SHORTS_NOTICE_ID) || !document.body) return;

    const box = document.createElement("section");
    box.id = SHORTS_NOTICE_ID;
    box.setAttribute("role", "status");
    Object.assign(box.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "18%",
      left: "50%",
      transform: "translateX(-50%)",
      width: "min(520px, 85vw)",
      padding: "28px",
      borderRadius: "16px",
      background: "#151515",
      color: "#fff",
      boxShadow: "0 8px 40px #0008",
      font: "16px/1.5 system-ui, sans-serif",
      textAlign: "center"
    });

    const title = document.createElement("h2");
    title.textContent = "YouTube Shorts blocked";
    title.style.margin = "0 0 10px";

    const message = document.createElement("p");
    message.textContent =
      "Shorts are hidden by Rolex Key AdBlocker. You can continue watching regular videos.";

    const home = document.createElement("a");
    home.href = "https://www.youtube.com/";
    home.textContent = "Open YouTube Home";
    home.style.cssText =
      "display:inline-block;margin-top:8px;padding:10px 16px;border-radius:8px;background:#fff;color:#111;text-decoration:none;font-weight:600";

    box.append(title, message, home);
    document.body.append(box);
  }

  function hideShortsCards() {
    scanSelectors(SHORTS_SELECTORS);

    for (const shorts of document.querySelectorAll("ytd-shorts")) {
      hideElement(shorts);
    }

    for (const anchor of document.querySelectorAll("a[href^='/shorts/']")) {
      const card = anchor.closest(
        "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer"
      );
      if (card) {
        hideElement(card);
        continue;
      }

      const navigation = anchor.closest(
        "ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer"
      );
      if (navigation) hideElement(navigation);
    }
  }

  async function update() {
    try {
      if (!isSupported()) return;

      const settings = await chrome.storage.local.get({
        enabled: true,
        youtubeShortsEnabled: true,
        allowlist: [],
        temporaryAllowlist: {}
      });

      const host = location.hostname.toLowerCase();
      const permanentAllow = (settings.allowlist || []).some(
        domain => host === domain || host.endsWith("." + domain)
      );
      const temporaryAllow = Object.entries(settings.temporaryAllowlist || {}).some(
        ([domain, expiresAt]) =>
          Number(expiresAt) > Date.now() &&
          (host === domain || host.endsWith("." + domain))
      );

      if (!settings.enabled || permanentAllow || temporaryAllow) {
        restorePage();
        return;
      }

      scanSelectors(AD_SELECTORS);

      if (settings.youtubeShortsEnabled) {
        if (/^\/shorts\//.test(location.pathname)) {
          hideShortsCards();
        } else {
          restoreShortsPage();
          scanSelectors(SHORTS_SELECTORS);
        }
        showShortsNotice();
      } else {
        restoreShortsPage();
        document.getElementById(SHORTS_NOTICE_ID)?.remove();
      }
    } catch (_) {
      // Fail open if storage or YouTube markup changes.
    }
  }

  function queueUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      void update();
    });
  }

  chrome.storage.onChanged.addListener(queueUpdate);

  if (document.documentElement) {
    new MutationObserver(queueUpdate).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  window.addEventListener("yt-navigate-finish", queueUpdate);
  window.addEventListener("popstate", queueUpdate);

  void update();
})();

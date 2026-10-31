(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let currentHost = "";
  let isAllowlisted = false;
  let temporaryAllowHost = "";

  const DEFAULTS = {
    enabled: true,
    trackersEnabled: true,
    allowlist: [],
    temporaryAllowlist: {},
    blockedCount: 0,
    pageAdsHidden: 0,
    skipClicks: 0,
    segmentSkips: 0,
    theme: "system",
    filterUpdate: { status: "not-run" },
    popupLayout: "comfortable",
    popupAccent: "mint",
    hidePopupStats: false,
    locale: "en",
    extensionUpdate: { status: "not-checked" },
    adLeakNoticesEnabled: true,
    extensionUpdateNotificationsEnabled: true
  };

  function ensureFeatureControls() {
    if ($("roleKeyPopupFeatures")) return;

    const panel = document.createElement("section");
    panel.id = "roleKeyPopupFeatures";
    panel.className = "mini";
    panel.setAttribute("aria-label", "Protection features");
    panel.style.cssText = "display:grid;gap:12px;margin-top:12px";

    const items = [
      { key: "enabled", title: "Ad protection", description: "Enable or pause site protection" },
      { key: "extensionUpdateNotificationsEnabled", title: "Update notifications", description: "Show available extension updates" },
      { key: "adLeakNoticesEnabled", title: "Ad-leak notices", description: "Show notices when ads get through" }
    ];

    for (const item of items) {
      const row = document.createElement("label");
      row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer";
      const copy = document.createElement("span");
      copy.style.cssText = "display:flex;flex-direction:column;gap:3px";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const description = document.createElement("small");
      description.textContent = item.description;
      description.style.cssText = "opacity:.7;font-size:11px";
      copy.append(title, description);

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = "roleKeyFeature_" + item.key;
      input.style.cssText = "width:17px;height:17px;accent-color:var(--mint,#68dfc4);flex-shrink:0";
      input.addEventListener("change", async () => {
        await chrome.storage.local.set({ [item.key]: input.checked });
        await render();
      });
      row.append(copy, input);
      panel.append(row);
    }

    const anchor = $("site") || $("extensionUpdateNotice");
    if (anchor?.parentNode) anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    else document.querySelector("main")?.append(panel);
  }

  function setToggle(id, checked) {
    const input = $(id);
    if (input) input.checked = Boolean(checked);
  }

  async function render() {
    const settings = await chrome.storage.local.get(DEFAULTS);
    ensureFeatureControls();

    const theme = settings.theme === "system"
      ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : settings.theme;

    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.layout = settings.popupLayout || "comfortable";
    document.documentElement.dataset.accent = settings.popupAccent || "mint";
    document.documentElement.lang = settings.locale === "ml" ? "ml" : "en";

    if ($("stats")) $("stats").hidden = Boolean(settings.hidePopupStats);
    if ($("blocked")) $("blocked").textContent = Number(settings.blockedCount || 0).toLocaleString();
    if ($("pageAdsHidden")) $("pageAdsHidden").textContent = Number(settings.pageAdsHidden || 0).toLocaleString();
    if ($("skipClicks")) {
      $("skipClicks").textContent = (Number(settings.skipClicks || 0) + Number(settings.segmentSkips || 0)).toLocaleString();
    }

    const enabled = Boolean(settings.enabled);
    if ($("status")) $("status").textContent = enabled ? "Protection enabled" : "Protection paused";
    if ($("dot")) $("dot").classList.toggle("off", !enabled);
    if ($("toggle")) {
      $("toggle").classList.toggle("off", !enabled);
      $("toggle").setAttribute("aria-label", enabled ? "Pause protection" : "Enable protection");
    }
    if ($("trackerState")) $("trackerState").textContent = settings.trackersEnabled ? "On" : "Off";

    const filterStatus = settings.filterUpdate?.status;
    if ($("updateState")) {
      $("updateState").textContent = filterStatus === "success" ? "Updated" : filterStatus === "error" ? "Retry needed" : "Bundled";
    }

    const extensionUpdate = settings.extensionUpdate || {};
    const showUpdate = Boolean(settings.extensionUpdateNotificationsEnabled) && extensionUpdate.status === "available";
    if ($("extensionUpdateNotice")) $("extensionUpdateNotice").hidden = !showUpdate;
    if ($("extensionUpdateTitle")) $("extensionUpdateTitle").textContent = extensionUpdate.title || "Extension update available";
    if ($("extensionUpdateVersion")) {
      $("extensionUpdateVersion").textContent = extensionUpdate.latestVersion ? "Version " + extensionUpdate.latestVersion : "Available";
    }
    if ($("extensionUpdateLink")) {
      $("extensionUpdateLink").href = extensionUpdate.releaseUrl || "https://github.com/sajinstalin01/adblocker-extension/releases";
    }

    setToggle("roleKeyFeature_enabled", enabled);
    setToggle("roleKeyFeature_extensionUpdateNotificationsEnabled", settings.extensionUpdateNotificationsEnabled);
    setToggle("roleKeyFeature_adLeakNoticesEnabled", settings.adLeakNoticesEnabled);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) throw new Error("No active tab URL");
      const url = new URL(tab.url);
      currentHost = url.hostname.toLowerCase();
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported page");

      temporaryAllowHost = Object.entries(settings.temporaryAllowlist || {}).find(([host, expiresAt]) =>
        expiresAt > Date.now() && (currentHost === host || currentHost.endsWith("." + host))
      )?.[0] || "";

      isAllowlisted = (settings.allowlist || []).some((host) =>
        currentHost === host || currentHost.endsWith("." + host)
      ) || Boolean(temporaryAllowHost);

      if ($("hostname")) $("hostname").textContent = currentHost;
      if ($("siteState")) $("siteState").textContent = isAllowlisted ? "Allowed" : (enabled ? "Protected" : "Paused");
      if ($("allow")) {
        $("allow").textContent = isAllowlisted ? "Remove allow" : "Allow site";
        $("allow").disabled = false;
      }
    } catch {
      currentHost = "";
      isAllowlisted = false;
      temporaryAllowHost = "";
      if ($("hostname")) $("hostname").textContent = "Unavailable on this page";
      if ($("siteState")) $("siteState").textContent = "N/A";
      if ($("allow")) $("allow").disabled = true;
    }
  }

  $("toggle")?.addEventListener("click", async () => {
    const { enabled = true } = await chrome.storage.local.get("enabled");
    await chrome.storage.local.set({ enabled: !enabled });
    await render();
  });

  $("allow")?.addEventListener("click", async () => {
    if (!currentHost) return;

    if (temporaryAllowHost) {
      const { temporaryAllowlist = {} } = await chrome.storage.local.get("temporaryAllowlist");
      const nextTemporary = { ...temporaryAllowlist };
      delete nextTemporary[temporaryAllowHost];
      await chrome.storage.local.set({ temporaryAllowlist: nextTemporary });
    } else {
      const { allowlist = [] } = await chrome.storage.local.get("allowlist");
      const next = isAllowlisted
        ? allowlist.filter((host) => !(currentHost === host || currentHost.endsWith("." + host)))
        : [...new Set([...allowlist, currentHost])];
      await chrome.storage.local.set({ allowlist: next });
    }

    await render();
  });

  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area === "local" && Object.keys(changes).some((key) => key in DEFAULTS)) {
      void render();
    }
  });

  void render().catch((error) => console.error("[Rolex Key] Popup initialization failed:", error));
})();
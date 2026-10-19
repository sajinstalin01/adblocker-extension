const $ = (id) => document.getElementById(id);
let currentHost = "", isAllowlisted = false, temporaryAllowHost = "";
async function render() {
  const settings = await chrome.storage.local.get({
    enabled: true, trackersEnabled: true, allowlist: [], temporaryAllowlist: {}, blockedCount: 0, theme: "system", filterUpdate: {status:"not-run"}, popupLayout:"comfortable", popupAccent:"mint", hidePopupStats:false, locale:"en", extensionUpdate:{status:"not-checked"}
  });
  const theme = settings.theme === "system"
    ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : settings.theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.layout=settings.popupLayout;document.documentElement.dataset.accent=settings.popupAccent;document.documentElement.lang=settings.locale==="ml"?"ml":"en";$("stats").hidden=!!settings.hidePopupStats;
  $("blocked").textContent = Number(settings.blockedCount || 0).toLocaleString();
  $("status").textContent = settings.enabled ? "Protection enabled" : "Protection paused";
  $("dot").classList.toggle("off", !settings.enabled);
  $("toggle").classList.toggle("off", !settings.enabled);
  $("toggle").setAttribute("aria-label", settings.enabled ? "Pause protection" : "Enable protection");
  $("trackerState").textContent = settings.trackersEnabled ? "On" : "Off";
  $("updateState").textContent = settings.filterUpdate?.status === "success" ? "Updated" : settings.filterUpdate?.status === "error" ? "Retry needed" : "Bundled";
  const extensionUpdate = settings.extensionUpdate || {};
  $("extensionUpdateNotice").hidden = extensionUpdate.status !== "available";
  $("extensionUpdateTitle").textContent = extensionUpdate.title || "Extension update available";
  $("extensionUpdateVersion").textContent = extensionUpdate.latestVersion ? "Version " + extensionUpdate.latestVersion : "Available";
  $("extensionUpdateLink").href = extensionUpdate.releaseUrl || "https://github.com/sajinstalin01/adblocker-extension/releases";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    currentHost = url.hostname.toLowerCase();
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported");
    temporaryAllowHost = Object.entries(settings.temporaryAllowlist || {}).find(([h, expiresAt]) => expiresAt > Date.now() && (currentHost === h || currentHost.endsWith("." + h)))?.[0] || "";
    isAllowlisted = (settings.allowlist || []).some((h) => currentHost === h || currentHost.endsWith("." + h)) || !!temporaryAllowHost;
    $("hostname").textContent = currentHost;
    $("siteState").textContent = isAllowlisted ? "Allowed" : (settings.enabled ? "Protected" : "Paused");
    $("allow").textContent = isAllowlisted ? "Remove allow" : "Allow site";
    $("allow").disabled = false;
  } catch {
    currentHost = "";
    $("hostname").textContent = "Unavailable on this page";
    $("siteState").textContent = "N/A";
    $("allow").disabled = true;
  }
}
$("toggle").addEventListener("click", async () => {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  await chrome.storage.local.set({ enabled: !enabled });
  await render();
});
$("allow").addEventListener("click", async () => {
  if (!currentHost) return;
  if (temporaryAllowHost) {
    const { temporaryAllowlist = {} } = await chrome.storage.local.get("temporaryAllowlist");
    const nextTemporary = { ...temporaryAllowlist }; delete nextTemporary[temporaryAllowHost];
    await chrome.storage.local.set({ temporaryAllowlist: nextTemporary });
  } else {
    const { allowlist = [] } = await chrome.storage.local.get("allowlist");
    const next = isAllowlisted ? allowlist.filter((h) => !(currentHost === h || currentHost.endsWith("." + h))) : [...new Set([...allowlist, currentHost])];
    await chrome.storage.local.set({ allowlist: next });
  }
  await render();
});
render();
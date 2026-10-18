const $ = (id) => document.getElementById(id);
let currentHost = "", isAllowlisted = false;
async function render() {
  const settings = await chrome.storage.local.get({
    enabled: true, trackersEnabled: true, allowlist: [], blockedCount: 0, theme: "system", filterUpdate: {status:"not-run"}
  });
  const theme = settings.theme === "system"
    ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : settings.theme;
  document.documentElement.dataset.theme = theme;
  $("blocked").textContent = Number(settings.blockedCount || 0).toLocaleString();
  $("status").textContent = settings.enabled ? "Protection enabled" : "Protection paused";
  $("dot").classList.toggle("off", !settings.enabled);
  $("toggle").classList.toggle("off", !settings.enabled);
  $("toggle").setAttribute("aria-label", settings.enabled ? "Pause protection" : "Enable protection");
  $("trackerState").textContent = settings.trackersEnabled ? "On" : "Off";
  $("updateState").textContent = settings.filterUpdate?.status === "success" ? "Updated" : settings.filterUpdate?.status === "error" ? "Retry needed" : "Bundled";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    currentHost = url.hostname.toLowerCase();
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported");
    isAllowlisted = (settings.allowlist || []).some((h) => currentHost === h || currentHost.endsWith("." + h));
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
  const { allowlist = [] } = await chrome.storage.local.get("allowlist");
  const next = isAllowlisted ? allowlist.filter((h) => !(currentHost === h || currentHost.endsWith("." + h))) : [...new Set([...allowlist, currentHost])];
  await chrome.storage.local.set({ allowlist: next });
  await render();
});
render();
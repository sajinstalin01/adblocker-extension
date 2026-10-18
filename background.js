const DEFAULTS = { enabled: true, allowlist: [], blockedCount: 0 };

chrome.runtime.onInstalled.addListener(async () => {
  const saved = await chrome.storage.local.get(Object.keys(DEFAULTS));
  await chrome.storage.local.set({ ...DEFAULTS, ...saved });
  await applyEnabledState();
  await refreshAllowlistRules();
});
chrome.runtime.onStartup.addListener(async () => {
  await applyEnabledState();
  await refreshAllowlistRules();
});
async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
}
async function applyEnabledState() {
  const { enabled } = await getSettings();
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled ? ["base_ads", "base_trackers"] : [],
    disableRulesetIds: enabled ? [] : ["base_ads", "base_trackers"]
  });
}
async function refreshAllowlistRules() {
  const { allowlist = [] } = await getSettings();
  const rules = allowlist.slice(0, 500).map((host, index) => ({
    id: 100000 + index,
    priority: 100,
    action: { type: "allowAllRequests" },
    condition: {
      requestDomains: [host],
      resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "media", "websocket", "other"]
    }
  }));
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(rule => rule.id),
    addRules: rules
  });
}
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return;
  if (changes.enabled) await applyEnabledState();
  if (changes.allowlist) await refreshAllowlistRules();
});
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener(async () => {
  const { blockedCount = 0 } = await getSettings();
  await chrome.storage.local.set({ blockedCount: blockedCount + 1 });
});
const DEFAULTS = {
  enabled: true,
  trackersEnabled: true,
  allowlist: [],
  customBlockDomains: [],
  theme: "system",
  blockedCount: 0,
  statsBySite: {},
  recentBlocks: [],
  filterUpdate: { status: "not-run", updatedAt: null, message: "Not checked yet" }
};

const RULE_RANGES = {
  allowlist: { start: 100000, end: 100999 },
  remoteAds: { start: 200000, end: 204999 },
  remoteTrackers: { start: 210000, end: 214999 },
  customDomains: { start: 300000, end: 300999 }
};
const UPDATE_ALARM = "rolex-filter-refresh";
let statsQueue = Promise.resolve();

chrome.runtime.onInstalled.addListener(async () => {
  const saved = await chrome.storage.local.get(Object.keys(DEFAULTS));
  await chrome.storage.local.set({ ...DEFAULTS, ...saved });
  await applyEnabledState();
  await refreshAllowlistRules();
  await refreshCustomDomainRules();
  await ensureUpdateAlarm();
  await updateRemoteFilters();
});

chrome.runtime.onStartup.addListener(async () => {
  await applyEnabledState();
  await refreshAllowlistRules();
  await refreshCustomDomainRules();
  await ensureUpdateAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_ALARM) void updateRemoteFilters();
});

async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
}

async function applyEnabledState() {
  const settings = await getSettings();
  const enabledIds = settings.enabled
    ? ["base_ads", "base_privacy", ...(settings.trackersEnabled ? ["base_trackers"] : [])]
    : [];
  const allIds = ["base_ads", "base_trackers", "base_privacy"];
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabledIds,
    disableRulesetIds: allIds.filter((id) => !enabledIds.includes(id))
  });
  await syncRemoteRules();
}

async function syncRemoteRules() {
  const settings = await getSettings();
  const cached = await chrome.storage.local.get({ remoteAdsRules: [], remoteTrackerRules: [] });
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const ownedIds = existing
    .filter((rule) => (rule.id >= RULE_RANGES.remoteAds.start && rule.id <= RULE_RANGES.remoteAds.end) ||
      (rule.id >= RULE_RANGES.remoteTrackers.start && rule.id <= RULE_RANGES.remoteTrackers.end))
    .map((rule) => rule.id);
  const addRules = settings.enabled
    ? [...(cached.remoteAdsRules || []), ...(settings.trackersEnabled ? (cached.remoteTrackerRules || []) : [])]
    : [];
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ownedIds, addRules });
}

async function replaceOwnedDynamicRules(range, rules) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing
    .filter((rule) => rule.id >= range.start && rule.id <= range.end)
    .map((rule) => rule.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: rules });
}

function normalizeDomain(value) {
  let input = String(value || "").trim().toLowerCase();
  input = input.replace(/^https?:\/\//, "").split("/")[0].replace(/:\d+$/, "");
  if (input.length > 253 || !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/.test(input)) return null;
  return input;
}

async function refreshAllowlistRules() {
  const { allowlist = [] } = await getSettings();
  const hosts = [...new Set(allowlist.map(normalizeDomain).filter(Boolean))].slice(0, 500);
  const range = RULE_RANGES.allowlist;
  const rules = hosts.map((host, index) => ({
    id: range.start + index,
    priority: 100,
    action: { type: "allowAllRequests" },
    condition: { requestDomains: [host], resourceTypes: ["main_frame", "sub_frame"] }
  }));
  await replaceOwnedDynamicRules(range, rules);
}

async function refreshCustomDomainRules() {
  const { customBlockDomains = [] } = await getSettings();
  const hosts = [...new Set(customBlockDomains.map(normalizeDomain).filter(Boolean))].slice(0, 500);
  const range = RULE_RANGES.customDomains;
  const rules = hosts.map((host, index) => ({
    id: range.start + index,
    priority: 2,
    action: { type: "block" },
    condition: {
      requestDomains: [host],
      resourceTypes: ["main_frame", "sub_frame", "script", "image", "xmlhttprequest", "media", "other"]
    }
  }));
  await replaceOwnedDynamicRules(range, rules);
}

async function ensureUpdateAlarm() {
  await chrome.alarms.create(UPDATE_ALARM, { periodInMinutes: 1440, delayInMinutes: 5 });
}

function validateRemoteRules(data, baseId) {
  if (!Array.isArray(data) || data.length > 2000) throw new Error("Filter file must be an array of at most 2,000 rules.");
  const resourceTypes = new Set(["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "media", "websocket", "other"]);
  return data.map((rule, index) => {
    if (!rule || rule.action?.type !== "block" || typeof rule.condition?.urlFilter !== "string" || !rule.condition.urlFilter.trim()) {
      throw new Error("Unsupported rule format at entry " + (index + 1) + ".");
    }
    const types = Array.isArray(rule.condition.resourceTypes)
      ? rule.condition.resourceTypes.filter((type) => resourceTypes.has(type))
      : ["script", "image", "xmlhttprequest", "sub_frame", "other"];
    if (!types.length) throw new Error("Rule " + (index + 1) + " has no supported resource types.");
    return {
      id: baseId + index,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: rule.condition.urlFilter.slice(0, 1500),
        resourceTypes: types,
        ...(Array.isArray(rule.condition.requestDomains) ? { requestDomains: rule.condition.requestDomains.filter((d) => typeof d === "string" && normalizeDomain(d)).slice(0, 50) } : {})
      }
    };
  });
}

async function updateRemoteFilters() {
  const previous = await getSettings();
  try {
    const root = "https://raw.githubusercontent.com/sajinstalin01/adblocker-extension/main/rules/";
    const responses = await Promise.all([
      fetch(root + "ads.json", { cache: "no-store" }),
      fetch(root + "trackers.json", { cache: "no-store" })
    ]);
    if (responses.some((response) => !response.ok)) throw new Error("Could not download one or more filter files.");
    const [adsData, trackersData] = await Promise.all(responses.map((response) => response.json()));
    const ads = validateRemoteRules(adsData, RULE_RANGES.remoteAds.start);
    const trackers = validateRemoteRules(trackersData, RULE_RANGES.remoteTrackers.start);
    const current = await getSettings();
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const ownedIds = existing
      .filter((rule) => (rule.id >= RULE_RANGES.remoteAds.start && rule.id <= RULE_RANGES.remoteAds.end) ||
        (rule.id >= RULE_RANGES.remoteTrackers.start && rule.id <= RULE_RANGES.remoteTrackers.end))
      .map((rule) => rule.id);
    const addRules = current.enabled ? [...ads, ...(current.trackersEnabled ? trackers : [])] : [];
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ownedIds, addRules });
    const updatedAt = new Date().toISOString();
    await chrome.storage.local.set({
      remoteAdsRules: ads,
      remoteTrackerRules: trackers,
      filterUpdate: { status: "success", updatedAt, message: "Filter rules refreshed successfully." }
    });
  } catch (error) {
    await chrome.storage.local.set({
      filterUpdate: {
        ...previous.filterUpdate,
        status: "error",
        message: String(error?.message || "Update failed").slice(0, 180)
      }
    });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "update-filters") {
    updateRemoteFilters().then(async () => sendResponse((await getSettings()).filterUpdate));
    return true;
  }
  if (message?.type === "get-tab-status") {
    getSettings().then((settings) => sendResponse({ enabled: settings.enabled, trackersEnabled: settings.trackersEnabled }));
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled || changes.trackersEnabled) void applyEnabledState();
  if (changes.allowlist) void refreshAllowlistRules();
  if (changes.customBlockDomains) void refreshCustomDomainRules();
});

chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  statsQueue = statsQueue.then(async () => {
    const settings = await getSettings();
    const host = (() => {
      try { return new URL(info.request?.url || "").hostname; } catch (_) { return "unknown"; }
    })();
    const statsBySite = { ...(settings.statsBySite || {}) };
    statsBySite[host] = (statsBySite[host] || 0) + 1;
    const recentBlocks = [{ host, url: info.request?.url || "", at: new Date().toISOString(), ruleId: info.rule?.ruleId }, ...(settings.recentBlocks || [])].slice(0, 100);
    await chrome.storage.local.set({
      blockedCount: (settings.blockedCount || 0) + 1,
      statsBySite,
      recentBlocks
    });
  }).catch(() => {});
});
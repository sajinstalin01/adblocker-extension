const DEFAULTS = {
  enabled: true,
  trackersEnabled: true,
  privacyEnabled: true,
  allowlist: [],
  temporaryAllowlist: {},
  customBlockDomains: [],
  communityFilterUrls: [],
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
  community: { start: 220000, end: 229999 },
  customDomains: { start: 300000, end: 300999 }
};
const UPDATE_ALARM = "rolex-filter-refresh";
const TEMP_ALLOWLIST_ALARM = "rolex-temp-allowlist-expiry";
let statsQueue = Promise.resolve();

chrome.runtime.onInstalled.addListener(async () => {
  const saved = await chrome.storage.local.get(Object.keys(DEFAULTS));
  await chrome.storage.local.set({ ...DEFAULTS, ...saved });
  await applyEnabledState();
  await ensureUpdateAlarm();
  await ensureTemporaryAllowlistAlarm();
  await updateRemoteFilters();
});

chrome.runtime.onStartup.addListener(async () => {
  await expireTemporaryAllowlist();
  await applyEnabledState();
  await ensureUpdateAlarm();
  await ensureTemporaryAllowlistAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_ALARM) void updateRemoteFilters();
  if (alarm.name === TEMP_ALLOWLIST_ALARM) void expireTemporaryAllowlist();
});

async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
}

async function applyEnabledState() {
  const settings = await getSettings();
  const enabledIds = settings.enabled
    ? ["base_ads", ...(settings.trackersEnabled ? ["base_trackers"] : []), ...(settings.privacyEnabled ? ["base_privacy"] : [])]
    : [];
  const allIds = ["base_ads", "base_trackers", "base_privacy"];
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabledIds,
    disableRulesetIds: allIds.filter((id) => !enabledIds.includes(id))
  });
  await syncRemoteRules();
  await refreshCustomDomainRules();
  await refreshAllowlistRules();
}

async function syncRemoteRules() {
  const settings = await getSettings();
  const cached = await chrome.storage.local.get({ remoteAdsRules: [], remoteTrackerRules: [], remoteCommunityRules: [], remoteCommunityRulesByUrl: {} });
  const activeUrls = settings.communityFilterUrls || [];
  const communityCached = Object.keys(cached.remoteCommunityRulesByUrl || {}).length
    ? activeUrls.flatMap((url) => cached.remoteCommunityRulesByUrl[url] || [])
    : (activeUrls.length ? (cached.remoteCommunityRules || []) : []);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const ownedIds = existing
    .filter((rule) => (rule.id >= RULE_RANGES.remoteAds.start && rule.id <= RULE_RANGES.remoteAds.end) ||
      (rule.id >= RULE_RANGES.remoteTrackers.start && rule.id <= RULE_RANGES.remoteTrackers.end) ||
      (rule.id >= RULE_RANGES.community.start && rule.id <= RULE_RANGES.community.end))
    .map((rule) => rule.id);
  const addRules = settings.enabled
    ? [...(cached.remoteAdsRules || []), ...(settings.trackersEnabled ? (cached.remoteTrackerRules || []) : []), ...communityCached]
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
  const settings = await getSettings();
  const now = Date.now();
  const temporary = Object.entries(settings.temporaryAllowlist || {})
    .filter(([host, expiresAt]) => normalizeDomain(host) && Number.isFinite(expiresAt) && expiresAt > now)
    .map(([host]) => host);
  const hosts = [...new Set([...(settings.allowlist || []), ...temporary].map(normalizeDomain).filter(Boolean))].slice(0, 500);
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
  const settings = await getSettings();
  const hosts = settings.enabled ? [...new Set((settings.customBlockDomains || []).map(normalizeDomain).filter(Boolean))].slice(0, 500) : [];
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
async function ensureTemporaryAllowlistAlarm() {
  await chrome.alarms.create(TEMP_ALLOWLIST_ALARM, { periodInMinutes: 15, delayInMinutes: 15 });
}
async function expireTemporaryAllowlist() {
  const { temporaryAllowlist = {} } = await getSettings();
  const now = Date.now();
  const active = Object.fromEntries(Object.entries(temporaryAllowlist)
    .filter(([host, expiresAt]) => normalizeDomain(host) && Number.isFinite(expiresAt) && expiresAt > now));
  if (Object.keys(active).length !== Object.keys(temporaryAllowlist).length) {
    await chrome.storage.local.set({ temporaryAllowlist: active });
  }
  await refreshAllowlistRules();
}

function validateRemoteRules(data, baseId, maxRules = 2000) {
  if (!Array.isArray(data) || data.length > maxRules) throw new Error("Filter file exceeds its permitted rule limit.");
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
        ...(Array.isArray(rule.condition.requestDomains) ? { requestDomains: rule.condition.requestDomains.map(normalizeDomain).filter(Boolean).slice(0, 50) } : {})
      }
    };
  });
}

async function updateRemoteFilters() {
  const previous = await getSettings();
  try {
    const root = "https://raw.githubusercontent.com/sajinstalin01/adblocker-extension/main/rules/";
    const current = await getSettings();
    const communityUrls = [...new Set((current.communityFilterUrls || []).filter((url) => typeof url === "string" && url.startsWith("https://")))].slice(0, 10);
    const responses = await Promise.all([
      fetch(root + "ads.json", { cache: "no-store" }),
      fetch(root + "trackers.json", { cache: "no-store" }),
      ...communityUrls.map((url) => fetch(url, { cache: "no-store" }))
    ]);
    if (responses.some((response) => !response.ok)) throw new Error("Could not download one or more filter files. Previous rules were retained.");
    const parsed = await Promise.all(responses.map((response) => response.json()));
    const ads = validateRemoteRules(parsed[0], RULE_RANGES.remoteAds.start);
    const trackers = validateRemoteRules(parsed[1], RULE_RANGES.remoteTrackers.start);
    const community = [];
    const communityByUrl = {};
    for (let i = 0; i < communityUrls.length; i++) {
      const data = parsed[i + 2];
      const validated = validateRemoteRules(data, RULE_RANGES.community.start + i * 500, 500);
      communityByUrl[communityUrls[i]] = validated;
      community.push(...validated);
    }
    if (community.length > 5000) throw new Error("Combined community filter rules exceed the 5,000-rule subscription limit.");
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const ownedIds = existing
      .filter((rule) => (rule.id >= RULE_RANGES.remoteAds.start && rule.id <= RULE_RANGES.remoteAds.end) ||
        (rule.id >= RULE_RANGES.remoteTrackers.start && rule.id <= RULE_RANGES.remoteTrackers.end) ||
        (rule.id >= RULE_RANGES.community.start && rule.id <= RULE_RANGES.community.end))
      .map((rule) => rule.id);
    const addRules = current.enabled ? [...ads, ...(current.trackersEnabled ? trackers : []), ...community] : [];
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ownedIds, addRules });
    const updatedAt = new Date().toISOString();
    await chrome.storage.local.set({
      remoteAdsRules: ads,
      remoteTrackerRules: trackers,
      remoteCommunityRules: community,
      remoteCommunityRulesByUrl: communityByUrl,
      filterUpdate: { status: "success", updatedAt, message: "Filter rules refreshed successfully." }
    });
  } catch (error) {
    try { await syncRemoteRules(); } catch (_) {}
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
  if (changes.enabled || changes.trackersEnabled || changes.privacyEnabled) void applyEnabledState();
  if (changes.allowlist || changes.temporaryAllowlist) void refreshAllowlistRules();
  if (changes.customBlockDomains) void refreshCustomDomainRules();
  if (changes.communityFilterUrls) void updateRemoteFilters();
});

chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  statsQueue = statsQueue.then(async () => {
    const settings = await getSettings();
    const host = (() => {
      try { return new URL(info.request?.initiator || info.request?.documentUrl || info.request?.url || "").hostname; }
      catch (_) { return "unknown"; }
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
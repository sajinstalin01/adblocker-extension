const DEFAULTS = {
  enabled: true,
  trackersEnabled: true,
  privacyEnabled: true,
  minersEnabled: true,
  antiAdblockEnabled:false, readingModeEnabled:false, protectionProfile:"balanced", locale:"en", popupLayout:"comfortable", popupAccent:"mint", hidePopupStats:false, onboardingComplete:false, releaseNotesPending:false, lastSeenVersion:"3.0.0",
  allowlist: [],
  temporaryAllowlist: {},
  customBlockDomains: [],
  communityFilterUrls: [],
  theme: "system",
  blockedCount: 0,
  pageAdsHidden: 0,
  skipClicks: 0,
  segmentSkips: 0,
  actionStatsBySite: {},
  advancedSettings: { smartDetection: true, floatingAdCleanup: true, cookieCleanup: false, sponsorMarkers: true, phishingWarnings: true, customCssEnabled: true, debugMode: false, profile: "balanced", theme: "system", locale: "en", accent: "mint" },
  customElementRules: {},
  advancedEvents: [],
  statsBySite: {},
  recentBlocks: [],
  filterUpdate: { status: "not-run", updatedAt: null, message: "Not checked yet" },
  extensionUpdate: { status: "not-checked" }
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
const EXTENSION_UPDATE_ALARM = "rolex-extension-update-check";
const EXTENSION_UPDATE_FEED = "https://raw.githubusercontent.com/sajinstalin01/adblocker-extension/main/update-feed.json";
let statsQueue = Promise.resolve();

chrome.runtime.onInstalled.addListener(async (details) => {
  const saved = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const currentVersion=chrome.runtime.getManifest().version;
  await chrome.storage.local.set({ ...DEFAULTS, ...saved, lastSeenVersion:currentVersion });
  await applyEnabledState();
  await ensureUpdateAlarm();
  await ensureTemporaryAllowlistAlarm();
  await ensureExtensionUpdateAlarm();
  if(details.reason==="install"){await chrome.storage.local.set({onboardingComplete:false});await chrome.tabs.create({url:chrome.runtime.getURL("welcome.html")});}else if(details.reason==="update"&&details.previousVersion!==currentVersion){await chrome.storage.local.set({releaseNotesPending:true});}
  await updateRemoteFilters();
  await checkExtensionUpdates();
});

chrome.commands.onCommand.addListener(async command=>{if(command!=="toggle-reading-mode")return;const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(tab?.id)chrome.tabs.sendMessage(tab.id,{type:"toggle-reading-mode"}).catch(()=>{});});
chrome.runtime.onStartup.addListener(async () => {
  await expireTemporaryAllowlist();
  await applyEnabledState();
  await ensureUpdateAlarm();
  await ensureTemporaryAllowlistAlarm();
  await ensureExtensionUpdateAlarm();
  void checkExtensionUpdates();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_ALARM) void updateRemoteFilters();
  if (alarm.name === EXTENSION_UPDATE_ALARM) void checkExtensionUpdates();
  if (alarm.name === TEMP_ALLOWLIST_ALARM) void expireTemporaryAllowlist();
});

async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
}

async function applyEnabledState() {
  const settings = await getSettings();
  const enabledIds = settings.enabled
    ? ["base_ads", ...(settings.trackersEnabled ? ["base_trackers"] : []), ...(settings.privacyEnabled ? ["base_privacy"] : []), ...(settings.minersEnabled ? ["base_mining"] : [])]
    : [];
  const allIds = ["base_ads", "base_trackers", "base_privacy", "base_mining"];
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

async function ensureExtensionUpdateAlarm() {
  await chrome.alarms.create(EXTENSION_UPDATE_ALARM, { periodInMinutes: 360, delayInMinutes: 3 });
}
function compareVersions(a, b) {
  const parse = value => String(value || "").split(".").map(part => Number.parseInt(part, 10));
  const left = parse(a), right = parse(b);
  if (left.length !== 3 || right.length !== 3 || [...left, ...right].some(n => !Number.isInteger(n) || n < 0)) return 0;
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}
async function checkExtensionUpdates() {
  const installedVersion = chrome.runtime.getManifest().version;
  try {
    const response = await fetch(EXTENSION_UPDATE_FEED, { cache: "no-store" });
    if (!response.ok) throw new Error("Update feed unavailable (" + response.status + ").");
    const feed = await response.json();
    if (!feed || typeof feed.latestVersion !== "string" || !/^\d+\.\d+\.\d+$/.test(feed.latestVersion) || typeof feed.title !== "string" || typeof feed.message !== "string") throw new Error("Invalid update feed.");
    const releaseUrl = typeof feed.releaseUrl === "string" && feed.releaseUrl.startsWith("https://github.com/sajinstalin01/adblocker-extension/") ? feed.releaseUrl : "https://github.com/sajinstalin01/adblocker-extension/releases";
    const newer = compareVersions(feed.latestVersion, installedVersion) > 0;
    const update = { status: newer ? "available" : "current", installedVersion, latestVersion: feed.latestVersion, title: feed.title.slice(0, 120), message: feed.message.slice(0, 300), releaseUrl, features: Array.isArray(feed.features) ? feed.features.filter(x => typeof x === "string").slice(0, 8) : [], checkedAt: new Date().toISOString() };
    await chrome.storage.local.set({ extensionUpdate: update });
    await chrome.action.setBadgeText({ text: newer ? "UPD" : "" });
    if (newer) {
      const { lastNotifiedUpdateVersion = "" } = await chrome.storage.local.get({ lastNotifiedUpdateVersion: "" });
      const hasPermission = await chrome.permissions.contains({ permissions: ["notifications"] });
      if (hasPermission && lastNotifiedUpdateVersion !== feed.latestVersion) {
        await chrome.notifications.create("rolex-update-" + feed.latestVersion, { type: "basic", iconUrl: chrome.runtime.getURL("icons/icon128.png"), title: "Rolex Key AdBlocker update available", message: (feed.title + ": " + feed.message).slice(0, 240), priority: 1, buttons: [{ title: "View update" }] });
        await chrome.storage.local.set({ lastNotifiedUpdateVersion: feed.latestVersion });
      }
    }
    return update;
  } catch (error) {
    const prior = await chrome.storage.local.get({ extensionUpdate: { status: "not-checked" } });
    const failed = { ...prior.extensionUpdate, status: prior.extensionUpdate?.status === "available" ? "available" : "error", checkError: String(error?.message || "Update check failed").slice(0, 180), checkedAt: new Date().toISOString() };
    await chrome.storage.local.set({ extensionUpdate: failed });
    return failed;
  }
}
chrome.notifications?.onClicked?.addListener(async notificationId => {
  if (!notificationId.startsWith("rolex-update-")) return;
  const { extensionUpdate = {} } = await chrome.storage.local.get({ extensionUpdate: {} });
  await chrome.tabs.create({ url: extensionUpdate.releaseUrl || "https://github.com/sajinstalin01/adblocker-extension/releases" });
  chrome.notifications.clear(notificationId);
});
chrome.notifications?.onButtonClicked?.addListener(async (notificationId, buttonIndex) => {
  if (!notificationId.startsWith("rolex-update-") || buttonIndex !== 0) return;
  const { extensionUpdate = {} } = await chrome.storage.local.get({ extensionUpdate: {} });
  await chrome.tabs.create({ url: extensionUpdate.releaseUrl || "https://github.com/sajinstalin01/adblocker-extension/releases" });
  chrome.notifications.clear(notificationId);
});

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
  const resourceTypes = new Set(["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"]);
  return data.map((rule, index) => {
    const filter = typeof rule?.condition?.urlFilter === "string" ? rule.condition.urlFilter.trim() : "";
    if (!rule || rule.action?.type !== "block" || !filter || filter.length > 1500 || ["*", "||*^", "|http", "|https", "http", "https"].includes(filter.toLowerCase())) {
      throw new Error("Unsupported or overly broad rule format at entry " + (index + 1) + ".");
    }
    if (rule.condition.regexFilter !== undefined) throw new Error("Regular-expression filters are not accepted.");
    const types = Array.isArray(rule.condition.resourceTypes)
      ? rule.condition.resourceTypes.filter((type) => resourceTypes.has(type))
      : ["script", "image", "xmlhttprequest", "sub_frame", "other"];
    if (!types.length || (Array.isArray(rule.condition.resourceTypes) && types.length !== rule.condition.resourceTypes.length)) throw new Error("Rule " + (index + 1) + " has unsupported resource types.");
    if (rule.condition.requestDomains !== undefined && (!Array.isArray(rule.condition.requestDomains) || !rule.condition.requestDomains.length || rule.condition.requestDomains.length > 50 || rule.condition.requestDomains.some(domain => !normalizeDomain(domain)))) {
      throw new Error("Rule " + (index + 1) + " has invalid request domains.");
    }
    return {
      id: baseId + index,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: filter,
        resourceTypes: types,
        ...(Array.isArray(rule.condition.requestDomains) ? { requestDomains: rule.condition.requestDomains.map(normalizeDomain).slice(0, 50) } : {})
      }
    };
  });
}

async function fetchJsonLimited(url, maxBytes = 2 * 1024 * 1024) {
  const response = await fetch(url, { cache: "no-store", redirect: "error" });
  if (!response.ok) throw new Error("Filter source returned HTTP " + response.status + ".");
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new Error("Filter source exceeds the permitted download size.");
  const body = await response.text();
  if (body.length > maxBytes) throw new Error("Filter source exceeds the permitted download size.");
  try { return JSON.parse(body); } catch (_) { throw new Error("Filter source is not valid JSON."); }
}

async function updateRemoteFilters() {
  const previous = await getSettings();
  try {
    const root = "https://raw.githubusercontent.com/sajinstalin01/adblocker-extension/main/rules/";
    const current = await getSettings();
    const communityUrls = [...new Set((current.communityFilterUrls || []).filter((url) => typeof url === "string" && url.startsWith("https://")))].slice(0, 10);
    const parsed = await Promise.all([
      fetchJsonLimited(root + "ads.json"),
      fetchJsonLimited(root + "trackers.json"),
      ...communityUrls.map((url) => fetchJsonLimited(url, 1024 * 1024))
    ]);
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
  if (message?.type === "check-extension-updates") {
    checkExtensionUpdates().then(sendResponse);
    return true;
  }
  if (message?.type === "update-filters") {
    updateRemoteFilters().then(async () => sendResponse((await getSettings()).filterUpdate));
    return true;
  }
  if (message?.type === "record-ad-action") {
    const kind = ["pageAdHidden","skipClicked","segmentSkipped"].includes(message.kind) ? message.kind : null;
    if (!kind) { sendResponse({ok:false}); return false; }
    const host = (() => { try { return new URL(_sender.url || _sender.tab?.url || "").hostname.toLowerCase() || "unknown"; } catch (_) { return "unknown"; } })();
    statsQueue = statsQueue.then(async () => {
      const s = await getSettings();
      const key = kind === "pageAdHidden" ? "pageAdsHidden" : kind === "skipClicked" ? "skipClicks" : "segmentSkips";
      const actionStatsBySite = {...(s.actionStatsBySite || {})};
      actionStatsBySite[host] = {...(actionStatsBySite[host] || {}), [key]: ((actionStatsBySite[host] || {})[key] || 0) + 1};
      await chrome.storage.local.set({[key]:(s[key] || 0) + 1, actionStatsBySite});
    }).then(() => sendResponse({ok:true})).catch(() => sendResponse({ok:false}));
    return true;
  }
  if (message?.type === "rolex-advanced-event") {
    const event = message.event;
    if (!event || typeof event.type !== "string" || typeof event.host !== "string") { sendResponse({ok:false}); return false; }
    statsQueue = statsQueue.then(async () => {
      const { advancedEvents = [] } = await chrome.storage.local.get({ advancedEvents: [] });
      await chrome.storage.local.set({ advancedEvents: [{ type: event.type.slice(0,60), host: event.host.slice(0,253), detail: String(event.detail || "").slice(0,180), at: new Date().toISOString() }, ...advancedEvents].slice(0,250) });
    }).then(() => sendResponse({ok:true})).catch(() => sendResponse({ok:false}));
    return true;
  }
  if (message?.type === "rolex-save-element-rule") {
    const host = normalizeDomain(message.host), selector = typeof message.selector === "string" ? message.selector.trim() : "";
    if (!host || !selector || selector.length > 500 || /[{};]/.test(selector)) { sendResponse({ok:false}); return false; }
    chrome.storage.local.get({ customElementRules: {} }).then(async data => {
      const rules = { ...(data.customElementRules || {}) }, list = [...(rules[host] || [])];
      if (!list.some(item => item.selector === selector)) list.push({ selector, createdAt: new Date().toISOString() });
      rules[host] = list.slice(-100);
      await chrome.storage.local.set({ customElementRules: rules });
      sendResponse({ok:true});
    }).catch(() => sendResponse({ok:false}));
    return true;
  }
  if (message?.type === "get-tab-status") {
    getSettings().then((settings) => sendResponse({ enabled: settings.enabled, trackersEnabled: settings.trackersEnabled }));
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled || changes.trackersEnabled || changes.privacyEnabled || changes.minersEnabled) void applyEnabledState();
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
const $ = (id) => document.getElementById(id);
const SEGMENT_SKIP_DEFAULTS = {"sponsor":true,"promotion":true,"selfPromotion":true,"unpaid":true,"nonMusic":true,"intermission":true,"intro":true,"endcards":true,"credits":true,"greetings":true,"preview":true,"recap":true};\nconst DEFAULTS = {segmentSkipOptions:SEGMENT_SKIP_DEFAULTS, enabled:true, trackersEnabled:true, privacyEnabled:true, minersEnabled:true, antiAdblockEnabled:false, readingModeEnabled:false, protectionProfile:"balanced", locale:"en", popupLayout:"comfortable", popupAccent:"mint", hidePopupStats:false, releaseNotesPending:false, allowlist:[], temporaryAllowlist:{}, customBlockDomains:[], communityFilterUrls:[], theme:"system", blockedCount:0, statsBySite:{}, recentBlocks:[], filterUpdate:{status:"not-run",updatedAt:null,message:"Not checked yet"}, extensionUpdate:{status:"not-checked"}};
function normalizeDomain(value) {
  let host = String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/:\d+$/, "");
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/.test(host) ? host : null;
}
function setTheme(theme) {
  const mode = theme === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : theme;
  document.documentElement.dataset.theme = mode;
}
async function settings() { return {...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS)))}; }
function renderUrlList(elementId, urls) {
  const list=$(elementId); list.replaceChildren();
  urls.forEach((url) => {
    const li=document.createElement("li"), label=document.createElement("span"), remove=document.createElement("button");
    label.textContent=url; remove.textContent="Remove"; remove.type="button"; remove.className="secondary";
    remove.addEventListener("click", async () => {
      const latest=await chrome.storage.local.get({communityFilterUrls:[]});
      await chrome.storage.local.set({communityFilterUrls:latest.communityFilterUrls.filter((item)=>item!==url)});
      $("message").textContent="Removed filter subscription."; await render();
    });
    li.append(label,remove); list.append(li);
  });
}
function renderTemporaryAllowlist(entries) {
  const list=$("tempAllowList"); list.replaceChildren();
  Object.entries(entries).filter(([host,expiresAt])=>normalizeDomain(host)&&Number.isFinite(expiresAt)&&expiresAt>Date.now()).sort((a,b)=>a[1]-b[1]).forEach(([host,expiresAt])=>{
    const li=document.createElement("li"), label=document.createElement("span"), remove=document.createElement("button");
    label.textContent=host+" · expires "+new Date(expiresAt).toLocaleString();
    remove.textContent="Remove"; remove.type="button"; remove.className="secondary";
    remove.addEventListener("click",async()=>{
      const latest=await chrome.storage.local.get({temporaryAllowlist:{}});
      const next={...latest.temporaryAllowlist}; delete next[host];
      await chrome.storage.local.set({temporaryAllowlist:next}); await render();
    });
    li.append(label,remove); list.append(li);
  });
}
function renderDomainList(elementId, hosts, storageKey) {
  const list = $(elementId); list.replaceChildren();
  [...hosts].sort().forEach((host) => {
    const li = document.createElement("li"), label = document.createElement("span"), remove = document.createElement("button");
    label.textContent = host; remove.textContent = "Remove"; remove.type = "button"; remove.className = "secondary";
    remove.addEventListener("click", async () => {
      const latest = await chrome.storage.local.get({[storageKey]:[]});
      await chrome.storage.local.set({[storageKey]: latest[storageKey].filter((item) => item !== host)});
      $("message").textContent = "Removed " + host; await render();
    });
    li.append(label, remove); list.append(li);
  });
}
async function render() {
  const s = await settings();
  $("enabled").checked = s.enabled; $("trackersEnabled").checked = s.trackersEnabled; $("privacyEnabled").checked = s.privacyEnabled; $("minersEnabled").checked = s.minersEnabled !== false; $("theme").value = s.theme;
  setTheme(s.theme);\n  const segmentOptions={...SEGMENT_SKIP_DEFAULTS,...(s.segmentSkipOptions||{})}; document.querySelectorAll("[data-segment-option]").forEach(input=>{input.checked=segmentOptions[input.dataset.segmentOption]!==false;});
  renderDomainList("allowList", s.allowlist || [], "allowlist");
  renderTemporaryAllowlist(s.temporaryAllowlist || {});
  renderUrlList("communityList", s.communityFilterUrls || []);
  renderDomainList("blockList", s.customBlockDomains || [], "customBlockDomains");
  $("totalBlocked").textContent = Number(s.blockedCount || 0).toLocaleString();
  $("trackedSites").textContent = Object.keys(s.statsBySite || {}).length.toLocaleString();
  const stats = $("siteStats"); stats.replaceChildren();
  Object.entries(s.statsBySite || {}).sort((a,b) => b[1]-a[1]).slice(0,10).forEach(([host,count]) => {
    const li=document.createElement("li"), name=document.createElement("span"), value=document.createElement("strong");
    name.textContent=host; value.textContent=Number(count).toLocaleString(); li.append(name,value); stats.append(li);
  });
  const extensionUpdate = s.extensionUpdate || {status:"not-checked"};
  $("extensionUpdateStatus").textContent = extensionUpdate.status === "available" ? "Version " + extensionUpdate.latestVersion + " is available (installed: " + extensionUpdate.installedVersion + ")." : extensionUpdate.status === "current" ? "You are using the latest version (" + extensionUpdate.installedVersion + ")." : extensionUpdate.checkError || "Update status has not been checked yet.";
  $("extensionUpdateDetails").textContent = extensionUpdate.checkedAt ? "Last checked: " + new Date(extensionUpdate.checkedAt).toLocaleString() + (extensionUpdate.features?.length ? " · " + extensionUpdate.features.join(" · ") : "") : "";
  const update = s.filterUpdate || DEFAULTS.filterUpdate;
  $("updateStatus").textContent = update.message || update.status;
  $("lastUpdated").textContent = update.updatedAt ? "Last successful update: " + new Date(update.updatedAt).toLocaleString() : "No successful remote update recorded yet.";
}
function bindDomainForm(formId, inputId, key, message) {
  $(formId).addEventListener("submit", async (event) => {
    event.preventDefault();
    const host = normalizeDomain($(inputId).value);
    if (!host) { $("message").textContent = "Enter a valid hostname, such as example.com."; return; }
    const current = await chrome.storage.local.get({[key]:[]});
    if (current[key].includes(host)) { $("message").textContent = "That domain is already in the list."; return; }
    await chrome.storage.local.set({[key]:[...current[key],host]});
    $(inputId).value = ""; $("message").textContent = message + host; await render();
  });
}
$("enabled").addEventListener("change", (e) => chrome.storage.local.set({enabled:e.target.checked}));
$("trackersEnabled").addEventListener("change", (e) => chrome.storage.local.set({trackersEnabled:e.target.checked}));
$("privacyEnabled").addEventListener("change", (e) => chrome.storage.local.set({privacyEnabled:e.target.checked}));
$("minersEnabled").addEventListener("change", (e) => chrome.storage.local.set({minersEnabled:e.target.checked}));
$("theme").addEventListener("change", async (e) => { await chrome.storage.local.set({theme:e.target.value}); setTheme(e.target.value); });
document.querySelectorAll("[data-segment-option]").forEach(input=>input.addEventListener("change",async()=>{const latest=await chrome.storage.local.get({segmentSkipOptions:SEGMENT_SKIP_DEFAULTS});await chrome.storage.local.set({segmentSkipOptions:{...SEGMENT_SKIP_DEFAULTS,...latest.segmentSkipOptions,[input.dataset.segmentOption]:input.checked}});$("segmentSkipStatus").textContent="Saved. Supported segment controls will be skipped when detected."; }));\nbindDomainForm("allowForm","allowHost","allowlist","Allowed ");
$("tempAllowForm").addEventListener("submit",async(event)=>{
  event.preventDefault();
  const host=normalizeDomain($("tempAllowHost").value);
  if(!host){$("message").textContent="Enter a valid hostname, such as example.com.";return;}
  const minutes=Number($("tempAllowDuration").value);
  if(![15,60,1440].includes(minutes)){$("message").textContent="Choose a supported expiry.";return;}
  const latest=await chrome.storage.local.get({temporaryAllowlist:{}});
  latest.temporaryAllowlist[host]=Date.now()+minutes*60*1000;
  await chrome.storage.local.set({temporaryAllowlist:latest.temporaryAllowlist});
  $("tempAllowHost").value=""; $("message").textContent="Temporary allowlist added for "+host; await render();
});
$("communityForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  let url;
  try { url = new URL($("communityUrl").value.trim()); } catch (_) { $("message").textContent="Enter a valid HTTPS JSON URL."; return; }
  if (url.protocol !== "https:") { $("message").textContent="Filter subscriptions must use HTTPS."; return; }
  const current=await chrome.storage.local.get({communityFilterUrls:[]});
  if (current.communityFilterUrls.includes(url.href)) { $("message").textContent="That filter list is already subscribed."; return; }
  if (current.communityFilterUrls.length >= 10) { $("message").textContent="Maximum of 10 community filter lists."; return; }
  await chrome.storage.local.set({communityFilterUrls:[...current.communityFilterUrls,url.href]});
  $("communityUrl").value=""; $("message").textContent="Added filter list. Updating and validating rules…";
  try { const result=await chrome.runtime.sendMessage({type:"update-filters"}); $("message").textContent=result?.message || "Filter update completed."; }
  catch (error) { $("message").textContent="Filter update failed: "+error.message; }
  await render();
});
bindDomainForm("blockForm","blockHost","customBlockDomains","Blocking ");
$("checkExtensionUpdates").addEventListener("click", async () => {
  $("checkExtensionUpdates").disabled = true; $("extensionUpdateStatus").textContent = "Checking GitHub for a newer release…";
  try { const result = await chrome.runtime.sendMessage({type:"check-extension-updates"}); await render(); if (result?.status === "available") $("extensionUpdateStatus").textContent = "Version " + result.latestVersion + " is available. Open the official release page to update."; }
  catch (error) { $("extensionUpdateStatus").textContent = "Update check failed: " + error.message; }
  $("checkExtensionUpdates").disabled = false;
});
$("enableUpdateNotifications").addEventListener("click", async () => {
  try { const granted = await chrome.permissions.request({permissions:["notifications"]});
    if (!granted) { $("extensionUpdateStatus").textContent = "Desktop notifications were not enabled. Update status will still appear here and on the extension badge."; return; }
    $("extensionUpdateStatus").textContent = "Desktop notifications enabled for future updates.";
    const result = await chrome.runtime.sendMessage({type:"check-extension-updates"});
    if (result?.status === "available") $("extensionUpdateStatus").textContent = "Version " + result.latestVersion + " is available. Desktop notifications enabled.";
  } catch (error) { $("extensionUpdateStatus").textContent = "Could not enable notifications: " + error.message; }
});
$("updateFilters").addEventListener("click", async () => {
  $("updateFilters").disabled = true; $("updateStatus").textContent = "Checking trusted filter source…";
  try {
    const result = await chrome.runtime.sendMessage({type:"update-filters"});
    $("updateStatus").textContent = result?.message || "Update request finished.";
  } catch (error) { $("updateStatus").textContent = "Update failed: " + error.message; }
  $("updateFilters").disabled = false; await render();
});
$("clearStats").addEventListener("click", async () => {
  await chrome.storage.local.set({blockedCount:0,statsBySite:{},recentBlocks:[]});
  $("message").textContent = "Local statistics cleared."; await render();
});
$("exportData").addEventListener("click", async () => {
  const s = await settings();
  const backup = {segmentSkipOptions:s.segmentSkipOptions,enabled:s.enabled,trackersEnabled:s.trackersEnabled,privacyEnabled:s.privacyEnabled,minersEnabled:s.minersEnabled,antiAdblockEnabled:s.antiAdblockEnabled,readingModeEnabled:s.readingModeEnabled,protectionProfile:s.protectionProfile,locale:s.locale,popupLayout:s.popupLayout,popupAccent:s.popupAccent,hidePopupStats:s.hidePopupStats,allowlist:s.allowlist,temporaryAllowlist:s.temporaryAllowlist,customBlockDomains:s.customBlockDomains,communityFilterUrls:s.communityFilterUrls,theme:s.theme,blockedCount:s.blockedCount,statsBySite:s.statsBySite,exportedAt:new Date().toISOString()};
  const blob = new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob), link=document.createElement("a");
  link.href=url; link.download="rolex-key-adblocker-settings.json"; link.click(); URL.revokeObjectURL(url);
  $("message").textContent = "Settings exported.";
});
$("restoreDefaults").addEventListener("click",async()=>{
  if(!confirm("Restore default settings and clear site lists, subscriptions, and local statistics?")) return;
  await chrome.storage.local.set({...DEFAULTS,filterUpdate:{status:"not-run",updatedAt:null,message:"Reset to defaults"}});
  $("message").textContent="Default settings restored."; await render();
});
$("importButton").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", async (event) => {
  const file=event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 1024*1024) throw new Error("File is larger than 1 MB.");
    const data=JSON.parse(await file.text());
    const patch={};\n    if(data.segmentSkipOptions&&typeof data.segmentSkipOptions==="object"&&!Array.isArray(data.segmentSkipOptions))patch.segmentSkipOptions=Object.fromEntries(Object.keys(SEGMENT_SKIP_DEFAULTS).map(k=>[k,typeof data.segmentSkipOptions[k]==="boolean"?data.segmentSkipOptions[k]:SEGMENT_SKIP_DEFAULTS[k]]));
    if (typeof data.enabled==="boolean") patch.enabled=data.enabled;
    if (typeof data.trackersEnabled==="boolean") patch.trackersEnabled=data.trackersEnabled;
    if (typeof data.privacyEnabled==="boolean") patch.privacyEnabled=data.privacyEnabled;
    if (typeof data.minersEnabled==="boolean") patch.minersEnabled=data.minersEnabled;
    for(const key of ["antiAdblockEnabled","readingModeEnabled","hidePopupStats"])if(typeof data[key]==="boolean")patch[key]=data[key];
    if(["balanced","strict","minimal","custom"].includes(data.protectionProfile))patch.protectionProfile=data.protectionProfile;
    if(["en","ml"].includes(data.locale))patch.locale=data.locale;
    if(["comfortable","compact"].includes(data.popupLayout))patch.popupLayout=data.popupLayout;
    if(["mint","blue","violet","amber"].includes(data.popupAccent))patch.popupAccent=data.popupAccent;
    if (["system","dark","light"].includes(data.theme)) patch.theme=data.theme;
    for (const key of ["allowlist","customBlockDomains"]) {
      if (Array.isArray(data[key])) patch[key]=[...new Set(data[key].map(normalizeDomain).filter(Boolean))].slice(0,500);
    }
    if (Array.isArray(data.communityFilterUrls)) patch.communityFilterUrls=[...new Set(data.communityFilterUrls.filter((url)=>{try{return typeof url==="string"&&new URL(url).protocol==="https:";}catch(_){return false;}}))].slice(0,10);
    if (data.temporaryAllowlist && typeof data.temporaryAllowlist==="object" && !Array.isArray(data.temporaryAllowlist)) {
      patch.temporaryAllowlist=Object.fromEntries(Object.entries(data.temporaryAllowlist).map(([host,expiresAt])=>[normalizeDomain(host),expiresAt]).filter(([host,expiresAt])=>host&&Number.isFinite(expiresAt)&&expiresAt>Date.now()).slice(0,500));
    }
    if (Number.isFinite(data.blockedCount) && data.blockedCount>=0) patch.blockedCount=Math.floor(data.blockedCount);
    if (data.statsBySite && typeof data.statsBySite==="object" && !Array.isArray(data.statsBySite)) {
      patch.statsBySite=Object.fromEntries(Object.entries(data.statsBySite).filter(([k,v])=>typeof k==="string"&&Number.isFinite(v)&&v>=0).slice(0,500));
    }
    await chrome.storage.local.set(patch);
    $("message").textContent = "Settings imported. Filter lists are not imported from backup.";
  } catch (error) { $("message").textContent = "Import failed: " + error.message; }
  event.target.value=""; await render();
});
chrome.storage.onChanged.addListener(() => { void render(); });
render();
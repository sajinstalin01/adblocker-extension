const $ = (id) => document.getElementById(id);
const DEFAULTS = {enabled:true, trackersEnabled:true, allowlist:[], customBlockDomains:[], communityFilterUrls:[], theme:"system", blockedCount:0, statsBySite:{}, recentBlocks:[], filterUpdate:{status:"not-run",updatedAt:null,message:"Not checked yet"}};
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
  $("enabled").checked = s.enabled; $("trackersEnabled").checked = s.trackersEnabled; $("theme").value = s.theme;
  setTheme(s.theme);
  renderDomainList("allowList", s.allowlist || [], "allowlist");
  renderUrlList("communityList", s.communityFilterUrls || []);
  renderDomainList("blockList", s.customBlockDomains || [], "customBlockDomains");
  $("totalBlocked").textContent = Number(s.blockedCount || 0).toLocaleString();
  $("trackedSites").textContent = Object.keys(s.statsBySite || {}).length.toLocaleString();
  const stats = $("siteStats"); stats.replaceChildren();
  Object.entries(s.statsBySite || {}).sort((a,b) => b[1]-a[1]).slice(0,10).forEach(([host,count]) => {
    const li=document.createElement("li"), name=document.createElement("span"), value=document.createElement("strong");
    name.textContent=host; value.textContent=Number(count).toLocaleString(); li.append(name,value); stats.append(li);
  });
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
$("theme").addEventListener("change", async (e) => { await chrome.storage.local.set({theme:e.target.value}); setTheme(e.target.value); });
bindDomainForm("allowForm","allowHost","allowlist","Allowed ");
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
  const backup = {enabled:s.enabled,trackersEnabled:s.trackersEnabled,allowlist:s.allowlist,customBlockDomains:s.customBlockDomains,communityFilterUrls:s.communityFilterUrls,theme:s.theme,blockedCount:s.blockedCount,statsBySite:s.statsBySite,exportedAt:new Date().toISOString()};
  const blob = new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob), link=document.createElement("a");
  link.href=url; link.download="rolex-key-adblocker-settings.json"; link.click(); URL.revokeObjectURL(url);
  $("message").textContent = "Settings exported.";
});
$("importButton").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", async (event) => {
  const file=event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 1024*1024) throw new Error("File is larger than 1 MB.");
    const data=JSON.parse(await file.text());
    const patch={};
    if (typeof data.enabled==="boolean") patch.enabled=data.enabled;
    if (typeof data.trackersEnabled==="boolean") patch.trackersEnabled=data.trackersEnabled;
    if (["system","dark","light"].includes(data.theme)) patch.theme=data.theme;
    for (const key of ["allowlist","customBlockDomains"]) {
      if (Array.isArray(data[key])) patch[key]=[...new Set(data[key].map(normalizeDomain).filter(Boolean))].slice(0,500);
    }
    if (Array.isArray(data.communityFilterUrls)) patch.communityFilterUrls=[...new Set(data.communityFilterUrls.filter((url)=>typeof url==="string"&&url.startsWith("https://")))].slice(0,10);
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
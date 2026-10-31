(() => {
"use strict";
if(window.__rolexLiveSkipEngine44)return;
window.__rolexLiveSkipEngine44=true;
const MARK="data-rolex-live-ad-cleaned";
const HOSTS=["youtube.com","jiohotstar.com","hotstar.com","primevideo.com","amazon.com","amazon.in","twitch.tv","x.com","twitter.com","sonyliv.com","zee5.com","mxplayer.in","crunchyroll.com","tubitv.com","pluto.tv","hulu.com","peacocktv.com","paramountplus.com"];
const AD_SKIP_SELECTORS=[".ytp-ad-skip-button",".ytp-ad-skip-button-modern",".ytp-skip-ad-button","button[aria-label='Skip ad' i]","button[aria-label='Skip ads' i]","button[title='Skip ad' i]","[data-testid='skip-ad-button']","[data-testid='skip-ad']","button[class*='skip-ad' i]","[role='button'][class*='skip-ad' i]","button[data-action='skip-ad']"];
const SEGMENT_SELECTORS=["[data-segment-type] button","button[data-segment-type]","[data-category] button","button[data-category]","[data-sponsorblock-category] button","button[data-sponsorblock-category]","[data-testid*='skip-segment' i]","button[class*='skip-segment' i]"];
const PAGE_AD_SELECTORS=["[data-ad-slot]","[data-ad-unit]","[data-testid*='ad-banner' i]","[id*='ad-banner' i]","[class*='ad-banner' i]","[aria-label='Advertisement']","iframe[src*='doubleclick.net']","iframe[src*='googlesyndication.com']"];
const DEFAULT_SEGMENTS={sponsor:true,promotion:true,selfPromotion:true,unpaid:true,nonMusic:true,intermission:true,intro:true,endcards:true,credits:true,greetings:true,preview:true,recap:true};
const LABEL_PATTERNS={sponsor:/^(skip\s+)?(sponsor|sponsored segment|paid promotion)(\s+segment)?$/i,promotion:/^(skip\s+)?(promotion|promotional segment|product promotion)$/i,selfPromotion:/^(skip\s+)?(self promotion|creator promotion|channel promotion|selfpromo)$/i,unpaid:/^(skip\s+)?(unpaid plug|community plug|unpaid promotion)$/i,nonMusic:/^(skip\s+)?(non.?music|talking section|spoken segment)(\s+section|\s+segment)?$/i,intermission:/^(skip\s+)?(intermission|break time|mid.?roll break)$/i,intro:/^(skip\s+)?(intro|skip intro|intro animation|intro sequence)$/i,endcards:/^(skip\s+)?(end.?cards?|end screen|end screen segment)$/i,credits:/^(skip\s+)?(credits|credit sequence)$/i,greetings:/^(skip\s+)?(greetings|greeting segment|welcome message|hook and greet)$/i,preview:/^(skip\s+)?(preview|preview segment|preview sequence)$/i,recap:/^(skip\s+)?(recap|previously on|recap segment)$/i};
const SPONSORBLOCK_MAP={sponsor:"sponsor",selfpromo:"selfPromotion",interaction:"greetings",intro:"intro",outro:"endcards",preview:"preview",music_offtopic:"nonMusic",filler:"intermission"};
const host=location.hostname.toLowerCase(),supported=HOSTS.some(d=>host===d||host.endsWith("."+d));
if(!supported)return;
let settings={enabled:true,streamingCleanupEnabled:true,autoSkipEnabled:true,allowlist:[],temporaryAllowlist:{},segmentSkipOptions:DEFAULT_SEGMENTS};
let ready=false,allowed=false,queued=false,lastActionAt=0,fullScanRequested=false;
const pendingRoots=new Set(),clickedAt=new WeakMap();
const isAllowed=()=> (settings.allowlist||[]).some(d=>host===String(d).toLowerCase()||host.endsWith("."+String(d).toLowerCase()))||Object.entries(settings.temporaryAllowlist||{}).some(([d,t])=>Number(t)>Date.now()&&(host===d||host.endsWith("."+d)));
async function readSettings(){try{settings=await chrome.storage.local.get(settings);settings.segmentSkipOptions={...DEFAULT_SEGMENTS,...(settings.segmentSkipOptions||{})};allowed=isAllowed();ready=true;requestScan(document,true);}catch(_){ready=true;allowed=true;}}
function visible(el){if(!(el instanceof HTMLElement)||!el.isConnected||el.disabled||el.getAttribute("aria-disabled")==="true"||el.getAttribute("disabled")!==null||el.getAttribute("aria-hidden")==="true")return false;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;const s=getComputedStyle(el);return s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity||1)>.05&&s.pointerEvents!=="none";}
function cleanLabel(value){return String(value||"").replace(/\s+/g," ").trim().slice(0,100);}
function labelOf(el){return cleanLabel(el.getAttribute("aria-label")||el.getAttribute("title")||el.innerText||el.value||"");}
function categoryFor(el,label){const marker=el.closest("[data-sponsorblock-category],[data-segment-type],[data-category]")||el;const raw=cleanLabel(marker.getAttribute("data-sponsorblock-category")||marker.getAttribute("data-segment-type")||marker.getAttribute("data-category")||"").toLowerCase().replace(/[\s-]+/g,"_");if(SPONSORBLOCK_MAP[raw])return SPONSORBLOCK_MAP[raw];for(const [key,pattern] of Object.entries(LABEL_PATTERNS))if(pattern.test(label))return key;return null;}
function inPlayer(el){return !!el.closest("#movie_player,.html5-video-player,.video-js,[data-testid*='player' i],[class*='player-container' i],[class*='video-player' i],[data-player]");}
function report(el,kind){if(el.hasAttribute("data-rolex-ad-counted"))return;el.setAttribute("data-rolex-ad-counted","1");try{const p=chrome.runtime.sendMessage({type:"record-ad-action",kind});if(p?.catch)p.catch(()=>{});}catch(_){}}
function canAct(){return ready&&supported&&settings.enabled&&settings.streamingCleanupEnabled&&!allowed&&document.visibilityState!=="hidden";}
function clickSkip(el,kind){if(!canAct()||settings.autoSkipEnabled===false||!visible(el)||Date.now()-lastActionAt<300||Date.now()-(clickedAt.get(el)||0)<1200)return false;try{el.click();const now=Date.now();clickedAt.set(el,now);lastActionAt=now;report(el,kind);return true;}catch(_){return false;}}
function collect(root,selector,set){try{if(root instanceof Element&&root.matches(selector))set.add(root);if(root.querySelectorAll)root.querySelectorAll(selector).forEach(el=>set.add(el));}catch(_){}}
function autoSkip(root){
 if(!canAct())return;
 const candidates=new Set();
 for(const selector of AD_SKIP_SELECTORS)collect(root,selector,candidates);
 for(const selector of SEGMENT_SELECTORS)collect(root,selector,candidates);
 const players=new Set();
 if(root instanceof Element){const p=root.closest("#movie_player,.html5-video-player,.video-js,[data-testid*='player' i],[class*='player-container' i],[class*='video-player' i],[data-player]");if(p)players.add(p);}
 collect(root,"#movie_player,.html5-video-player,.video-js,[data-testid*='player' i],[class*='player-container' i],[class*='video-player' i],[data-player]",players);
 for(const player of players){collect(player,"button,[role='button'],input[type='button']",candidates);}
 for(const el of candidates){
  if(!visible(el))continue;
  const label=labelOf(el),adControl=AD_SKIP_SELECTORS.some(sel=>{try{return el.matches(sel);}catch(_){return false;}})||/^skip\s+(?:this\s+)?(?:ad|ads|advertisement)\b/i.test(label)||/^close\s+ad$/i.test(label);
  if(adControl){if(clickSkip(el,"skipClicked"))return;continue;}
  if(!inPlayer(el))continue;
  const category=categoryFor(el,label);
  if(category&&settings.segmentSkipOptions?.[category]!==false&&clickSkip(el,"segmentSkipped"))return;
 }
}
function hidePageAds(root){
 if(!canAct())return;
 for(const selector of PAGE_AD_SELECTORS){const elements=new Set();collect(root,selector,elements);for(const el of elements){
  if(el.hasAttribute(MARK)||el.closest("video,audio,.html5-video-player,#movie_player,#dv-web-player,.atvwebplayersdk-player-container,[class*='video-player' i],[data-testid*='player' i],[role='application']"))continue;
  const r=el.getBoundingClientRect();if(r.width<40||r.height<12||r.width>innerWidth*.9||r.height>innerHeight*.8)continue;
  const known=el.matches("iframe[src*='doubleclick.net'],iframe[src*='googlesyndication.com']"),explicit=el.matches("[data-ad-slot],[data-ad-unit],[data-testid*='ad-banner' i],[id*='ad-banner' i],[class*='ad-banner' i],[aria-label='Advertisement']");if(!known&&!explicit)continue;
  el.dataset.rolexLiveAdDisplay=el.style.getPropertyValue("display");el.dataset.rolexLiveAdPriority=el.style.getPropertyPriority("display");el.setAttribute(MARK,"1");el.style.setProperty("display","none","important");report(el,"pageAdHidden");
 }}
}
function restore(){for(const el of document.querySelectorAll("["+MARK+"]")){const d=el.dataset.rolexLiveAdDisplay||"",p=el.dataset.rolexLiveAdPriority||"";if(d)el.style.setProperty("display",d,p);else el.style.removeProperty("display");el.removeAttribute(MARK);delete el.dataset.rolexLiveAdDisplay;delete el.dataset.rolexLiveAdPriority;}}
function run(){if(!ready)return;if(!settings.enabled||!settings.streamingCleanupEnabled||allowed){restore();return;}if(fullScanRequested){fullScanRequested=false;autoSkip(document);hidePageAds(document);}else{for(const root of pendingRoots){autoSkip(root);hidePageAds(root);}pendingRoots.clear();}}
function requestScan(root,full=false){if(full)fullScanRequested=true;else if(root instanceof Element)pendingRoots.add(root);if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run();});}
function onMutations(records){if(!canAct())return;for(const r of records){if(r.type==="childList"){for(const node of r.addedNodes)if(node instanceof Element)requestScan(node);}else if(r.target instanceof Element)requestScan(r.target.closest("button,[role='button'],input[type='button']")||r.target);}}
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=="local")return;let relevant=false;for(const [key,change] of Object.entries(changes)){if(["enabled","streamingCleanupEnabled","autoSkipEnabled","allowlist","temporaryAllowlist","segmentSkipOptions"].includes(key)){settings[key]=change.newValue;relevant=true;}}if(relevant){settings.segmentSkipOptions={...DEFAULT_SEGMENTS,...(settings.segmentSkipOptions||{})};allowed=isAllowed();if(!settings.enabled||!settings.streamingCleanupEnabled||allowed)restore();else requestScan(document,true);}});
const observer=new MutationObserver(onMutations);
if(document.documentElement||document)observer.observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-label","title","disabled","aria-disabled","aria-hidden","data-segment-type","data-category","data-sponsorblock-category","data-testid"]});
window.addEventListener("yt-navigate-finish",()=>requestScan(document,true));window.addEventListener("popstate",()=>requestScan(document,true));document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")requestScan(document,true);});
void readSettings();
})();
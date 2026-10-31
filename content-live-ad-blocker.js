(() => {
"use strict";
if(window.__rolexLiveSkipLoaded)return;window.__rolexLiveSkipLoaded=true;
const MARK="data-rolex-live-ad-cleaned";
const HOSTS=["youtube.com","jiohotstar.com","hotstar.com","primevideo.com","amazon.com","amazon.in","twitch.tv","x.com","twitter.com","sonyliv.com","zee5.com","mxplayer.in","crunchyroll.com","tubitv.com","pluto.tv","hulu.com","peacocktv.com","paramountplus.com"];
const AD_SKIP_SELECTORS=[
".ytp-ad-skip-button",".ytp-ad-skip-button-modern",".ytp-skip-ad-button",
"button[aria-label='Skip ad' i]","button[aria-label='Skip ads' i]","button[title='Skip ad' i]",
"[data-testid='skip-ad-button']","[data-testid='skip-ad']","button[class*='skip-ad' i]",
"[role='button'][class*='skip-ad' i]","button[data-action='skip-ad']"
];
const SEGMENT_SELECTORS=[
"[data-segment-type] button","button[data-segment-type]","[data-category] button","button[data-category]",
"[data-sponsorblock-category] button","button[data-sponsorblock-category]",
"[data-testid*='skip-segment' i]","button[class*='skip-segment' i]"
];
const PAGE_AD_SELECTORS=["[data-ad-slot]","[data-ad-unit]","[data-testid*='ad-banner' i]","[id*='ad-banner' i]","[class*='ad-banner' i]","[aria-label='Advertisement']","iframe[src*='doubleclick.net']","iframe[src*='googlesyndication.com']"];
const DEFAULT_SEGMENTS={sponsor:true,promotion:true,selfPromotion:true,unpaid:true,nonMusic:true,intermission:true,intro:true,endcards:true,credits:true,greetings:true,preview:true,recap:true};
const LABEL_PATTERNS={
 sponsor:/^(skip\s+)?(sponsor|sponsored segment|paid promotion)(\s+segment)?$/i,
 promotion:/^(skip\s+)?(promotion|promotional segment|product promotion)$/i,
 selfPromotion:/^(skip\s+)?(self promotion|creator promotion|channel promotion|selfpromo)$/i,
 unpaid:/^(skip\s+)?(unpaid plug|community plug|unpaid promotion)$/i,
 nonMusic:/^(skip\s+)?(non.?music|talking section|spoken segment)(\s+section|\s+segment)?$/i,
 intermission:/^(skip\s+)?(intermission|break time|mid.?roll break)$/i,
 intro:/^(skip\s+)?(intro|skip intro|intro animation|intro sequence)$/i,
 endcards:/^(skip\s+)?(end.?cards?|end screen|end screen segment)$/i,
 credits:/^(skip\s+)?(credits|credit sequence)$/i,
 greetings:/^(skip\s+)?(greetings|greeting segment|welcome message|hook and greet)$/i,
 preview:/^(skip\s+)?(preview|preview segment|preview sequence)$/i,
 recap:/^(skip\s+)?(recap|previously on|recap segment)$/i
};
const SPONSORBLOCK_MAP={sponsor:"sponsor",selfpromo:"selfPromotion",interaction:"greetings",intro:"intro",outro:"endcards",preview:"preview",music_offtopic:"nonMusic",filler:"intermission"};
const host=location.hostname.toLowerCase(),supported=HOSTS.some(d=>host===d||host.endsWith("."+d));
let settings={enabled:true,streamingCleanupEnabled:true,autoSkipEnabled:true,allowlist:[],temporaryAllowlist:{},segmentSkipOptions:DEFAULT_SEGMENTS};
let ready=false,allowed=false,queued=false,lastActionAt=0;
const isAllowed=()=> (settings.allowlist||[]).some(d=>host===String(d).toLowerCase()||host.endsWith("."+String(d).toLowerCase()))||Object.entries(settings.temporaryAllowlist||{}).some(([d,t])=>Number(t)>Date.now()&&(host===d||host.endsWith("."+d)));
async function readSettings(){try{settings=await chrome.storage.local.get(settings);allowed=isAllowed();ready=true;}catch(_){ready=true;allowed=true;}}
function visible(el){if(!el?.isConnected||el.disabled||el.getAttribute("aria-disabled")==="true"||el.getAttribute("disabled")!==null)return false;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;const s=getComputedStyle(el);return s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity||1)>.05&&s.pointerEvents!=="none";}
function cleanLabel(value){return String(value||"").replace(/\s+/g," ").trim().slice(0,100);}
function labelOf(el){return cleanLabel(el.getAttribute("aria-label")||el.getAttribute("title")||el.innerText||el.value||"");}
function categoryFor(el,label){
 const raw=cleanLabel(el.getAttribute("data-sponsorblock-category")||el.getAttribute("data-segment-type")||el.getAttribute("data-category")||"").toLowerCase().replace(/[\s-]+/g,"_");
 if(SPONSORBLOCK_MAP[raw])return SPONSORBLOCK_MAP[raw];
 for(const [key,pattern] of Object.entries(LABEL_PATTERNS))if(pattern.test(label))return key;
 return null;
}
function inPlayer(el){return !!el.closest("#movie_player,.html5-video-player,.video-js,[data-testid*='player' i],[class*='player-container' i],[class*='video-player' i],[data-player]");}
function report(el,kind){if(el.hasAttribute("data-rolex-ad-counted"))return;el.setAttribute("data-rolex-ad-counted","1");try{chrome.runtime.sendMessage({type:"record-ad-action",kind}).catch(()=>{});}catch(_){}}
function canAct(){return ready&&supported&&settings.enabled&&settings.streamingCleanupEnabled&&settings.autoSkipEnabled&&!allowed&&document.visibilityState!=="hidden";}
function clickSkip(el,kind){if(!canAct()||!visible(el)||Date.now()-lastActionAt<350)return false;try{el.click();lastActionAt=Date.now();report(el,kind);return true;}catch(_){return false;}}
function autoSkip(){
 if(!canAct())return;
 const candidates=new Set();
 for(const selector of AD_SKIP_SELECTORS){try{document.querySelectorAll(selector).forEach(el=>candidates.add(el));}catch(_){}}
 for(const selector of SEGMENT_SELECTORS){try{document.querySelectorAll(selector).forEach(el=>candidates.add(el));}catch(_){}}
 // A small, bounded semantic scan inside recognized player roots catches controls whose class names change.
 for(const root of document.querySelectorAll("#movie_player,.html5-video-player,.video-js,[data-testid*='player' i],[class*='player-container' i],[class*='video-player' i]")){
  for(const el of root.querySelectorAll("button,[role='button'],input[type='button']")){const label=labelOf(el);if(/^skip\s+(?:this\s+)?(?:ad|ads|advertisement)\b/i.test(label)||categoryFor(el,label))candidates.add(el);}
 }
 for(const el of candidates){
  if(!visible(el))continue;
  const label=labelOf(el);
  const adControl=AD_SKIP_SELECTORS.some(sel=>{try{return el.matches(sel);}catch(_){return false;}})||/^skip\s+(?:this\s+)?(?:ad|ads|advertisement)\b/i.test(label)||/^close\s+ad$/i.test(label);
  if(adControl){if(clickSkip(el,"skipClicked"))return;continue;}
  if(!inPlayer(el))continue;
  const category=categoryFor(el,label);
  if(category&&settings.segmentSkipOptions?.[category]!==false){if(clickSkip(el,"segmentSkipped"))return;}
 }
}
function hidePageAds(){
 if(!ready||!supported||!settings.enabled||!settings.streamingCleanupEnabled||allowed)return;
 for(const el of document.querySelectorAll(PAGE_AD_SELECTORS.join(","))){
  if(el.hasAttribute(MARK)||el.closest("video,audio,.html5-video-player,#movie_player,#dv-web-player,.atvwebplayersdk-player-container,[class*='video-player' i],[data-testid*='player' i],[role='application']"))continue;
  const r=el.getBoundingClientRect();if(r.width<40||r.height<12||r.width>innerWidth*.9||r.height>innerHeight*.8)continue;
  const known=el.matches("iframe[src*='doubleclick.net'],iframe[src*='googlesyndication.com']");
  const explicit=el.matches("[data-ad-slot],[data-ad-unit],[data-testid*='ad-banner' i],[id*='ad-banner' i],[class*='ad-banner' i],[aria-label='Advertisement']");
  if(!known&&!explicit)continue;
  el.dataset.rolexLiveAdDisplay=el.style.getPropertyValue("display");el.dataset.rolexLiveAdPriority=el.style.getPropertyPriority("display");el.setAttribute(MARK,"1");el.style.setProperty("display","none","important");report(el,"pageAdHidden");
 }
}
function restore(){for(const el of document.querySelectorAll("["+MARK+"]")){const d=el.dataset.rolexLiveAdDisplay||"",p=el.dataset.rolexLiveAdPriority||"";if(d)el.style.setProperty("display",d,p);else el.style.removeProperty("display");el.removeAttribute(MARK);delete el.dataset.rolexLiveAdDisplay;delete el.dataset.rolexLiveAdPriority;}}
function run(){if(!ready)return;if(!settings.enabled||!settings.streamingCleanupEnabled||allowed){restore();return;}autoSkip();hidePageAds();}
function queue(){if(queued)return;queued=true;setTimeout(()=>{queued=false;run();},120);}
function onMutations(records){for(const r of records){if(r.type==="childList"&&r.addedNodes.length){queue();return;}if(r.type==="attributes"){queue();return;}}}
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=="local")return;for(const [k,v] of Object.entries(changes))settings[k]=v.newValue;allowed=isAllowed();queue();});
const observer=new MutationObserver(onMutations);
if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-label","title","disabled","aria-disabled","data-segment-type","data-category","data-sponsorblock-category","data-testid"]});
window.addEventListener("yt-navigate-finish",queue);window.addEventListener("popstate",queue);document.addEventListener("visibilitychange",queue);
(async()=>{await readSettings();run();})();
})();
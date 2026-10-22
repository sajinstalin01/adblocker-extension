(()=>{"use strict";
const MARK="data-rolex-live-ad-cleaned";
const HOSTS=["youtube.com","jiohotstar.com","hotstar.com","primevideo.com","amazon.com","amazon.in","twitch.tv","x.com","twitter.com","sonyliv.com","zee5.com","mxplayer.in","crunchyroll.com","tubitv.com","pluto.tv","hulu.com","peacocktv.com","paramountplus.com"];
const PLAYER_SKIP_SELECTORS=[
  ".ytp-ad-skip-button",
  ".ytp-ad-skip-button-modern",
  ".ytp-skip-ad-button",
  "button[aria-label='Skip ad']",
  "button[aria-label='Skip Ads']",
  "button[title='Skip ad']",
  "[data-testid='skip-ad-button']",
  "[data-testid='skip-ad']",
  "button[class*='skip-ad' i]",
  "[role='button'][class*='skip-ad' i]"
];
const PAGE_AD_SELECTORS=["[data-ad-slot]","[data-ad-unit]","[data-testid*='ad-banner' i]","[id*='ad-banner' i]","[class*='ad-banner' i]","[aria-label='Advertisement']","iframe[src*='doubleclick.net']","iframe[src*='googlesyndication.com']"];
let enabled=true,allowed=false,queued=false,settingsReady=false,lastSkipAt=0;
const host=location.hostname.toLowerCase();
const supported=HOSTS.some(d=>host===d||host.endsWith("."+d));
const matchesAllowlist=domains=>(domains||[]).some(d=>host===String(d).toLowerCase()||host.endsWith("."+String(d).toLowerCase()));
async function readSettings(){try{const s=await chrome.storage.local.get({enabled:true,streamingCleanupEnabled:true,allowlist:[],temporaryAllowlist:{}});enabled=!!(s.enabled&&s.streamingCleanupEnabled);allowed=matchesAllowlist(s.allowlist)||Object.entries(s.temporaryAllowlist||{}).some(([d,t])=>Number(t)>Date.now()&&(host===d||host.endsWith("."+d)));settingsReady=true;}catch(_){enabled=false;allowed=true;settingsReady=true;}}
function visible(el){if(!el?.isConnected||el.disabled||el.getAttribute("aria-disabled")==="true")return false;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;const style=getComputedStyle(el);return style.display!=="none"&&style.visibility!=="hidden"&&Number(style.opacity||1)>0;}
function labelOf(el){return [el.innerText,el.getAttribute("aria-label"),el.getAttribute("title"),el.value].filter(Boolean).join(" ").replace(/\s+/g," ").trim();}
function safeSkip(){if(!supported||!settingsReady||!enabled||allowed)return;const candidates=new Set();for(const selector of PLAYER_SKIP_SELECTORS){try{document.querySelectorAll(selector).forEach(el=>candidates.add(el));}catch(_){}}for(const el of document.querySelectorAll("button,[role='button'],input[type='button']")){const label=labelOf(el);if(/^(skip\s*(?:this\s*)?(?:ad|ads|advertisement)|skip\s*ad\s*in\s*\d+|close\s*ad)$/i.test(label))candidates.add(el);}if(!candidates.size)return;for(const button of candidates){if(!visible(button))continue;const label=labelOf(button);const explicitSelector=PLAYER_SKIP_SELECTORS.some(selector=>{try{return button.matches(selector);}catch(_){return false;}});const explicitLabel=/^(skip\s*(?:this\s*)?(?:ad|ads|advertisement)|skip\s*ad\s*in\s*\d+|close\s*ad)$/i.test(label);if(!explicitSelector&&!explicitLabel)continue;if(/skip\s*intro|skip\s*recap|next\s*episode|skip\s*credits/i.test(label))continue;if(Date.now()-lastSkipAt<900)return;try{button.click();lastSkipAt=Date.now();}catch(_){/* Fail open; never alter media playback. */}return;}}
function hideClearlyMarkedPageAds(){if(!supported||!settingsReady||!enabled||allowed)return;for(const el of document.querySelectorAll(PAGE_AD_SELECTORS.join(","))){if(el.hasAttribute(MARK)||el.closest("video,audio,.html5-video-player,#movie_player,#dv-web-player,.atvwebplayersdk-player-container,[class*='video-player' i],[data-testid*='player' i],[role='application']"))continue;const r=el.getBoundingClientRect();if(r.width<40||r.height<12||r.width>innerWidth*.9||r.height>innerHeight*.8)continue;const isKnownFrame=el.matches("iframe[src*='doubleclick.net'],iframe[src*='googlesyndication.com']");const explicit=el.matches("[data-ad-slot],[data-ad-unit],[data-testid*='ad-banner' i],[id*='ad-banner' i],[class*='ad-banner' i],[aria-label='Advertisement']");if(!isKnownFrame&&!explicit)continue;el.dataset.rolexLiveAdDisplay=el.style.getPropertyValue("display");el.dataset.rolexLiveAdPriority=el.style.getPropertyPriority("display");el.setAttribute(MARK,"1");el.style.setProperty("display","none","important");}}
function restore(){for(const el of document.querySelectorAll("["+MARK+"]")){const d=el.dataset.rolexLiveAdDisplay||"",p=el.dataset.rolexLiveAdPriority||"";if(d)el.style.setProperty("display",d,p);else el.style.removeProperty("display");el.removeAttribute(MARK);delete el.dataset.rolexLiveAdDisplay;delete el.dataset.rolexLiveAdPriority;}}
async function run(){await readSettings();if(!enabled||allowed){restore();return;}safeSkip();hideClearlyMarkedPageAds();}
function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;void run();});}
chrome.storage.onChanged.addListener(queue);
new MutationObserver(queue).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-label","title","class","data-ad-slot","data-ad-unit"]});
window.addEventListener("yt-navigate-finish",queue);window.addEventListener("popstate",queue);
void run();
})();
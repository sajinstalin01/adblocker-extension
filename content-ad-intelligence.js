(() => {
"use strict";
if(window.__rolexAdIntelligence45)return;window.__rolexAdIntelligence45=true;
const host=location.hostname.toLowerCase(),yt=host==="youtube.com"||host.endsWith(".youtube.com"),dm=host==="dailymotion.com"||host.endsWith(".dailymotion.com")||host==="dai.ly";
if(!yt&&!dm)return;
let cfg={enabled:true,adLeakDetectionEnabled:true,dailymotionProtectionEnabled:true,antiAdblockAlertsEnabled:true,adNotificationsEnabled:true,allowlist:[],temporaryAllowlist:{}};
const seen=new Map();let queued=false;
const resourceRE=/doubleclick\.net|googlesyndication\.com|googleadservices\.com|youtube\.com\/api\/stats\/ads|youtube\.com\/pagead|adsystem|adserver|dailymotion.*\/ads?\//i;
const adSelectors=[".video-ads",".ytp-ad-module",".ytp-ad-player-overlay",".ytp-ad-overlay-container","[class*='advertisement' i]","[data-ad]","[data-testid*='ad-' i]","[class*='ad-container' i]"];
const warningSelectors=["[class*='adblock' i]","[id*='adblock' i]","[class*='anti-adblock' i]","[data-testid*='adblock' i]"];
function isAllowed(){return(cfg.allowlist||[]).some(d=>host===d||host.endsWith("."+d))||Object.entries(cfg.temporaryAllowlist||{}).some(([d,t])=>Number(t)>Date.now()&&(host===d||host.endsWith("."+d)));}
function emit(type,detail){const key=type+"|"+detail;if(seen.has(key)&&Date.now()-seen.get(key)<60000)return;seen.set(key,Date.now());if(seen.size>250){for(const[k,t]of seen)if(Date.now()-t>60000)seen.delete(k);}try{chrome.runtime.sendMessage({type:"rolex-ad-intelligence-event",event:{type,detail:String(detail).slice(0,140)}}).catch(()=>{});}catch(_){}}
function visible(el){if(!(el instanceof HTMLElement)||!el.isConnected)return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>20&&r.height>10&&s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity||1)>.05;}
function label(el){return String(el.innerText||el.getAttribute("aria-label")||"").replace(/\s+/g," ").trim().slice(0,180);}
function scan(){queued=false;if(!cfg.enabled||isAllowed())return;
 if((yt&&cfg.adLeakDetectionEnabled)||(dm&&cfg.dailymotionProtectionEnabled))for(const sel of adSelectors){let nodes=[];try{nodes=document.querySelectorAll(sel);}catch(_){}for(const el of [...nodes].slice(0,25))if(visible(el))emit(yt?"ad-leak":"dailymotion-ad-marker",label(el)||"Known advertising placement marker detected");}
 if(cfg.antiAdblockAlertsEnabled){for(const sel of warningSelectors){let nodes=[];try{nodes=document.querySelectorAll(sel);}catch(_){}for(const el of [...nodes].slice(0,12))if(visible(el)){const t=label(el);if(/ad.?block|disable.*(block|extension)|turn off.*(block|extension)|ads? blocked|blocking ads/i.test(t))emit("anti-adblock-warning",t||"Possible warning overlay");}}
 const body=(document.body?.innerText||"").slice(0,10000),m=body.match(/(?:please\s+)?(?:disable|turn\s+off)\s+(?:your\s+)?(?:ad.?block(?:er)?|advertising blocker)|ad.?block(?:er)?\s+detected/i);if(m)emit("anti-adblock-warning",m[0]);}}
 function schedule(){if(queued)return;queued=true;(window.requestIdleCallback||((fn)=>setTimeout(fn,180)))(scan,{timeout:600});}
 async function load(){try{cfg={...cfg,...await chrome.storage.local.get(Object.keys(cfg))};}catch(_){}schedule();}
 const mo=new MutationObserver(schedule);function start(){if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class","style","aria-label","data-ad","data-testid"]});schedule();}
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
 try{new PerformanceObserver(list=>{if(!cfg.enabled||isAllowed())return;for(const e of list.getEntries())if(resourceRE.test(e.name)){if(yt&&cfg.adLeakDetectionEnabled)emit("ad-leak","Advertising-related resource observed");else if(dm&&cfg.dailymotionProtectionEnabled)emit("dailymotion-ad-marker","Advertising-related resource observed");}}).observe({type:"resource",buffered:true});}catch(_){}
 chrome.storage.onChanged.addListener((changes,area)=>{if(area!=="local")return;for(const k of Object.keys(cfg))if(changes[k])cfg[k]=changes[k].newValue;schedule();});load();
})();
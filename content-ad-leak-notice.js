(() => {
"use strict";
if(window.__rolexLeakNotice46)return;window.__rolexLeakNotice46=true;
const host=location.hostname.toLowerCase();if(host!=="youtube.com"&&!host.endsWith(".youtube.com"))return;
const KEY="rolexAdLeakNoticeState";
let enabled=true,allowlist=[],temporaryAllowlist={},lastVideo="",adStartedAt=0,reportedForVideo="",poller=null,notice=null;
const now=()=>Date.now();
function allowed(){return allowlist.some(d=>host===d||host.endsWith("."+d))||Object.entries(temporaryAllowlist).some(([d,t])=>Number(t)>now()&&(host===d||host.endsWith("."+d)));}
async function state(){try{return await chrome.storage.local.get({[KEY]:{count:0,videoIds:[],lastShownAt:0,dismissedAt:0,optOut:false,reported:0}}).then(x=>x[KEY]||{});}catch(_){return {};}}
async function save(patch){const s=await state();await chrome.storage.local.set({[KEY]:{...s,...patch}});}
function videoId(){try{return new URL(location.href).searchParams.get("v")||location.pathname.split("/").filter(Boolean).pop()||"unknown";}catch(_){return "unknown";}}
function adActive(){const p=document.querySelector("#movie_player");return !!(p&&(p.classList.contains("ad-showing")||p.querySelector(".ytp-ad-player-overlay,.ytp-ad-skip-button,.ytp-ad-preview-container")));}
function removeNotice(){notice?.remove();notice=null;}
function makeNotice(){
 if(notice||!document.documentElement)return;
 const root=document.createElement("div");root.id="rolex-key-ad-leak-notice";
 root.style.cssText="position:fixed;z-index:2147483647;right:18px;bottom:18px;width:min(360px,calc(100vw - 36px));background:#101827;color:#fff;border:1px solid #38506d;border-radius:14px;box-shadow:0 12px 40px #0008;padding:16px;font:14px/1.45 system-ui,sans-serif";
 const title=document.createElement("div");title.textContent="Rolex Key · Possible ad leak";title.style.cssText="font-weight:700;font-size:15px;margin-bottom:7px";
 const body=document.createElement("p");body.textContent="An ad appeared during more than one video. Detection is heuristic; this notice helps collect a useful report.";body.style.cssText="margin:0 0 12px;color:#d4deea";
 const actions=document.createElement("div");actions.style.cssText="display:flex;gap:7px;flex-wrap:wrap";
 function button(text,fn){const b=document.createElement("button");b.type="button";b.textContent=text;b.style.cssText="border:0;border-radius:8px;padding:8px 10px;background:#2463eb;color:#fff;font:600 12px system-ui;cursor:pointer";b.addEventListener("click",fn);actions.append(b);}
 button("Report detection",async()=>{const s=await state();await save({reported:(s.reported||0)+1,lastReportAt:now()});body.textContent="Thanks. A local report was recorded; no page content or personal data was sent.";actions.replaceChildren();button("Close",removeNotice);});
 button("Dismiss",async()=>{await save({dismissedAt:now()});removeNotice();});
 button("Turn off notices",async()=>{await chrome.storage.local.set({adLeakNoticesEnabled:false});enabled=false;removeNotice();});
 root.append(title,body,actions);document.documentElement.append(root);notice=root;
}
async function checkNotice(){
 if(!enabled||allowed())return;
 const s=await state();if(s.optOut||now()-(s.dismissedAt||0)<7*86400000||now()-(s.lastShownAt||0)<24*3600000)return;
 if((s.count||0)>=2){await save({lastShownAt:now()});makeNotice();}
}
async function tick(){
 if(!enabled||allowed())return;
 const id=videoId();if(id!==lastVideo){lastVideo=id;adStartedAt=0;}
 if(adActive()){
  if(!adStartedAt)adStartedAt=now();
  if(now()-adStartedAt>=3000&&reportedForVideo!==id){
   reportedForVideo=id;const s=await state(),ids=Array.isArray(s.videoIds)?s.videoIds:[];
   if(!ids.includes(id)){const next=ids.concat(id).slice(-10);await save({videoIds:next,count:next.length});}
   await checkNotice();
  }
 }else adStartedAt=0;
}
async function init(){try{const cfg=await chrome.storage.local.get({enabled:true,allowlist:[],temporaryAllowlist:{},adLeakNoticesEnabled:true});enabled=cfg.enabled!==false&&cfg.adLeakNoticesEnabled!==false;allowlist=cfg.allowlist||[];temporaryAllowlist=cfg.temporaryAllowlist||{};}catch(_){}if(enabled&&!allowed()){poller=setInterval(()=>{void tick();},750);}}
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=="local")return;if(changes.enabled)enabled=changes.enabled.newValue!==false&&enabled;if(changes.adLeakNoticesEnabled)enabled=changes.adLeakNoticesEnabled.newValue!==false;if(changes.allowlist)allowlist=changes.allowlist.newValue||[];if(changes.temporaryAllowlist)temporaryAllowlist=changes.temporaryAllowlist.newValue||{};if(!enabled||allowed()){clearInterval(poller);removeNotice();}});
window.addEventListener("yt-navigate-finish",()=>{lastVideo="";adStartedAt=0;reportedForVideo="";});
init();
})();
(() => {
"use strict";
if(window.__rolexAdvancedLoaded)return;window.__rolexAdvancedLoaded=true;
const host=location.hostname.toLowerCase(),safe=s=>String(s||"").slice(0,180);
function event(type,detail){chrome.runtime.sendMessage({type:"rolex-advanced-event",event:{type,host,detail:safe(detail),at:new Date().toISOString()}}).catch(()=>{});}
function visible(el){const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>80&&r.height>24&&s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity||1)>.05;}
function adLike(el){const t=[el.getAttribute("aria-label"),el.getAttribute("data-testid"),el.getAttribute("data-ad"),el.id,el.className,el.innerText?.slice(0,120)].join(" ").toLowerCase();return /(^|[\s_-])(advertisement|advert|sponsored|promoted|ad-slot|ad-container|ad-banner|doubleclick)([\s_-]|$)/i.test(t);}
function safeAd(el){if(!(el instanceof HTMLElement)||!visible(el)||el.matches("body,main,article,video,iframe,canvas,header,nav,footer,[role=main]")||el.querySelector("video"))return false;const r=el.getBoundingClientRect();return r.width*r.height<innerWidth*innerHeight*.42&&adLike(el);}
function selectorFor(el){if(el.id&&/^[a-zA-Z][\w-]{0,80}$/.test(el.id))return "#"+CSS.escape(el.id);const parts=[];let n=el;while(n&&n.nodeType===1&&n!==document.body&&parts.length<5){let p=n.tagName.toLowerCase(),c=[...n.classList].filter(x=>/^[\w-]+$/.test(x)).slice(0,2);if(c.length)p+="."+c.map(CSS.escape).join(".");const par=n.parentElement;if(par){const same=[...par.children].filter(x=>x.tagName===n.tagName);if(same.length>1)p+=":nth-of-type("+(same.indexOf(n)+1)+")";}parts.unshift(p);n=par;}return parts.join(" > ");}
let picker=false,highlight=null;
function stop(){picker=false;document.removeEventListener("click",pick,true);document.removeEventListener("mouseover",move,true);document.documentElement.style.cursor="";if(highlight)highlight.style.outline="";}
function pick(e){if(!picker)return;const el=e.target;if(!(el instanceof HTMLElement)||el===document.documentElement)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const selector=selectorFor(el);chrome.runtime.sendMessage({type:"rolex-save-element-rule",host,selector,preview:(el.innerText||"").slice(0,80)}).catch(()=>{});event("element-rule-created",selector);stop();}
function move(e){if(!picker||!(e.target instanceof HTMLElement))return;if(highlight)highlight.style.outline="";highlight=e.target;highlight.style.setProperty("outline","2px solid #16c79a","important");}
chrome.runtime.onMessage.addListener(m=>{if(m?.type==="rolex-start-element-picker"){picker=true;document.addEventListener("click",pick,true);document.addEventListener("mouseover",move,true);document.documentElement.style.cursor="crosshair";}if(m?.type==="rolex-stop-element-picker")stop();});
async function clean(){const s=await chrome.storage.local.get({enabled:true,allowlist:[],temporaryAllowlist:{},advancedSettings:{},customElementRules:{}});const allowed=(s.allowlist||[]).some(d=>host===d||host.endsWith("."+d))||Object.entries(s.temporaryAllowlist||{}).some(([d,t])=>t>Date.now()&&(host===d||host.endsWith("."+d)));if(!s.enabled||allowed)return;const a=s.advancedSettings||{};if(a.smartDetection!==false)for(const el of document.querySelectorAll("div,aside,section,iframe"))if(safeAd(el)&&!el.dataset.rolexAdvanced){el.dataset.rolexAdvanced="1";el.style.setProperty("display","none","important");event("element-hidden","Ad-labelled page element");}
if(a.floatingAdCleanup!==false)for(const el of document.querySelectorAll("[class*='floating-ad'],[id*='floating-ad'],[class*='sticky-ad'],[data-ad='true']"))if(safeAd(el)&&!el.dataset.rolexAdvanced){el.dataset.rolexAdvanced="1";el.style.setProperty("display","none","important");event("floating-ad-hidden","Floating ad container");}
if(a.cookieCleanup){for(const el of document.querySelectorAll("[role=dialog],[aria-modal=true],aside,section")){if(!visible(el))continue;const t=(el.innerText||"").slice(0,700).toLowerCase();if(!/(cookie|cookies|consent|privacy choices)/.test(t)||!/(accept|reject|manage|preferences)/.test(t))continue;const b=[...el.querySelectorAll("button")].find(x=>/reject all|necessary only|decline optional/i.test(x.innerText||x.getAttribute("aria-label")||""));if(b&&!b.disabled){b.click();event("cookie-choice","Explicit reject/necessary-only control");}}}
if(a.customCssEnabled!==false)for(const r of s.customElementRules?.[host]||[]){try{if(r.selector&&r.selector.length<500)document.querySelectorAll(r.selector).forEach(el=>{if(el instanceof HTMLElement&&!el.matches("body,main,article,video"))el.style.setProperty("display","none","important");});}catch(_){}}
}
function warnSuspiciousHost(settings){
  if(settings.advancedSettings?.phishingWarnings===false)return;
  const puny=host.includes("xn--"),ip=/^(?:\\d{1,3}\\.){3}\\d{1,3}$/.test(host);
  const brands=["google","microsoft","apple","paypal","amazon","facebook","instagram","netflix"];
  const lookalike=brands.some(b=>host.includes(b)&&!host.endsWith("."+b+".com")&&!host.endsWith(b+".com")&&host.split(".").some(part=>part.includes(b)&&part!==b));
  if(!puny&&!ip&&!lookalike)return;
  if(document.getElementById("rolex-suspicious-host-warning"))return;
  const bar=document.createElement("div");bar.id="rolex-suspicious-host-warning";bar.textContent="Rolex Key warning: this address has characteristics sometimes used by deceptive websites. Verify the domain before entering passwords or payment details.";
  Object.assign(bar.style,{position:"fixed",top:"0",left:"0",right:"0",zIndex:"2147483647",padding:"12px 18px",background:"#8b241e",color:"#fff",font:"bold 14px system-ui",textAlign:"center",boxShadow:"0 2px 12px #0008"});
  (document.documentElement||document.body).appendChild(bar);event("suspicious-host-warning","Heuristic hostname warning");
 }
 function monitorBrokenPage(){
  let errors=0;window.addEventListener("error",()=>{errors++;},{capture:true});
  setTimeout(()=>{const text=(document.body?.innerText||"").trim();const blank=!text&&!(document.querySelector("img,video,canvas,iframe,main,[role=main]"));if((blank||errors>=8)&&!document.getElementById("rolex-recovery-hint")){const hint=document.createElement("div");hint.id="rolex-recovery-hint";hint.textContent="Rolex Key detected a possibly incomplete page load. Try reloading, or temporarily allow this website if content is missing.";Object.assign(hint.style,{position:"fixed",bottom:"12px",right:"12px",zIndex:"2147483646",maxWidth:"340px",padding:"12px",background:"#172b3b",color:"#fff",borderRadius:"10px",font:"13px system-ui",boxShadow:"0 4px 18px #0008"});document.documentElement.appendChild(hint);event("possible-page-load-issue","Blank page or repeated resource errors");}},8000);
 }
function init(){clean();chrome.storage.local.get({advancedSettings:{}}).then(warnSuspiciousHost);monitorBrokenPage();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;clean();});}).observe(document.documentElement,{childList:true,subtree:true});chrome.storage.onChanged.addListener(clean);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
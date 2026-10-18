import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const exists=(p)=>assert.ok(fs.existsSync(path.join(root,p)),`Missing file: ${p}`);
const manifest=JSON.parse(read("manifest.json"));
assert.equal(manifest.manifest_version,3,"Manifest V3 is required");
assert.match(manifest.version,/^3\.0\.0$/,"Expected v3.0.0");
assert.ok(manifest.minimum_chrome_version,"Declare the supported Chrome baseline");
for(const file of [manifest.background?.service_worker,manifest.action?.default_popup,manifest.options_page]) if(file) exists(file);
for(const entry of manifest.content_scripts||[]) for(const file of entry.js||[]) exists(file);
const allowedTypes=new Set(["main_frame","sub_frame","stylesheet","script","image","font","object","xmlhttprequest","ping","csp_report","media","websocket","webtransport","webbundle","other"]);
const rulesetIds=new Set();
for(const item of manifest.declarative_net_request.rule_resources){
  assert.ok(!rulesetIds.has(item.id),`Duplicate ruleset id: ${item.id}`); rulesetIds.add(item.id);
  exists(item.path);
  const rules=JSON.parse(read(item.path)); assert.ok(Array.isArray(rules),`${item.path} must be an array`);
  const ids=new Set();
  for(const rule of rules){
    assert.ok(Number.isInteger(rule.id)&&rule.id>0,`${item.path}: invalid id`);
    assert.ok(!ids.has(rule.id),`${item.path}: duplicate id ${rule.id}`); ids.add(rule.id);
    assert.equal(rule.action?.type,"block",`${item.path}: expected block action`);
    assert.ok(typeof rule.condition?.urlFilter==="string"&&rule.condition.urlFilter.length>0,`${item.path}: missing urlFilter`);
    assert.ok(Array.isArray(rule.condition.resourceTypes)&&rule.condition.resourceTypes.length>0,`${item.path}: missing resourceTypes`);
    for(const type of rule.condition.resourceTypes) assert.ok(allowedTypes.has(type),`${item.path}: unsupported resource type ${type}`);
  }
}
for(const file of ["background.js","popup.js","options.js","content-ad-cleaner.js"]) new vm.Script(read(file),{filename:file});
for(const [htmlFile,jsFile] of [["popup.html","popup.js"],["options.html","options.js"]]){
  const html=read(htmlFile), js=read(jsFile), ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,`${htmlFile}: duplicate DOM IDs`);
  const missing=[...new Set([...js.matchAll(/\$\("([^"]+)"\)/g)].map(m=>m[1]).filter(id=>!ids.includes(id)))];
  assert.deepEqual(missing,[],`${jsFile}: unresolved DOM IDs`);
  for(const [,resource] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
    if(resource.startsWith("http")||resource.startsWith("#")||resource.startsWith("mailto:")) continue;
    exists(resource);
  }
}
for(const file of ["popup.css","options.css"]) { exists(file); assert.ok(read(file).length>100,`${file}: empty stylesheet`); }
console.log("All Rolex Key AdBlocker validation checks passed.");

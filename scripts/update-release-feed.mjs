import fs from "node:fs";
const version = process.env.RELEASE_VERSION;
const tag = process.env.RELEASE_TAG || "v" + version;
if (!/^\d+\.\d+\.\d+$/.test(version || "")) throw new Error("RELEASE_VERSION must be semantic x.y.z");
const lines = fs.readFileSync("CHANGELOG.md", "utf8").split(/\r?\n/);
const headerIndex = lines.findIndex(line => line.startsWith("## [" + version + "] - "));
if (headerIndex < 0) throw new Error("Add a CHANGELOG.md heading for [" + version + "] with a YYYY-MM-DD date before tagging.");
const dateMatch = lines[headerIndex].match(/^## \[.*\] - (\d{4}-\d{2}-\d{2})$/);
if (!dateMatch) throw new Error("Changelog heading must end with a YYYY-MM-DD date.");
const sectionLines = [];
for (let i = headerIndex + 1; i < lines.length && !lines[i].startsWith("## ["); i++) {
  const line = lines[i].trim();
  if (line) sectionLines.push(line.replace(/^[-*]\s*/, ""));
}
const feed = JSON.parse(fs.readFileSync("update-feed.json", "utf8"));
feed.schemaVersion = 1;
feed.latestVersion = version;
feed.title = "Rolex Key AdBlocker " + tag;
feed.message = (sectionLines.join(" ").slice(0, 280) || ("Version " + version + " is now available."));
feed.releaseUrl = "https://github.com/sajinstalin01/adblocker-extension/releases/tag/" + encodeURIComponent(tag);
feed.publishedAt = dateMatch[1];
feed.features = sectionLines.slice(0, 8);
fs.writeFileSync("update-feed.json", JSON.stringify(feed, null, 2) + "\n");
console.log("Updated update-feed.json for " + version);

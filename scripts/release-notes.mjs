import fs from "node:fs";
const version = process.argv[2];
if (!version) throw new Error("Pass release version.");
const lines = fs.readFileSync("CHANGELOG.md", "utf8").split(/\r?\n/);
const headerIndex = lines.findIndex(line => line.startsWith("## [" + version + "] - "));
if (headerIndex < 0) throw new Error("No changelog section found for " + version);
const body = [];
for (let i = headerIndex + 1; i < lines.length && !lines[i].startsWith("## ["); i++) body.push(lines[i]);
console.log(body.join("\n").trim() || ("Rolex Key AdBlocker " + version));

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const root = new URL("..", import.meta.url).pathname;
const packages = join(root, "packages");

function readJSON(p) {
  return JSON.parse(readFileSync(p, "utf-8"));
}

function writeJSON(p, obj) {
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

// Get core version
const corePkg = readJSON(join(packages, "core", "package.json"));
const coreVersion = corePkg.version;

// Add @frontal-labs/core as devDependency to all non-core packages
const names = ["agents","ai","audit","auth","billing","blob","connectors","data","datasets","events","governance","graph","integrations","lineage","observability","ontology","pipelines","sandbox","schedules","sdk","webhooks","workers","workflows"];

for (const name of names) {
  const p = join(packages, name, "package.json");
  if (!existsSync(p)) continue;
  const pkg = readJSON(p);
  
  if (!pkg.devDependencies) pkg.devDependencies = {};
  pkg.devDependencies["@frontal-labs/core"] = `^${coreVersion}`;
  
  writeJSON(p, pkg);
  console.log(`  ${name}: added @frontal-labs/core@^${coreVersion} as devDependency`);
}

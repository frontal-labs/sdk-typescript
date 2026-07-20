import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const root = new URL("..", import.meta.url).pathname;
const packages = join(root, "packages");

// Get current versions of all packages
function readJSON(p) {
  return JSON.parse(readFileSync(p, "utf-8"));
}

function writeJSON(p, obj) {
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

// Collect all package names and their versions
const pkgMap = {};
for (const name of ["agents","ai","audit","auth","billing","blob","connectors","core","data","datasets","events","governance","graph","integrations","lineage","observability","ontology","pipelines","sandbox","schedules","sdk","testing","webhooks","workers","workflows"]) {
  const p = join(packages, name, "package.json");
  if (existsSync(p)) {
    const pkg = readJSON(p);
    pkgMap[name] = { version: pkg.version, path: p, pkg };
  }
}

console.log("Package versions:", Object.fromEntries(Object.entries(pkgMap).map(([k,v]) => [k, v.version])));

// Now fix each non-core, non-testing package
const fixNames = Object.keys(pkgMap).filter(n => n !== "core" && n !== "testing");

for (const name of fixNames) {
  const { path, pkg } = pkgMap[name];
  let changed = false;

  // 1. Remove @frontal-labs/core from dependencies
  if (pkg.dependencies && pkg.dependencies["@frontal-labs/core"]) {
    delete pkg.dependencies["@frontal-labs/core"];
    changed = true;
    console.log(`  ${name}: removed @frontal-labs/core from dependencies`);
    if (Object.keys(pkg.dependencies).length === 0) {
      delete pkg.dependencies;
    }
  }

  // 2. Remove @frontal-labs/testing from devDependencies
  if (pkg.devDependencies && pkg.devDependencies["@frontal-labs/testing"]) {
    delete pkg.devDependencies["@frontal-labs/testing"];
    changed = true;
    console.log(`  ${name}: removed @frontal-labs/testing from devDependencies`);
    if (Object.keys(pkg.devDependencies).length === 0) {
      delete pkg.devDependencies;
    }
  }

  // 3. Convert workspace:* to ^<version> for all remaining @frontal-labs/* deps
  const versionMap = Object.fromEntries(
    Object.entries(pkgMap).map(([k, v]) => [`@frontal-labs/${k}`, `^${v.version}`])
  );

  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    if (pkg[section]) {
      for (const [dep, ver] of Object.entries(pkg[section])) {
        if (dep.startsWith("@frontal-labs/") && ver === "workspace:*") {
          const targetVer = versionMap[dep];
          if (targetVer) {
            pkg[section][dep] = targetVer;
            changed = true;
            console.log(`  ${name}: ${dep} workspace:* -> ${targetVer}`);
          }
        }
      }
    }
  }

  if (changed) {
    writeJSON(path, pkg);
    console.log(`  => ${name} updated`);
  }
}

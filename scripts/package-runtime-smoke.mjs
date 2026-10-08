import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(root, "packages");
const require = createRequire(import.meta.url);
const loaded = new Map();

for (const name of readdirSync(packagesDir)) {
  const packageDir = join(packagesDir, name);
  const manifestPath = join(packageDir, "package.json");
  if (!existsSync(manifestPath)) continue;

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  // The testing package intentionally imports Vitest, which requires an active
  // test runner and is not a standalone runtime dependency.
  if (manifest.private || name === "testing") continue;

  const rootExport = manifest.exports?.["."];
  const esmTarget = rootExport?.import?.default ?? manifest.module;
  const cjsTarget = rootExport?.require?.default ?? manifest.main;
  assert(esmTarget, `${manifest.name} has no ESM entry point`);
  assert(cjsTarget, `${manifest.name} has no CommonJS entry point`);

  const esmPath = resolve(packageDir, esmTarget);
  const cjsPath = resolve(packageDir, cjsTarget);
  assert(existsSync(esmPath), `${manifest.name} ESM build is missing: ${esmPath}`);
  assert(existsSync(cjsPath), `${manifest.name} CJS build is missing: ${cjsPath}`);

  const esm = await import(pathToFileURL(esmPath).href);
  const cjs = require(cjsPath);
  loaded.set(name, { esm, cjs });
  process.stdout.write(`Loaded ${manifest.name} ESM and CommonJS entries\n`);
}

const webhooks = loaded.get("webhooks");
assert(webhooks, "@frontal-labs/webhooks was not loaded");
const secret = "whsec_runtime_smoke";
const payload = JSON.stringify({ event: "runtime.smoke" });
const timestamp = Math.floor(Date.now() / 1000);
const signature = createHmac("sha256", secret)
  .update(`${payload}.${timestamp}`)
  .digest("hex");
const header = `t=${timestamp},v1=${signature}`;

for (const [format, module] of Object.entries(webhooks)) {
  assert.equal(typeof module.verifyWebhookSignature, "function");
  const result = await module.verifyWebhookSignature(payload, header, secret);
  assert.equal(result.valid, true, `${format} webhook verification failed`);
}

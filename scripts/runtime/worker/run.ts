/**
 * Bundles the worker entry with Bun and runs it inside workerd through
 * Miniflare. Exits non-zero when any check fails.
 */
import { Miniflare } from "miniflare";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("./worker.ts", import.meta.url));
const built = await Bun.build({
  entrypoints: [entry],
  target: "browser",
  format: "esm",
  minify: false,
  conditions: ["workerd", "worker", "browser", "import"],
});
if (!built.success) {
  for (const log of built.logs) console.error(log);
  process.exit(1);
}
const output = built.outputs[0];
if (!output) {
  console.error("worker smoke: Bun.build produced no output");
  process.exit(1);
}
const script = await output.text();

const mf = new Miniflare({
  modules: true,
  script,
  compatibilityDate: "2026-07-01",
  // No compatibility flags: the strictest setting, to show core needs no Node shim.
  compatibilityFlags: [],
});
try {
  const res = await mf.dispatchFetch("http://localhost/");
  const body = (await res.json()) as { ok: boolean; checks: Record<string, boolean> };
  console.log(JSON.stringify(body));
  if (res.status !== 200 || !body.ok) {
    console.error("worker smoke failed", body.checks);
    process.exit(1);
  }
} finally {
  await mf.dispose();
}

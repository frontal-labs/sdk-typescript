#!/usr/bin/env bun
/**
 * SDK health monitor — runs real user journeys against Frontal services.
 *
 * Outputs per-check results to stdout, then a MONITOR_REPORT:<json> line
 * consumed by .github/scripts/sdk-e2e.sh → flap-state.sh → incident-client.sh.
 *
 * Environment:
 *   FRONTAL_API_KEY             Required
 *   FRONTAL_API_URL             Default: https://api.frontal.dev/v1
 *   FRONTAL_AI_API_URL          Default: https://ai.frontal.dev
 *   FRONTAL_GRAPH_ENTITY_TYPE   Entity type for graph queries (skips if unset)
 *   FRONTAL_BLOB_BUCKET         Bucket for blob ops (skips if unset)
 *   DRY_RUN=true                Skip all real calls, emit fixture data
 *   CHECK_TIMEOUT_MS            Per-check timeout (default: 25000)
 *
 * Exit code 2 if any check failed.
 */

import { createAgentsClient } from "../packages/agents/src";
import { createAIClient } from "../packages/ai/src";
import { createBlobClient } from "../packages/blob/src";
import { createFunctionsClient } from "../packages/functions/src";
import { createGraphClient } from "../packages/graph/src";
import { createOntologyClient } from "../packages/ontology/src";
import { createPipelinesClient } from "../packages/pipelines/src";
import { createWorkflowsClient } from "../packages/workflows/src";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = "pass" | "warn" | "fail" | "skip";

interface Result {
  name: string;
  service: string;
  status: Status;
  message: string;
  durationMs: number;
  timestamp: string;
  exitCode?: number;
}

interface Report {
  generatedAt: string;
  runId: string;
  summary: {
    total: number;
    passed: number;
    warned: number;
    failed: number;
    skipped: number;
    servicesFailed: number;
    durationMs: number;
  };
  results: Result[];
  failedServices: string[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DRY = process.env.DRY_RUN === "true";
const TIMEOUT = Number(process.env.CHECK_TIMEOUT_MS) || 25_000;
const apiKey = process.env.FRONTAL_API_KEY;
const apiUrl = process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1";
const aiUrl = process.env.FRONTAL_AI_API_URL ?? "https://ai.frontal.dev";
const graphType = process.env.FRONTAL_GRAPH_ENTITY_TYPE;
const blobBucket = process.env.FRONTAL_BLOB_BUCKET;
const runId = process.env.GITHUB_RUN_ID ?? "local";

if (!apiKey && !DRY) {
  console.error("Missing FRONTAL_API_KEY");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ts(): string { return new Date().toISOString(); }

function statusCode(err: unknown): number | null {
  if (typeof err !== "object" || err === null) return null;
  return (err as { statusCode?: number }).statusCode ?? null;
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

function classify(err: unknown): { status: Status; message: string } {
  const code = statusCode(err);
  const msg = errMsg(err);
  if (code === 404) return { status: "fail", message: `404 route mismatch — ${msg}` };
  if (code === 401 || code === 403) return { status: "warn", message: `${code} auth — ${msg}` };
  if (code !== null && code >= 400 && code < 500) return { status: "warn", message: `${code} client error — ${msg}` };
  if (code !== null && code >= 500) return { status: "fail", message: `${code} server error — ${msg}` };
  return { status: "fail", message: msg || "network failure" };
}

async function runCheck(name: string, service: string, fn: () => Promise<void>): Promise<Result> {
  if (DRY) return { name, service, status: "skip", message: "dry-run", durationMs: 0, timestamp: ts() };
  const start = performance.now();
  try {
    await withTimeout(fn(), TIMEOUT);
    return { name, service, status: "pass", message: "OK", durationMs: Math.round(performance.now() - start), timestamp: ts() };
  } catch (err) {
    const dur = Math.round(performance.now() - start);
    return { name, service, ...classify(err), durationMs: dur, timestamp: ts(), exitCode: statusCode(err) ?? 1 };
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, r) => setTimeout(() => r(new Error(`Timed out after ${ms}ms`)), ms)),
  ]);
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const ai = createAIClient({ apiKey, baseUrl: aiUrl });
const functions = createFunctionsClient({ apiKey, baseUrl: apiUrl });
const agents = createAgentsClient({ apiKey, baseUrl: apiUrl });
const graph = createGraphClient({ apiKey, baseUrl: apiUrl });
const ontology = createOntologyClient({ apiKey, baseUrl: apiUrl });
const pipelines = createPipelinesClient({ apiKey, baseUrl: apiUrl });
const workflows = createWorkflowsClient({ apiKey, baseUrl: apiUrl });
const blob = createBlobClient({ apiKey, baseUrl: apiUrl });

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

interface CheckDef { name: string; service: string; fn: () => Promise<void>; skipIf?: () => boolean; skipMsg?: string }

const checks: CheckDef[] = [
  {
    name: "ai.listModels", service: "ai",
    fn: async () => { const m = await ai.listModels(); if (!Array.isArray(m)) throw new Error("not an array"); },
  },
  {
    name: "functions.list", service: "functions",
    fn: async () => { const r = await functions.list(); if (!Array.isArray(r)) throw new Error("not an array"); },
  },
  {
    name: "functions.lifecycle", service: "functions",
    fn: async () => { const r = await functions.list(); if (!Array.isArray(r)) throw new Error("not an array"); },
  },
  {
    name: "agents.list", service: "agents",
    fn: async () => { await agents.list({ limit: 1 }); },
  },
  {
    name: "graph.query", service: "graph",
    fn: async () => { await graph.query({ entityType: graphType!, limit: 1 }); },
    skipIf: () => !graphType, skipMsg: "FRONTAL_GRAPH_ENTITY_TYPE not set",
  },
  {
    name: "ontology.list", service: "ontology",
    fn: async () => { await ontology.list({ limit: 1 }); },
  },
  {
    name: "pipelines.list", service: "pipelines",
    fn: async () => { await pipelines.list({ limit: 1 }); },
  },
  {
    name: "workflows.list", service: "workflows",
    fn: async () => { await workflows.list({ limit: 1 }); },
  },
  {
    name: "blob.list", service: "blob",
    fn: async () => { await blob.list({ bucket: blobBucket! }); },
    skipIf: () => !blobBucket, skipMsg: "FRONTAL_BLOB_BUCKET not set",
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const results: Result[] = [];
  const t0 = performance.now();

  for (const c of checks) {
    if (c.skipIf?.()) {
      results.push({ name: c.name, service: c.service, status: "skip", message: c.skipMsg!, durationMs: 0, timestamp: ts() });
      const icon = "SKIP";
      console.log(`${icon.padEnd(4)} ${c.name.padEnd(22)}       -  ${c.skipMsg}`);
      continue;
    }
    const r = await runCheck(c.name, c.service, c.fn);
    results.push(r);
    const icon = r.status === "pass" ? "PASS" : r.status === "warn" ? "WARN" : r.status === "skip" ? "SKIP" : "FAIL";
    console.log(`${icon.padEnd(4)} ${r.name.padEnd(22)} ${r.durationMs.toString().padStart(5)}ms  ${r.message}`);
  }

  const dur = Math.round(performance.now() - t0);
  const passed = results.filter((r) => r.status === "pass").length;
  const warned = results.filter((r) => r.status === "warn").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const failedSvcs = [...new Set(results.filter((r) => r.status === "fail").map((r) => r.service))];

  const report: Report = {
    generatedAt: ts(),
    runId,
    summary: { total: results.length, passed, warned, failed, skipped, servicesFailed: failedSvcs.length, durationMs: dur },
    results,
    failedServices: failedSvcs,
  };

  console.log(`\n${passed} passed, ${warned} warned, ${failed} failed, ${skipped} skipped  (${dur}ms)`);
  console.log(`MONITOR_REPORT:${JSON.stringify(report)}`);

  if (failed > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error("monitor crash:", err);
  process.exit(1);
});

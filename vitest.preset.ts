import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packagesDir = resolve(__dirname, "packages");

export const resolveAliases: Record<string, string> = {
  "@frontal-labs/agents": resolve(packagesDir, "agents/src"),
  "@frontal-labs/ai": resolve(packagesDir, "ai/src"),
  "@frontal-labs/audit": resolve(packagesDir, "audit/src"),
  "@frontal-labs/auth": resolve(packagesDir, "auth/src"),
  "@frontal-labs/billing": resolve(packagesDir, "billing/src"),
  "@frontal-labs/blob": resolve(packagesDir, "blob/src"),
  "@frontal-labs/connectors": resolve(packagesDir, "connectors/src"),
  "@frontal-labs/core": resolve(packagesDir, "core/src"),
  "@frontal-labs/data": resolve(packagesDir, "data/src"),
  "@frontal-labs/datasets": resolve(packagesDir, "datasets/src"),
  "@frontal-labs/events": resolve(packagesDir, "events/src"),
  "@frontal-labs/workers": resolve(packagesDir, "workers/src"),
  "@frontal-labs/governance": resolve(packagesDir, "governance/src"),
  "@frontal-labs/graph": resolve(packagesDir, "graph/src"),
  "@frontal-labs/integrations": resolve(packagesDir, "integrations/src"),
  "@frontal-labs/lineage": resolve(packagesDir, "lineage/src"),
  "@frontal-labs/observability": resolve(packagesDir, "observability/src"),
  "@frontal-labs/ontology": resolve(packagesDir, "ontology/src"),
  "@frontal-labs/pipelines": resolve(packagesDir, "pipelines/src"),
  "@frontal-labs/sandbox": resolve(packagesDir, "sandbox/src"),
  "@frontal-labs/schedules": resolve(packagesDir, "schedules/src"),
  "@frontal-labs/sdk": resolve(packagesDir, "sdk/src"),
  "@frontal-labs/testing": resolve(packagesDir, "testing/src"),
  "@frontal-labs/types": resolve(__dirname, "types"),
  "@frontal-labs/webhooks": resolve(packagesDir, "webhooks/src"),
  "@frontal-labs/workflows": resolve(packagesDir, "workflows/src"),
};

export function packageVitestConfig() {
  return defineConfig({
    resolve: {
      alias: resolveAliases,
    },
  });
}

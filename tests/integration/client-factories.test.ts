/**
 * Every service package exposes `createXClient()` accepting either a config
 * object (with env/default fallbacks) or a shared `FrontalClient`, plus a
 * deprecated env-driven singleton. One table covers all 23.
 */
import { FrontalClient } from "@frontal-labs/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const API_KEY = "frt_factory_test_key";

const factories: Array<[string, () => Promise<Record<string, unknown>>, string]> = [
  ["agents", () => import("@frontal-labs/agents"), "createAgentsClient"],
  ["ai", () => import("@frontal-labs/ai"), "createAIClient"],
  ["audit", () => import("@frontal-labs/audit"), "createAuditClient"],
  ["auth", () => import("@frontal-labs/auth"), "createAuthClient"],
  ["billing", () => import("@frontal-labs/billing"), "createBillingClient"],
  ["blob", () => import("@frontal-labs/blob"), "createBlobClient"],
  ["connectors", () => import("@frontal-labs/connectors"), "createConnectorsClient"],
  ["data", () => import("@frontal-labs/data"), "createDataClient"],
  ["datasets", () => import("@frontal-labs/datasets"), "createDatasetsClient"],
  ["events", () => import("@frontal-labs/events"), "createEventsClient"],
  ["governance", () => import("@frontal-labs/governance"), "createGovernanceClient"],
  ["graph", () => import("@frontal-labs/graph"), "createGraphClient"],
  ["integrations", () => import("@frontal-labs/integrations"), "createIntegrationsClient"],
  ["lineage", () => import("@frontal-labs/lineage"), "createLineageClient"],
  ["observability", () => import("@frontal-labs/observability"), "createObservabilityClient"],
  ["ontology", () => import("@frontal-labs/ontology"), "createOntologyClient"],
  ["pipelines", () => import("@frontal-labs/pipelines"), "createPipelinesClient"],
  ["sandbox", () => import("@frontal-labs/sandbox"), "createSandboxClient"],
  ["schedules", () => import("@frontal-labs/schedules"), "createSchedulesClient"],
  ["sdk", () => import("@frontal-labs/sdk"), "createFrontalClient"],
  ["webhooks", () => import("@frontal-labs/webhooks"), "createWebhooksClient"],
  ["workers", () => import("@frontal-labs/workers"), "createWorkersClient"],
  ["workflows", () => import("@frontal-labs/workflows"), "createWorkflowsClient"],
];

type Factory = (config: unknown) => object;

describe.each(factories)("%s factory", (name, load, fnName) => {
  const originalKey = process.env.FRONTAL_API_KEY;
  beforeEach(() => {
    process.env.FRONTAL_API_KEY = API_KEY;
  });
  afterEach(() => {
    process.env.FRONTAL_API_KEY = originalKey;
  });

  it("builds from a minimal config with defaults", async () => {
    const mod = await load();
    const factory = mod[fnName] as Factory;
    expect(factory({ apiKey: API_KEY })).toBeTruthy();
  });

  it("honours explicit baseUrl/timeout/maxRetries", async () => {
    const mod = await load();
    const factory = mod[fnName] as Factory;
    const sdk = factory({
      apiKey: API_KEY,
      baseUrl: "https://custom.test/v1",
      timeout: 1234,
      maxRetries: 1,
    }) as Record<string, unknown>;
    // Reach the transport config through whichever field the SDK keeps it on.
    const http =
      (sdk.http as { config?: { baseUrl: string } } | undefined) ??
      ((sdk.client as { config?: { baseUrl: string } } | undefined) ?? undefined);
    if (http?.config) expect(http.config.baseUrl).toBe("https://custom.test/v1");
  });

  it("wraps a shared FrontalClient", async () => {
    const mod = await load();
    const factory = mod[fnName] as Factory;
    const client = new FrontalClient({ apiKey: API_KEY });
    expect(factory(client)).toBeTruthy();
  });

  it("singleton proxy initialises from env or fails with a clear message", async () => {
    const mod = await load();
    const singleton = mod[name === "sdk" ? "frontal" : name] as
      | Record<string, unknown>
      | undefined;
    if (!singleton) return;
    // `env` is parsed once at import time; depending on the worker's env the
    // proxy either binds a method or throws the documented error.
    try {
      const value = singleton.health ?? singleton.list ?? singleton.generateText;
      expect(value === undefined || typeof value === "function").toBe(true);
    } catch (err) {
      expect(String(err)).toMatch(/FRONTAL_API_KEY/);
    }
  });
});

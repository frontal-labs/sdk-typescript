import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { DataSdk } from "../src/sdk";

function createService(
  routes: Parameters<typeof createTestHttpClient>[0] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new DataSdk(http), mock };
}

function page<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

function noDoublePrefix(mock: { requests: { path: string }[] }): boolean {
  return !mock.requests.some((r) => r.path.includes("/v1/v1/"));
}

describe("DataSdk", () => {
  it("exposes all subdomain namespaces", () => {
    const { service } = createService();
    for (const ns of [
      service.aggregations,
      service.archival,
      service.enrichment,
      service.exports,
      service.normalization,
      service.quality,
      service.serving,
      service.streams,
      service.sync,
      service.transformations,
      service.query,
      service.schemas,
    ]) {
      expect(ns).toBeDefined();
    }
  });

  describe("resource subdomains", () => {
    it("aggregations: list/create/get/execute use the real double-segment paths", async () => {
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/data/aggregations/aggregations",
          body: page([{ id: "ag_1" }]),
        },
        {
          method: "POST",
          path: "/data/aggregations/aggregations",
          body: { id: "ag_2" },
        },
        {
          method: "POST",
          path: "/data/aggregations/aggregations/ag_1/executions",
          body: { runId: "r_1" },
        },
      ]);
      const list = await service.aggregations.list();
      expect(list.data).toHaveLength(1);
      await service.aggregations.create({ name: "daily" });
      const run = await service.aggregations.execute("ag_1");
      expect(run.runId).toBe("r_1");
      mock.expectCalled("GET", "/data/aggregations/aggregations");
      mock.expectCalled(
        "POST",
        "/data/aggregations/aggregations/ag_1/executions"
      );
      expect(noDoublePrefix(mock)).toBe(true);
    });

    it("archival policies nest under archival/policies", async () => {
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/data/archival/archival/policies",
          body: page([{ id: "pol_1" }]),
        },
      ]);
      const list = await service.archival.list();
      expect(list.data).toHaveLength(1);
      mock.expectCalled("GET", "/data/archival/archival/policies");
    });

    it("quality uses the 'evaluations' action verb", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/data/quality/quality/rulesets/rs_1/evaluations",
          body: { runId: "r_2" },
        },
      ]);
      await service.quality.execute("rs_1");
      mock.expectCalled(
        "POST",
        "/data/quality/quality/rulesets/rs_1/evaluations"
      );
    });

    it("serving uses the 'refreshes' action verb", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/data/serving/serving/products/pr_1/refreshes",
          body: { runId: "r_3" },
        },
      ]);
      await service.serving.execute("pr_1");
      mock.expectCalled(
        "POST",
        "/data/serving/serving/products/pr_1/refreshes"
      );
    });
  });

  describe("query", () => {
    it("federated posts to /data/query/query/federated", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/data/query/query/federated",
          body: { rows: [] },
        },
      ]);
      await service.query.federated({ sql: "select 1" });
      mock.expectCalled("POST", "/data/query/query/federated");
    });
  });

  describe("schemas", () => {
    it("resolve + get by ref", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/data/schemas/schemas/resolve",
          body: { schemaRef: "users@1" },
        },
        {
          method: "GET",
          path: "/data/schemas/schemas/users@1",
          body: { schemaRef: "users@1" },
        },
      ]);
      await service.schemas.resolve({ name: "users" });
      const s = await service.schemas.get("users@1");
      expect(s.schemaRef).toBe("users@1");
      mock.expectCalled("POST", "/data/schemas/schemas/resolve");
      mock.expectCalled("GET", "/data/schemas/schemas/users@1");
    });
  });

  describe("shared envelope", () => {
    it("health/capabilities/runs resolve under the subdomain base", async () => {
      const { service, mock } = createService([
        { method: "GET", path: "/data/streams/health", body: { ok: true } },
        {
          method: "GET",
          path: "/data/streams/runs",
          body: page([{ id: "run_1" }]),
        },
      ]);
      await service.streams.health();
      const runs = await service.streams.runs();
      expect(runs.data).toHaveLength(1);
      mock.expectCalled("GET", "/data/streams/health");
      mock.expectCalled("GET", "/data/streams/runs");
    });
  });
});

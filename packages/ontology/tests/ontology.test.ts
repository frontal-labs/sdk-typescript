import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { OntologySdk } from "../src/sdk";

function createService(
  routes: Parameters<typeof createTestHttpClient>[0] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new OntologySdk(http), mock };
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

describe("OntologySdk subdomains", () => {
  it("exposes all subdomain namespaces", () => {
    const { service } = createService();
    for (const ns of [
      service.engine,
      service.objects,
      service.relationships,
      service.schemas,
      service.versions,
      service.validation,
      service.transformations,
      service.reasoning,
      service.rollouts,
      service.rollups,
      service.extract,
      service.events,
    ]) {
      expect(ns).toBeDefined();
    }
  });

  describe("shared envelope", () => {
    it("health/capabilities/runs use the subdomain base", async () => {
      const { service, mock } = createService([
        { method: "GET", path: "/ontology/objects/health", body: { ok: true } },
        {
          method: "GET",
          path: "/ontology/objects/capabilities",
          body: { features: [] },
        },
        {
          method: "GET",
          path: "/ontology/objects/runs",
          body: page([{ id: "run_1" }]),
        },
      ]);
      await service.objects.health();
      await service.objects.capabilities();
      const runs = await service.objects.runs();
      expect(runs.data).toHaveLength(1);
      mock.expectCalled("GET", "/ontology/objects/health");
      mock.expectCalled("GET", "/ontology/objects/capabilities");
      mock.expectCalled("GET", "/ontology/objects/runs");
      expect(noDoublePrefix(mock)).toBe(true);
    });
  });

  describe("engine", () => {
    it("generate/validate hit /ontology/engine/ontologies/*", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/ontology/engine/ontologies/generate",
          body: { id: "ont_1" },
        },
        {
          method: "POST",
          path: "/ontology/engine/ontologies/validate",
          body: { valid: true },
        },
      ]);
      await service.engine.generate({ description: "an ontology" });
      const v = await service.engine.validate({ ontology: {} });
      expect(v.valid).toBe(true);
      mock.expectCalled("POST", "/ontology/engine/ontologies/generate");
      mock.expectCalled("POST", "/ontology/engine/ontologies/validate");
    });
  });

  describe("objects", () => {
    it("object-types list + objects put/delete", async () => {
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/ontology/objects/object-types",
          body: page([{ id: "ot_1" }]),
        },
        {
          method: "PUT",
          path: "/ontology/objects/objects/obj_1",
          body: { id: "obj_1" },
        },
        {
          method: "DELETE",
          path: "/ontology/objects/objects/obj_1",
          status: 204,
        },
      ]);
      const types = await service.objects.listObjectTypes();
      expect(types.data).toHaveLength(1);
      await service.objects.putObject("obj_1", { name: "x" });
      await service.objects.deleteObject("obj_1");
      mock.expectCalled("PUT", "/ontology/objects/objects/obj_1");
      mock.expectCalled("DELETE", "/ontology/objects/objects/obj_1");
    });
  });

  describe("rollouts lifecycle", () => {
    it("start/pause/status", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/ontology/rollouts/rollouts/ro_1/start",
          body: { status: "running" },
        },
        {
          method: "POST",
          path: "/ontology/rollouts/rollouts/ro_1/pause",
          body: { status: "paused" },
        },
        {
          method: "GET",
          path: "/ontology/rollouts/rollouts/ro_1/status",
          body: { status: "paused" },
        },
      ]);
      await service.rollouts.start("ro_1");
      await service.rollouts.pause("ro_1");
      const s = await service.rollouts.status("ro_1");
      expect(s.status).toBe("paused");
      mock.expectCalled("POST", "/ontology/rollouts/rollouts/ro_1/start");
      mock.expectCalled("GET", "/ontology/rollouts/rollouts/ro_1/status");
    });
  });

  describe("rollups", () => {
    it("execute + fetch execution result", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/ontology/rollups/rollups/ru_1/execute",
          body: { executionId: "ex_1" },
        },
        {
          method: "GET",
          path: "/ontology/rollups/rollup-results/ex_1",
          body: { rows: [] },
        },
      ]);
      const run = await service.rollups.execute("ru_1");
      expect(run.executionId).toBe("ex_1");
      await service.rollups.executionResult("ex_1");
      mock.expectCalled("POST", "/ontology/rollups/rollups/ru_1/execute");
      mock.expectCalled("GET", "/ontology/rollups/rollup-results/ex_1");
    });
  });

  describe("extract", () => {
    it("entities/triplets post to /ontology/extract/extract/*", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/ontology/extract/extract/entities",
          body: { entities: [] },
        },
        {
          method: "POST",
          path: "/ontology/extract/extract/triplets",
          body: { triplets: [] },
        },
      ]);
      await service.extract.entities({ text: "Alice knows Bob" });
      await service.extract.triplets({ text: "Alice knows Bob" });
      mock.expectCalled("POST", "/ontology/extract/extract/entities");
      mock.expectCalled("POST", "/ontology/extract/extract/triplets");
    });
  });

  describe("events", () => {
    it("checkpoints and leases", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/ontology/events/events/leases/acquire",
          body: { leaseId: "l_1" },
        },
        {
          method: "GET",
          path: "/ontology/events/events/checkpoints/consumer-a",
          body: { offset: 42 },
        },
      ]);
      const lease = await service.events.acquireLease({
        consumer: "consumer-a",
      });
      expect(lease.leaseId).toBe("l_1");
      const cp = await service.events.getCheckpoint("consumer-a");
      expect(cp.offset).toBe(42);
      mock.expectCalled("POST", "/ontology/events/events/leases/acquire");
      mock.expectCalled(
        "GET",
        "/ontology/events/events/checkpoints/consumer-a"
      );
    });
  });

  describe("versions", () => {
    it("release bundles + audit verify", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/ontology/versions/release-bundles",
          body: { id: "rb_1" },
        },
        {
          method: "POST",
          path: "/ontology/versions/audit/verify",
          body: { verified: true },
        },
      ]);
      await service.versions.createReleaseBundle({ version: "1.0.0" });
      const a = await service.versions.auditVerify({ bundleId: "rb_1" });
      expect(a.verified).toBe(true);
      mock.expectCalled("POST", "/ontology/versions/release-bundles");
      mock.expectCalled("POST", "/ontology/versions/audit/verify");
    });
  });
});

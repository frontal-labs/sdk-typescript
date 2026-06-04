import {
  createTestHttpClient,
  fixtures,
  mockPageResponse,
} from "@frontal-labs/testing";
import { describe, expect, it, vi } from "vitest";
import { PipelineBuilder, PipelinesService } from "../src/service";

function createService(
  routes: Parameters<typeof createTestHttpClient>[0] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  const service = new PipelinesService(http);
  return { service, mock };
}

const pipeline = fixtures.pipeline;

describe("PipelinesService", () => {
  describe("define()", () => {
    it("returns a PipelineBuilder", () => {
      const { service } = createService();
      const builder = service.define("etl-pipeline");
      expect(builder).toBeInstanceOf(PipelineBuilder);
    });
  });

  describe("list()", () => {
    it("lists pipelines with pagination", async () => {
      const items = [pipeline(), pipeline()];
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/v1/data/pipelines/pipelines",
          body: mockPageResponse(items),
        },
      ]);

      const result = await service.list();

      expect(result.data).toHaveLength(2);
      mock.expectCalled("GET", "/v1/data/pipelines/pipelines");
    });
  });

  describe("create()", () => {
    it("creates a pipeline from definition", async () => {
      const ppl = pipeline({ name: "ingest-users" });
      const { service, mock } = createService([
        { method: "POST", path: "/v1/data/pipelines/pipelines", body: ppl },
      ]);

      const result = await service.create({
        name: "ingest-users",
        source: { type: "manual" },
        steps: [{ id: "step-1", type: "collect", config: {} }],
      });

      expect(result.name).toBe("ingest-users");
      mock.expectCalled("POST", "/v1/data/pipelines/pipelines");
    });
  });
});

describe("PipelineBuilder", () => {
  it("builds a pipeline with fluent API", async () => {
    const ppl = pipeline({ name: "user-sync" });
    const { service, mock } = createService([
      { method: "POST", path: "/v1/data/pipelines/pipelines", body: ppl },
    ]);

    await service
      .define("user-sync")
      .description("Syncs users from external source")
      .fromGraph("user", { status: "active" })
      .collect("fetch-users", { source: "external-api" })
      .transform("normalize", { mapping: { name: "fullName" } })
      .enrich("add-metadata", { provider: "clearbit" })
      .validate("check-email", { rules: ["email_format"] })
      .write("upsert-graph", { target: "graph" })
      .notify("alert-team", { channel: "slack" })
      .tags("sync", "users")
      .create();

    mock.expectCalled("POST", "/v1/data/pipelines/pipelines");
  });

  it("supports webhook source", async () => {
    const ppl = pipeline({ name: "webhook-ingest" });
    const { service, mock } = createService([
      { method: "POST", path: "/v1/data/pipelines/pipelines", body: ppl },
    ]);

    await service
      .define("webhook-ingest")
      .fromWebhook("https://hooks.example.com/data")
      .transform("parse", {})
      .write("store", {})
      .create();

    mock.expectCalled("POST", "/v1/data/pipelines/pipelines");
  });

  it("supports schedule source", async () => {
    const ppl = pipeline({ name: "daily-sync" });
    const { service, mock } = createService([
      { method: "POST", path: "/v1/data/pipelines/pipelines", body: ppl },
    ]);

    await service
      .define("daily-sync")
      .fromSchedule("0 2 * * *")
      .schedule("0 2 * * *")
      .timeout("30m")
      .retryPolicy("exponential")
      .errorHandling("retry")
      .collect("fetch", {})
      .create();

    mock.expectCalled("POST", "/v1/data/pipelines/pipelines");
  });

  it("supports manual source", async () => {
    const ppl = pipeline({ name: "ad-hoc" });
    const { service, mock } = createService([
      { method: "POST", path: "/v1/data/pipelines/pipelines", body: ppl },
    ]);

    await service.define("ad-hoc").fromManual().collect("gather", {}).create();

    mock.expectCalled("POST", "/v1/data/pipelines/pipelines");
  });

  it("creates and activates in one call", async () => {
    const ppl = pipeline({ id: "ppl_1", name: "auto-activate" });
    const { service, mock } = createService([
      { method: "POST", path: "/v1/data/pipelines/pipelines", body: ppl },
      {
        method: "POST",
        path: "/v1/data/pipelines/runs",
        body: { ...ppl, status: "active" },
      },
    ]);

    await service
      .define("auto-activate")
      .fromManual()
      .collect("gather", {})
      .activate();

    mock.expectCalled("POST", "/v1/data/pipelines/pipelines");
    mock.expectCalled("POST", "/v1/data/pipelines/runs");
  });
});

describe("PipelineAccessor", () => {
  const pipelineId = "ppl_abc";

  describe("get()", () => {
    it("fetches a pipeline by id", async () => {
      const ppl = pipeline({ id: pipelineId });
      const { service, mock } = createService([
        {
          method: "GET",
          path: `/v1/data/pipelines/pipelines/${pipelineId}`,
          body: ppl,
        },
      ]);

      const result = await service.use(pipelineId).get();

      expect(result.id).toBe(pipelineId);
      mock.expectCalled("GET", `/v1/data/pipelines/pipelines/${pipelineId}`);
    });
  });

  describe("update()", () => {
    it("updates a pipeline", async () => {
      const ppl = pipeline({ id: pipelineId, name: "updated" });
      const { service, mock } = createService([
        { method: "POST", path: `/v1/data/pipelines/pipelines`, body: ppl },
      ]);

      await service.use(pipelineId).update({ name: "updated" });

      mock.expectCalled("POST", `/v1/data/pipelines/pipelines`);
    });
  });

  describe("delete()", () => {
    it("deletes a pipeline", async () => {
      const { service, mock } = createService([
        { method: "POST", path: `/v1/data/pipelines/runs`, status: 204 },
      ]);

      await service.use(pipelineId).delete();

      mock.expectCalled("POST", `/v1/data/pipelines/runs`);
    });
  });

  describe("runs()", () => {
    it("lists pipeline runs with pagination", async () => {
      const items = [
        { id: "run_1", status: "completed" },
        { id: "run_2", status: "running" },
      ];
      const { service, mock } = createService([
        {
          method: "GET",
          path: `/v1/data/pipelines/pipeline-runs`,
          body: mockPageResponse(items),
        },
      ]);

      const result = await service.use(pipelineId).runs();

      expect(result.data).toHaveLength(2);
      mock.expectCalled("GET", `/v1/data/pipelines/pipeline-runs`);
    });
  });

  describe("run()", () => {
    it("fetches a specific run", async () => {
      const body = {
        id: "run_1",
        pipelineId,
        status: "completed",
        startedAt: "2024-01-01",
      };
      const { service, mock } = createService([
        { method: "GET", path: `/v1/data/pipelines/pipeline-runs/run_1`, body },
      ]);

      const result = await service.use(pipelineId).run("run_1");

      expect(result.id).toBe("run_1");
      mock.expectCalled("GET", `/v1/data/pipelines/pipeline-runs/run_1`);
    });
  });

  describe("trigger()", () => {
    it("triggers a pipeline run", async () => {
      const body = { id: "run_1", pipelineId, status: "running" };
      const { service, mock } = createService([
        { method: "POST", path: `/v1/data/pipelines/runs`, body },
      ]);

      const result = await service.use(pipelineId).trigger({ batchSize: 100 });

      expect(result.status).toBe("running");
      mock.expectCalledWith("POST", `/v1/data/pipelines/runs`, {
        batchSize: 100,
      });
    });
  });

  describe("backfills()", () => {
    it("lists backfills with pagination", async () => {
      const items = [{ id: "bf_1", status: "completed" }];
      const { service, mock } = createService([
        {
          method: "GET",
          path: `/v1/data/pipelines/runs`,
          body: mockPageResponse(items),
        },
      ]);

      const result = await service.use(pipelineId).backfills();

      expect(result.data).toHaveLength(1);
      mock.expectCalled("GET", `/v1/data/pipelines/runs`);
    });
  });

  describe("backfill()", () => {
    it("creates a backfill", async () => {
      const body = {
        id: "bf_1",
        status: "running",
        from: "2024-01-01",
        to: "2024-03-01",
      };
      const { service, mock } = createService([
        { method: "POST", path: `/v1/data/pipelines/runs`, body },
      ]);

      const result = await service
        .use(pipelineId)
        .backfill("2024-01-01", "2024-03-01", { strategy: "incremental" });

      expect(result.status).toBe("running");
      mock.expectCalled("POST", `/v1/data/pipelines/runs`);
    });
  });

  describe("health()", () => {
    it("fetches pipeline health", async () => {
      const body = {
        status: "healthy",
        lastRunAt: "2024-01-01",
        successRate: 0.99,
      };
      const { service, mock } = createService([
        { method: "GET", path: `/v1/data/pipelines/health`, body },
      ]);

      const result = await service.use(pipelineId).health();

      expect(result.status).toBe("healthy");
      expect(result.successRate).toBe(0.99);
      mock.expectCalled("GET", `/v1/data/pipelines/health`);
    });
  });

  describe("waitForRun()", () => {
    it("polls run until completed", async () => {
      let callCount = 0;
      const { http } = createTestHttpClient([]);
      const getSpy = vi.spyOn(http, "get").mockImplementation(async () => {
        callCount++;
        return {
          id: "run_1",
          pipelineId,
          status: callCount >= 2 ? "completed" : "running",
          startedAt: "2024-01-01T00:00:00Z",
        };
      });

      const service = new PipelinesService(http);
      const result = await service.use(pipelineId).waitForRun("run_1", {
        interval: 10,
        timeout: 5000,
      });

      expect(result.status).toBe("completed");
      expect(callCount).toBeGreaterThanOrEqual(2);
      getSpy.mockRestore();
    });
  });
});

describe("LineageNamespace", () => {
  describe("graph()", () => {
    it("fetches lineage graph", async () => {
      const body = { nodes: [], edges: [] };
      const { service, mock } = createService([
        { method: "GET", path: "/v1/data/pipelines/info", body },
      ]);

      const result = await service.lineage.graph();

      expect(result.nodes).toEqual([]);
      mock.expectCalled("GET", "/v1/data/pipelines/info");
    });
  });

  describe("upstream()", () => {
    it("fetches upstream lineage", async () => {
      const body = { pipelines: [pipeline()], entities: [] };
      const { service, mock } = createService([
        { method: "GET", path: "/v1/data/pipelines/info", body },
      ]);

      const result = await service.lineage.upstream("user", "ent_1");

      expect(result.pipelines).toHaveLength(1);
      mock.expectCalled("GET", "/v1/data/pipelines/info");
    });
  });

  describe("downstream()", () => {
    it("fetches downstream lineage", async () => {
      const body = {
        pipelines: [],
        entities: [{ id: "ent_2", type: "report" }],
      };
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/v1/data/pipelines/info",
          body,
        },
      ]);

      const result = await service.lineage.downstream("user", "ent_1");

      expect(result.entities).toHaveLength(1);
      mock.expectCalled("GET", "/v1/data/pipelines/info");
    });
  });
});

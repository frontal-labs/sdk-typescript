/**
 * Integration: Create dataset → sync via pipeline → trace lineage graph.
 * Verifies the pipeline → dataset → lineage data flow.
 */
import { describe, expect, it } from "vitest";
import {
  createIntegrationHarness,
  integrationPage,
} from "@frontal-labs/testing";
import { PipelinesSdk as PipelinesService } from "@frontal-labs/pipelines";
import { DatasetsSdk as DatasetsService } from "@frontal-labs/datasets";
import { LineageSdk as LineageService } from "@frontal-labs/lineage";

const mockPipeline = {
  id: "ppl_1", name: "data-ingest", status: "active",
  source: { type: "manual" }, steps: [], tags: [],
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
};

const mockRun = {
  id: "run_1", pipeline_id: "ppl_1", status: "completed",
  started_at: "2025-01-01T00:00:00Z", completed_at: "2025-01-01T00:01:00Z",
  created_at: "2025-01-01T00:00:00Z",
};

const mockDataset = {
  id: "ds_1", name: "users", row_count: 1000, storage_size_bytes: 512000,
  version_count: 1, status: "active",
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
};

const mockGraph = {
  nodes: [
    { id: "ppl_1", type: "pipeline", name: "data-ingest", created_at: "2025-01-01T00:00:00Z" },
    { id: "ds_1", type: "dataset", name: "users", created_at: "2025-01-01T00:00:00Z" },
  ],
  edges: [
    { id: "e1", source_id: "ppl_1", target_id: "ds_1", type: "produces", created_at: "2025-01-01T00:00:00Z" },
  ],
};

describe("Pipeline → Dataset → Lineage integration", () => {
  it("create dataset → trigger pipeline → verify lineage", async () => {
    const harness = createIntegrationHarness([
      {
        method: "POST",
        path: "/v1/data/ingest/datasets/ingest",
        body: { runId: "ing_1" },
      },
      { method: "GET", path: "/v1/data/ingest/datasets/ds_1", body: mockDataset },
      {
        method: "POST", path: "/data/pipelines/pipelines",
        body: mockPipeline,
      },
      {
        method: "POST", path: "/data/pipelines/runs",
        body: mockRun,
      },
      { method: "GET", path: "/v1/lineage/graph", body: mockGraph },
    ]);

    const { http: pipelinesHttp } = harness.createHttp();
    const { http: datasetsHttp } = harness.createHttp();
    const { http: lineageHttp } = harness.createHttp();

    const pipelines = new PipelinesService(pipelinesHttp);
    const datasets = new DatasetsService(datasetsHttp);
    const lineage = new LineageService(lineageHttp);

    // Step 1: Ingest data to create/populate the dataset
    const ingestRun = await datasets.ingest({ dataset: "users" });
    expect(ingestRun.runId).toBe("ing_1");

    // Step 2: Read the resulting dataset from the ingest service
    const ds = await datasets.get("ds_1");
    expect(ds.id).toBe("ds_1");

    // Step 3: Create pipeline that produces this dataset
    const ppl = await pipelines.define("data-ingest")
      .fromManual()
      .collect("fetch-data", { source: "api" })
      .write("to-dataset", { target: "ds_1" })
      .create();
    expect(ppl.id).toBe("ppl_1");

    // Step 4: Trigger pipeline run
    const run = await pipelines.use(ppl.id).trigger({});
    expect(run.status).toBe("completed");

    // Step 5: Verify lineage graph connects pipeline → dataset
    const graph = await lineage.graph.get("ds_1");
    expect(graph.nodes.length).toBe(2);
    expect(graph.edges[0].type).toBe("produces");
  });
});

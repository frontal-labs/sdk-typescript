import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "frontal/testing";
import {
  LineageService,
  createLineageClient,
  LineageGraphSchema,
} from "../src/index";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new LineageService(http), mock };
}

const mockNode = {
  id: "node_1",
  type: "dataset",
  name: "users",
  createdAt: "2025-01-01T00:00:00Z",
};
const mockEdge = {
  id: "edge_1",
  sourceId: "node_1",
  targetId: "node_2",
  type: "produces",
  createdAt: "2025-01-01T00:00:00Z",
};
const mockGraph = { nodes: [mockNode], edges: [mockEdge] };
function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

describe("LineageService", () => {
  it("gets lineage graph", async () => {
    const { service } = createService([
      { method: "GET", path: "/lineage/graph", body: mockGraph },
    ]);
    const result = await service.graph.get("ds_1");
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(1);
  });
  it("lists nodes (paginated)", async () => {
    const { service } = createService([
      { method: "GET", path: "/lineage/nodes", body: pageWrap([mockNode]) },
    ]);
    const result = await service.nodes.list();
    expect(result.data).toHaveLength(1);
  });
  it("traces a node", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/lineage/nodes/node_1/trace",
        body: mockGraph,
      },
    ]);
    const result = await service.nodes.trace("node_1");
    expect(result.nodes).toHaveLength(1);
  });
  it("lists edges (paginated)", async () => {
    const { service } = createService([
      { method: "GET", path: "/lineage/edges", body: pageWrap([mockEdge]) },
    ]);
    const result = await service.edges.list();
    expect(result.data).toHaveLength(1);
  });
  it("analyzes impact of change", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/lineage/impact",
        body: {
          affected_resources: [
            { id: "node_2", type: "pipeline", name: "ETL", impact: "high" },
          ],
        },
      },
    ]);
    const result = await service.impact.analyzeChange("node_1", {
      type: "update",
    });
    expect(result.affectedResources).toHaveLength(1);
  });
});

describe("Schemas", () => {
  it("validates LineageGraph", () => {
    expect(LineageGraphSchema.safeParse(mockGraph).success).toBe(true);
  });
});
describe("Factory", () => {
  it("creates client", () => {
    expect(createLineageClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      LineageService
    );
  });
});

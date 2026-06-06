import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  VectorsService,
  createVectorsClient,
  VectorIndexSchema,
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
  return { service: new VectorsService(http), mock };
}

const mockIndex = {
  id: "idx_1",
  name: "products",
  dimensions: 1536,
  metric: "cosine",
  vectorCount: 5000,
  status: "active",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};
function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

describe("VectorsService", () => {
  it("lists indexes (paginated)", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/v1/vectors/indexes",
        body: pageWrap([mockIndex]),
      },
    ]);
    const result = await service.indexes.list();
    expect(result.data).toHaveLength(1);
  });
  it("creates an index", async () => {
    const { service } = createService([
      { method: "POST", path: "/v1/vectors/indexes", body: mockIndex },
    ]);
    const result = await service.indexes.create({
      name: "products",
      dimensions: 1536,
    });
    expect(result.id).toBe("idx_1");
  });
  it("upserts vectors", async () => {
    const { service } = createService([
      { method: "GET", path: "/v1/vectors/indexes/idx_1", body: mockIndex },
      {
        method: "POST",
        path: "/v1/vectors/indexes/idx_1/vectors",
        body: { inserted: 3 },
      },
    ]);
    const result = await service.upsert("idx_1", [
      {
        id: "v1",
        values: Array.from(
          { length: mockIndex.dimensions as number },
          () => 0.1
        ),
      },
    ]);
    expect(result.inserted).toBe(3);
  });
  it("searches vectors", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/vectors/indexes/idx_1/search",
        body: { results: [{ id: "r1", score: 0.95, vector_id: "v1" }] },
      },
    ]);
    const result = await service.search.search("idx_1", { vector: [0.1, 0.2] });
    expect(result.results).toHaveLength(1);
  });
  it("hybrid search", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/vectors/indexes/idx_1/hybrid-search",
        body: { results: [{ id: "r1", score: 0.88, vector_id: "v1" }] },
      },
    ]);
    const result = await service.search.hybridSearch("idx_1", {
      vector: [0.1, 0.2],
      text: "red shoes",
    });
    expect(result.results).toHaveLength(1);
  });
});

describe("Schemas", () => {
  it("validates VectorIndex", () => {
    expect(VectorIndexSchema.safeParse(mockIndex).success).toBe(true);
  });
});
describe("Factory", () => {
  it("creates client", () => {
    expect(createVectorsClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      VectorsService
    );
  });
});

import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  SearchService,
  createSearchClient,
  SearchResultSchema,
} from "../src/index";

function createService(
  routes: Array<{
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }> = []
) {
  const { http, mock } = createTestHttpClient(routes);
  const service = new SearchService(http);
  return { service, mock };
}

const mockResult = {
  id: "r1",
  type: "vector" as const,
  score: 0.95,
  source: "products",
  data: { title: "Red Shoes" },
};

const mockResponse = {
  results: [mockResult],
  total: { vector: 1, semantic: 0, structured: 0 },
  query_time_ms: 42,
};

describe("SearchService", () => {
  it("performs unified search", async () => {
    const { service } = createService([
      { method: "POST", path: "/v1/search", body: mockResponse },
    ]);
    const result = await service.search({ query: "red shoes" });
    expect(result.results).toHaveLength(1);
    expect(result.total.vector).toBe(1);
  });

  it("performs vector search", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/search/vector",
        body: { results: [mockResult], total: 1 },
      },
    ]);
    const result = await service.vectorSearch({
      index_id: "idx_1",
      text: "red shoes",
    });
    expect(result.results).toHaveLength(1);
  });

  it("performs semantic search", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/search/semantic",
        body: { results: [mockResult], total: 1 },
      },
    ]);
    const result = await service.semanticSearch({
      query: "customers in us-east",
    });
    expect(result.results).toHaveLength(1);
  });

  it("performs structured search", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/search/structured",
        body: { results: [mockResult], total: 1 },
      },
    ]);
    const result = await service.structuredSearch({
      dataset_id: "ds_1",
      where: { status: "active" },
    });
    expect(result.results).toHaveLength(1);
  });

  it("performs hybrid search", async () => {
    const { service } = createService([
      { method: "POST", path: "/v1/search/hybrid", body: mockResponse },
    ]);
    const result = await service.hybridSearch({ query: "red shoes" });
    expect(result.total.vector).toBe(1);
  });

  it("lists indexed sources", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/v1/search/sources",
        body: {
          indexes: [],
          entity_types: [],
          datasets: [],
        },
      },
    ]);
    const result = await service.listIndexedSources();
    expect(result.indexes).toBeDefined();
  });
});

describe("Schemas", () => {
  it("validates SearchResult", () => {
    expect(SearchResultSchema.safeParse(mockResult).success).toBe(true);
  });
});

describe("Factory", () => {
  it("creates client", () => {
    expect(createSearchClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      SearchService
    );
  });
});

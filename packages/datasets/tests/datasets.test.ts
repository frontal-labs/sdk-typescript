import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  DatasetsService,
  createDatasetsClient,
  DatasetSchema,
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
  return { service: new DatasetsService(http), mock };
}

const mockDs = {
  id: "ds_1",
  name: "users",
  row_count: 1000,
  storage_size_bytes: 512000,
  version_count: 3,
  status: "active",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};
function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

describe("DatasetsService", () => {
  it("lists datasets (paginated)", async () => {
    const { service } = createService([
      { method: "GET", path: "/v1/datasets", body: pageWrap([mockDs]) },
    ]);
    const result = await service.datasets.list();
    expect(result.data).toHaveLength(1);
  });
  it("creates a dataset", async () => {
    const { service } = createService([
      { method: "POST", path: "/v1/datasets", body: mockDs },
    ]);
    const result = await service.datasets.create({ name: "users" });
    expect(result.id).toBe("ds_1");
  });
  it("queries data", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/datasets/ds_1/query",
        body: { data: [{ id: 1, name: "Alice" }] },
      },
    ]);
    const result = await service.data.query("ds_1", { limit: 10 });
    expect(result.data).toHaveLength(1);
  });
  it("inserts rows", async () => {
    const { service } = createService([
      { method: "POST", path: "/v1/datasets/ds_1/data", body: { inserted: 5 } },
    ]);
    const result = await service.data.insert("ds_1", [{ name: "Bob" }]);
    expect(result.inserted).toBe(5);
  });
  it("gets stats", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/v1/datasets/ds_1/stats",
        body: {
          row_count: 1000,
          storage_size_bytes: 512000,
          column_count: 8,
          last_updated: "2025-01-01T00:00:00Z",
        },
      },
    ]);
    const result = await service.stats.get("ds_1");
    expect(result.row_count).toBe(1000);
  });
  it("compares versions", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/v1/datasets/ds_1/versions/compare",
        body: { additions: 10, deletions: 2, changes: 5 },
      },
    ]);
    const result = await service.versions.compare("ds_1", "v1", "v2");
    expect(result.additions).toBe(10);
  });
});

describe("Schemas", () => {
  it("validates Dataset", () => {
    expect(DatasetSchema.safeParse(mockDs).success).toBe(true);
  });
});
describe("Factory", () => {
  it("creates client", () => {
    expect(createDatasetsClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      DatasetsService
    );
  });
});

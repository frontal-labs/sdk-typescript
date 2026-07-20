import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import { DatasetsSdk, createDatasetsClient, DatasetSchema } from "../src/index";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new DatasetsSdk(http), mock };
}

const mockDs = {
  id: "ds_1",
  name: "users",
  rowCount: 1000,
  storageSizeBytes: 512_000,
  versionCount: 3,
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

describe("DatasetsSdk", () => {
  it("lists datasets from the ingest service (paginated)", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/data/ingest/datasets",
        body: pageWrap([mockDs]),
      },
    ]);
    const result = await service.list();
    expect(result.data).toHaveLength(1);
  });
  it("gets a dataset by id", async () => {
    const { service, mock } = createService([
      { method: "GET", path: "/data/ingest/datasets/ds_1", body: mockDs },
    ]);
    const result = await service.get("ds_1");
    expect(result.id).toBe("ds_1");
    expect(
      mock.requests.some((r: { path: string }) => r.path.includes("/v1/v1/"))
    ).toBe(false);
  });
  it("submits an ingestion request", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/data/ingest/datasets/ingest",
        body: { runId: "run_1" },
      },
    ]);
    const result = await service.ingest({ dataset: "users" });
    expect(result.runId).toBe("run_1");
  });
  it("lists schemas", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/data/ingest/schemas",
        body: pageWrap([{ schemaRef: "users@1" }]),
      },
    ]);
    const result = await service.schemas.list();
    expect(result.data[0].schemaRef).toBe("users@1");
  });
  it("browses catalog datasets", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/data/catalog/catalog/datasets",
        body: pageWrap([mockDs]),
      },
    ]);
    const result = await service.catalog.datasets.list();
    expect(result.data).toHaveLength(1);
  });
  it("browses catalog sources", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/data/catalog/catalog/sources",
        body: pageWrap([{ id: "src_1", name: "postgres" }]),
      },
    ]);
    const result = await service.catalog.sources.list();
    expect(result.data[0].id).toBe("src_1");
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
      DatasetsSdk
    );
  });
});

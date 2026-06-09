import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  ConnectorsService,
  createConnectorsClient,
  Installation,
  connectorSlugSchema,
  connectorInstallationSchema,
  syncRunSchema,
  connectionTestSchema,
} from "@/index";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new ConnectorsService(http), mock };
}

const mockInstallation = {
  id: "inst_1",
  connectorSlug: "postgres",
  tenantId: "tnt_1",
  datasetNamespace: "postgres_prod",
  displayName: "Production Postgres",
  status: "active",
  config: { host: "localhost", port: 5432, database: "mydb" },
  auth: { mode: "basic", secretRef: "sec_1" },
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-02T00:00:00Z",
};

const mockConnector = {
  slug: "postgres",
  version: "v1",
  displayName: "PostgreSQL",
  description: "Syncs rows from a PostgreSQL database.",
  authModes: ["basic"],
  supportsIncremental: true,
  supportsWebhook: false,
  configSchema: { type: "object", properties: {} },
};

const mockSyncRun = {
  id: "sr_1",
  installationId: "inst_1",
  trigger: "manual",
  mode: "full",
  status: "succeeded",
  stats: { recordsRead: 1000, recordsWritten: 1000 },
  startedAt: "2025-01-03T00:00:00Z",
  finishedAt: "2025-01-03T00:05:00Z",
};

const mockConnectionTest = {
  id: "ct_1",
  installationId: "inst_1",
  status: "succeeded",
  message: "Connection successful",
  startedAt: "2025-01-03T00:00:00Z",
  finishedAt: "2025-01-03T00:00:02Z",
};

const mockCheckpoint = {
  installationId: "inst_1",
  value: { lastCursor: "12345" },
  updatedAt: "2025-01-03T00:05:00Z",
};

// ---------------------------------------------------------------------------
// ConnectorsService
// ---------------------------------------------------------------------------

describe("ConnectorsService", () => {
  describe("catalog", () => {
    it("list() returns connector definitions", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/connectors",
          body: { connectors: [mockConnector] },
        },
      ]);
      const result = await service.list();
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("postgres");
    });

    it("get() returns a single connector", async () => {
      const { service } = createService([
        { method: "GET", path: "/connectors/postgres", body: mockConnector },
      ]);
      const result = await service.get("postgres");
      expect(result.slug).toBe("postgres");
    });
  });

  describe("installations", () => {
    it("create() returns an Installation handle", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/connectors/installations",
          body: mockInstallation,
        },
      ]);
      const inst = await service.installations.create({
        connectorSlug: "postgres",
        tenantId: "tnt_1",
        datasetNamespace: "postgres_prod",
        displayName: "Production Postgres",
      });
      expect(inst).toBeInstanceOf(Installation);
      expect(inst.id).toBe("inst_1");
      expect(inst.status).toBe("active");
    });

    it("get() returns an Installation handle", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/connectors/installations/inst_1",
          body: mockInstallation,
        },
      ]);
      const inst = await service.installations.get("inst_1");
      expect(inst).toBeInstanceOf(Installation);
      expect(inst.id).toBe("inst_1");
    });

    it("list() returns PageResult", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/connectors/installations",
          body: { installations: [mockInstallation] },
        },
      ]);
      const page = await service.installations.list({ tenantId: "tnt_1" });
      expect(page.data).toHaveLength(1);
    });
  });

  describe("replay()", () => {
    it("replays a sync run", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/sync-runs/sr_1/replay",
          body: mockSyncRun,
        },
      ]);
      const result = await service.replay("sr_1");
      expect(result.id).toBe("sr_1");
    });
  });

  describe("diagnostics()", () => {
    it("returns diagnostics", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/diagnostics",
          body: { repository: "postgres" },
        },
      ]);
      const result = await service.diagnostics();
      expect(result.repository).toBe("postgres");
    });
  });
});

// ---------------------------------------------------------------------------
// Installation handle
// ---------------------------------------------------------------------------

describe("Installation", () => {
  function createInst(
    routes: {
      method: string;
      path: string | RegExp;
      status?: number;
      body?: unknown;
    }[] = []
  ) {
    const { http, mock } = createTestHttpClient(routes);
    const inst = new Installation(
      http,
      "inst_1",
      "postgres",
      "tnt_1",
      "ns",
      "PG",
      "active",
      { host: "localhost" },
      { mode: "basic", secretRef: "sec_1" }
    );
    return { inst, mock };
  }

  describe("lifecycle", () => {
    it("pause()", async () => {
      const { inst } = createInst([
        {
          method: "POST",
          path: "/connectors/installations/inst_1/pause",
          body: { ...mockInstallation, status: "paused" },
        },
      ]);
      const result = await inst.pause();
      expect(result.status).toBe("paused");
    });

    it("resume()", async () => {
      const { inst } = createInst([
        {
          method: "POST",
          path: "/connectors/installations/inst_1/resume",
          body: mockInstallation,
        },
      ]);
      const result = await inst.resume();
      expect(result.status).toBe("active");
    });

    it("update()", async () => {
      const { inst } = createInst([
        {
          method: "PATCH",
          path: "/connectors/installations/inst_1",
          body: { ...mockInstallation, displayName: "New" },
        },
      ]);
      const result = await inst.update({ displayName: "New" });
      expect(result.displayName).toBe("New");
    });

    it("remove()", async () => {
      const { inst } = createInst([
        {
          method: "DELETE",
          path: "/connectors/installations/inst_1",
          body: { deleted: true },
        },
      ]);
      const result = await inst.remove();
      expect(result.deleted).toBe(true);
    });

    it("reload()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/connectors/installations/inst_1",
          body: { ...mockInstallation, status: "error" },
        },
      ]);
      const result = await inst.reload();
      expect(result.status).toBe("error");
    });
  });

  describe("sync", () => {
    it("sync.create()", async () => {
      const { inst } = createInst([
        {
          method: "POST",
          path: "/connectors/installations/inst_1/sync-runs",
          body: mockSyncRun,
        },
      ]);
      const result = await inst.sync.create({ mode: "full" });
      expect(result.id).toBe("sr_1");
    });

    it("sync.list()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/connectors/installations/inst_1/sync-runs",
          body: { runs: [mockSyncRun] },
        },
      ]);
      const page = await inst.sync.list();
      expect(page.data).toHaveLength(1);
    });

    it("sync.get()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/connectors/installations/inst_1/sync-runs/sr_1",
          body: mockSyncRun,
        },
      ]);
      const result = await inst.sync.get("sr_1");
      expect(result.id).toBe("sr_1");
    });
  });

  describe("test (connection tests)", () => {
    it("test.create()", async () => {
      const { inst } = createInst([
        {
          method: "POST",
          path: "/connectors/installations/inst_1/connection-tests",
          body: mockConnectionTest,
        },
      ]);
      const result = await inst.test.create();
      expect(result.status).toBe("succeeded");
    });

    it("test.list()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/connectors/installations/inst_1/connection-tests",
          body: { connectionTests: [mockConnectionTest] },
        },
      ]);
      const page = await inst.test.list();
      expect(page.data).toHaveLength(1);
    });

    it("test.get()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/connectors/connection-tests/ct_1",
          body: mockConnectionTest,
        },
      ]);
      const result = await inst.test.get("ct_1");
      expect(result.id).toBe("ct_1");
    });
  });

  describe("checkpoint", () => {
    it("checkpoint.get()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/connectors/installations/inst_1/checkpoint",
          body: mockCheckpoint,
        },
      ]);
      const result = await inst.checkpoint.get();
      expect(result?.installationId).toBe("inst_1");
    });

    it("checkpoint.get() returns null for empty", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/connectors/installations/inst_1/checkpoint",
          status: 204,
        },
      ]);
      const result = await inst.checkpoint.get();
      expect(result).toBeUndefined();
    });

    it("checkpoint.reset()", async () => {
      const { inst } = createInst([
        {
          method: "POST",
          path: "/connectors/installations/inst_1/checkpoint/reset",
          body: mockCheckpoint,
        },
      ]);
      const result = await inst.checkpoint.reset();
      expect(result.installationId).toBe("inst_1");
    });
  });
});

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

describe("Schemas", () => {
  it("validates connector slug", () => {
    expect(connectorSlugSchema.safeParse("postgres").success).toBe(true);
    expect(connectorSlugSchema.safeParse("snowflake").success).toBe(true);
  });

  it("validates installation", () => {
    expect(
      connectorInstallationSchema.safeParse(mockInstallation).success
    ).toBe(true);
  });

  it("validates sync run", () => {
    expect(syncRunSchema.safeParse(mockSyncRun).success).toBe(true);
  });

  it("validates connection test", () => {
    expect(connectionTestSchema.safeParse(mockConnectionTest).success).toBe(
      true
    );
  });
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

describe("Factory", () => {
  it("creates ConnectorsService", () => {
    expect(createConnectorsClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      ConnectorsService
    );
  });
});

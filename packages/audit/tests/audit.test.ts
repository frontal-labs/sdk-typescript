import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  AuditService,
  createAuditClient,
  AuditEventSchema,
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
  return { service: new AuditService(http), mock };
}

const mockEvent = {
  id: "evt_1",
  actor: { user_id: "usr_1" },
  action: "user.created",
  resource: { type: "user", id: "usr_2" },
  status: "success",
  timestamp: "2025-01-01T00:00:00Z",
};

function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

describe("AuditService", () => {
  it("logs an event", async () => {
    const { service, mock } = createService([
      { method: "POST", path: "/v1/audit/events", body: mockEvent },
    ]);
    const result = await service.log({
      action: "user.created",
      resource: { type: "user", id: "usr_2" },
    });
    expect(result.id).toBe("evt_1");
    mock.expectCalled("POST", "/v1/audit/events");
  });
  it("queries events (paginated)", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/audit/events/query",
        body: pageWrap([mockEvent]),
      },
    ]);
    const result = await service.query({});
    expect(result.data).toHaveLength(1);
  });
  it("exports events", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/audit/events/export",
        body: { download_url: "https://..." },
      },
    ]);
    const result = await service.export({ format: "csv" });
    expect(result.download_url).toBeDefined();
  });
  it("lists audit trails (paginated)", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/v1/audit/trails",
        body: pageWrap([
          { id: "t1", name: "Test", filter: {}, created_at: "" },
        ]),
      },
    ]);
    const result = await service.trails.list();
    expect(result.data).toHaveLength(1);
  });
  it("runs compliance check", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/audit/compliance/check",
        body: { passed: true, findings: [] },
      },
    ]);
    const result = await service.compliance.runCheck({ check_id: "chk_1" });
    expect(result.passed).toBe(true);
  });
});

describe("Schemas", () => {
  it("validates AuditEvent", () => {
    expect(AuditEventSchema.safeParse(mockEvent).success).toBe(true);
  });
});

describe("createAuditClient", () => {
  it("creates client", () => {
    expect(createAuditClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      AuditService
    );
  });
});

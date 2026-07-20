import { createTestHttpClient } from "@frontal-labs/_testing";
import { describe, expect, it } from "vitest";
import { AuditSdkEventSchema, AuditSdk, createAuditClient } from "../src/index";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new AuditSdk(http), mock };
}

const mockEvent = {
  id: "evt_1",
  actor: { userId: "usr_1" },
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

describe("AuditSdk", () => {
  it("records an event (create + log alias)", async () => {
    const { service, mock } = createService([
      { method: "POST", path: "/audit/events", body: mockEvent },
    ]);
    const result = await service.events.create({
      action: "user.created",
      resource: { type: "user", id: "usr_2" },
    });
    expect(result.id).toBe("evt_1");
    const viaAlias = await service.log({ action: "user.created" });
    expect(viaAlias.id).toBe("evt_1");
    mock.expectCalled("POST", "/audit/events");
  });
  it("records a batch of events", async () => {
    const { service, mock } = createService([
      {
        method: "POST",
        path: "/audit/events/batch",
        body: { recorded: 2, failed: 0 },
      },
    ]);
    const res = await service.events.createBatch([
      { action: "a" },
      { action: "b" },
    ]);
    expect(res.recorded).toBe(2);
    mock.expectCalled("POST", "/audit/events/batch");
  });
  it("lists events with filters (GET, paginated)", async () => {
    const { service, mock } = createService([
      { method: "GET", path: "/audit/events", body: pageWrap([mockEvent]) },
    ]);
    const result = await service.events.list({ action: "user.created" });
    expect(result.data).toHaveLength(1);
    mock.expectCalled("GET", "/audit/events");
    expect(
      mock.requests.some((r: { path: string }) => r.path.includes("/v1/v1/"))
    ).toBe(false);
  });
  it("gets an event by id", async () => {
    const { service, mock } = createService([
      { method: "GET", path: "/audit/events/evt_1", body: mockEvent },
    ]);
    const result = await service.events.get("evt_1");
    expect(result.id).toBe("evt_1");
    mock.expectCalled("GET", "/audit/events/evt_1");
  });
});

describe("Schemas", () => {
  it("validates AuditSdkEvent", () => {
    expect(AuditSdkEventSchema.safeParse(mockEvent).success).toBe(true);
  });
});

describe("createAuditClient", () => {
  it("creates client", () => {
    expect(createAuditClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      AuditSdk
    );
  });
});

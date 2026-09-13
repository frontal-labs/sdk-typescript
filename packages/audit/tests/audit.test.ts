import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { AuditSdk, AuditSdkEventSchema, createAuditClient } from "../src/index";

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
  actor_id: "usr_1",
  action: "user.created",
  resource_type: "user",
  resource_id: "usr_2",
  outcome: "success",
  created_at: "2025-01-01T00:00:00Z",
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
      resourceType: "user",
      resourceId: "usr_2",
    });
    expect(result.id).toBe("evt_1");
    // Wire shape: real backend fields, snake_case, outcome defaulted.
    const body = mock.requests[0]?.body as Record<string, unknown>;
    expect(body).toMatchObject({
      action: "user.created",
      resourceType: "user",
      resourceId: "usr_2",
      outcome: "success",
    });
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
  it("validates AuditSdkEvent (camelCased SDK shape)", () => {
    const sdkShape = {
      id: "evt_1",
      actorId: "usr_1",
      action: "user.created",
      resourceType: "user",
      resourceId: "usr_2",
      outcome: "success",
      createdAt: "2025-01-01T00:00:00Z",
    };
    expect(AuditSdkEventSchema.safeParse(sdkShape).success).toBe(true);
    // The wire form (snake_case) is what mocks return; the transport camelizes it.
    expect(AuditSdkEventSchema.safeParse(mockEvent).success).toBe(false);
  });
});

describe("createAuditClient", () => {
  it("creates client", () => {
    expect(createAuditClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      AuditSdk
    );
  });
});

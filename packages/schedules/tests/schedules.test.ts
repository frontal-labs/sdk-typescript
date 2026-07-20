import { createTestHttpClient } from "@frontal-labs/_testing";
import { describe, expect, it } from "vitest";
import {
  createSchedulesClient,
  ScheduleSchema,
  SchedulesSdk,
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
  return { service: new SchedulesSdk(http), mock };
}

const mockSchedule = {
  id: "sch_1",
  name: "Daily Report",
  cron: "0 9 * * *",
  timezone: "UTC",
  target: { type: "pipeline", id: "ppl_1" },
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

function noDoublePrefix(mock: { requests: { path: string }[] }): boolean {
  return !mock.requests.some((r) => r.path.includes("/v1/v1/"));
}

describe("SchedulesSdk", () => {
  it("lists schedules at /workflows/schedules (paginated)", async () => {
    const { service, mock } = createService([
      {
        method: "GET",
        path: "/workflows/schedules",
        body: pageWrap([mockSchedule]),
      },
    ]);
    const result = await service.list();
    expect(result.data).toHaveLength(1);
    mock.expectCalled("GET", "/workflows/schedules");
    expect(noDoublePrefix(mock)).toBe(true);
  });
  it("creates a schedule", async () => {
    const { service, mock } = createService([
      { method: "POST", path: "/workflows/schedules", body: mockSchedule },
    ]);
    const result = await service.create({
      name: "Daily Report",
      cron: "0 9 * * *",
      target: { type: "pipeline", id: "ppl_1" },
    });
    expect(result.id).toBe("sch_1");
    mock.expectCalled("POST", "/workflows/schedules");
  });
  it("updates a schedule via PATCH", async () => {
    const { service, mock } = createService([
      {
        method: "PATCH",
        path: "/workflows/schedules/sch_1",
        body: { ...mockSchedule, timezone: "America/New_York" },
      },
    ]);
    const result = await service.update("sch_1", {
      timezone: "America/New_York",
    });
    expect(result.timezone).toBe("America/New_York");
    mock.expectCalled("PATCH", "/workflows/schedules/sch_1");
  });
  it("pauses a schedule", async () => {
    const { service, mock } = createService([
      {
        method: "POST",
        path: "/workflows/schedules/sch_1/pause",
        body: { ...mockSchedule, status: "paused" },
      },
    ]);
    const result = await service.pause("sch_1");
    expect(result.status).toBe("paused");
    mock.expectCalled("POST", "/workflows/schedules/sch_1/pause");
  });
  it("triggers a schedule", async () => {
    const { service, mock } = createService([
      {
        method: "POST",
        path: "/workflows/schedules/sch_1/trigger",
        body: { id: "run_1", schedule_id: "sch_1", status: "running" },
      },
    ]);
    const result = await service.trigger("sch_1");
    expect(result.id).toBe("run_1");
    mock.expectCalled("POST", "/workflows/schedules/sch_1/trigger");
  });
  it("validates and parses cron at /workflows/cron/*", async () => {
    const { service, mock } = createService([
      {
        method: "POST",
        path: "/workflows/cron/validate",
        body: { valid: true, error: null },
      },
      {
        method: "POST",
        path: "/workflows/cron/parse",
        body: { valid: true, next: ["2025-01-02T09:00:00Z"] },
      },
    ]);
    const v = await service.cron.validate("0 9 * * *");
    expect(v.valid).toBe(true);
    const p = await service.cron.parse("0 9 * * *", { count: 1 });
    expect(p.next).toHaveLength(1);
    mock.expectCalled("POST", "/workflows/cron/validate");
    mock.expectCalled("POST", "/workflows/cron/parse");
  });
});

describe("Schemas", () => {
  it("validates Schedule", () => {
    expect(ScheduleSchema.safeParse(mockSchedule).success).toBe(true);
  });
});

describe("createSchedulesClient", () => {
  it("creates client", () => {
    expect(createSchedulesClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      SchedulesSdk
    );
  });
});

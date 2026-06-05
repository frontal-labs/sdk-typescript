import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  SchedulesService,
  createSchedulesClient,
  ScheduleSchema,
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
  return { service: new SchedulesService(http), mock };
}

const mockSchedule = {
  id: "sch_1",
  name: "Daily Report",
  cron: "0 9 * * *",
  timezone: "UTC",
  target: { type: "pipeline", id: "ppl_1" },
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

describe("SchedulesService", () => {
  it("lists schedules (paginated)", async () => {
    const { service } = createService([
      { method: "GET", path: "/v1/schedules", body: pageWrap([mockSchedule]) },
    ]);
    const result = await service.schedules.list();
    expect(result.data).toHaveLength(1);
  });
  it("creates a schedule", async () => {
    const { service } = createService([
      { method: "POST", path: "/v1/schedules", body: mockSchedule },
    ]);
    const result = await service.schedules.create({
      name: "Daily Report",
      cron: "0 9 * * *",
      target: { type: "pipeline", id: "ppl_1" },
    });
    expect(result.id).toBe("sch_1");
  });
  it("pauses a schedule", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/schedules/sch_1/pause",
        body: { ...mockSchedule, status: "paused" },
      },
    ]);
    const result = await service.schedules.pause("sch_1");
    expect(result.status).toBe("paused");
  });
  it("triggers a schedule", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/schedules/sch_1/trigger",
        body: {
          id: "run_1",
          schedule_id: "sch_1",
          status: "running",
          started_at: "2025-01-01T00:00:00Z",
          created_at: "2025-01-01T00:00:00Z",
        },
      },
    ]);
    const result = await service.schedules.trigger("sch_1");
    expect(result.id).toBe("run_1");
  });
  it("validates cron expression", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/schedules/cron/validate",
        body: { valid: true },
      },
    ]);
    const result = await service.cron.validate("0 9 * * *");
    expect(result.valid).toBe(true);
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
      SchedulesService
    );
  });
});

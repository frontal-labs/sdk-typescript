import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import { QueuesService, createQueuesClient, QueueSchema } from "../src/index";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new QueuesService(http), mock };
}

const mockQueue = {
  id: "q_1",
  name: "tasks",
  status: "active",
  maxConcurrency: 10,
  retentionDays: 7,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};
const mockJob = {
  id: "job_1",
  queue_id: "q_1",
  payload: { task: "send_email" },
  status: "pending",
  attempts: 0,
  max_attempts: 3,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

describe("QueuesService", () => {
  it("lists queues (paginated)", async () => {
    const { service } = createService([
      { method: "GET", path: "/v1/queues", body: pageWrap([mockQueue]) },
    ]);
    const result = await service.list();
    expect(result.data).toHaveLength(1);
  });
  it("creates a queue", async () => {
    const { service } = createService([
      { method: "POST", path: "/v1/queues", body: mockQueue },
    ]);
    const result = await service.create({ name: "tasks" });
    expect(result.id).toBe("q_1");
  });
  it("pauses a queue", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/queues/q_1/pause",
        body: { ...mockQueue, status: "paused" },
      },
    ]);
    const result = await service.pause("q_1");
    expect(result.status).toBe("paused");
  });
  it("enqueues a job", async () => {
    const { service } = createService([
      { method: "POST", path: "/v1/queues/q_1/jobs", body: mockJob },
    ]);
    const result = await service.jobs.enqueue("q_1", { task: "send_email" });
    expect(result.id).toBe("job_1");
  });
  it("retries a job", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/queues/q_1/jobs/job_1/retry",
        body: { ...mockJob, status: "pending", attempts: 1 },
      },
    ]);
    const result = await service.jobs.retry("q_1", "job_1");
    expect(result.status).toBe("pending");
  });
});

describe("Schemas", () => {
  it("validates Queue", () => {
    expect(QueueSchema.safeParse(mockQueue).success).toBe(true);
  });
});

describe("createQueuesClient", () => {
  it("creates client", () => {
    expect(createQueuesClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      QueuesService
    );
  });
});

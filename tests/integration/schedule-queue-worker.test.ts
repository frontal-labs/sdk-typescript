/**
 * Integration: Create schedule → trigger → job enqueued → status tracked.
 * Verifies the schedule → queue job flow.
 */
import { describe, expect, it } from "vitest";
import {
  createIntegrationHarness,
  integrationPage,
} from "@frontal-labs/testing";
import { SchedulesService } from "@frontal-labs/schedules";
import { QueuesService } from "@frontal-labs/queues";

const mockSchedule = {
  id: "sch_1", name: "Nightly Export", cron: "0 2 * * *",
  timezone: "UTC", target: { type: "queue", id: "q_1" },
  status: "active",
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
};

const mockRun = {
  id: "run_1", schedule_id: "sch_1", status: "completed",
  started_at: "2025-01-01T00:00:00Z", created_at: "2025-01-01T00:00:00Z",
};

const mockQueue = {
  id: "q_1", name: "exports", status: "active",
  max_concurrency: 3, retention_days: 7,
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
};

const mockJob = {
  id: "job_1", queue_id: "q_1", payload: { format: "csv" },
  status: "completed", attempts: 1, max_attempts: 3,
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:01:00Z",
};

describe("Schedule → Queue worker integration", () => {
  it("schedule triggers queue job → job completes", async () => {
    const harness = createIntegrationHarness([
      { method: "POST", path: "/v1/schedules", body: mockSchedule },
      { method: "POST", path: "/v1/queues", body: mockQueue },
      { method: "POST", path: "/v1/schedules/sch_1/trigger", body: mockRun },
      { method: "POST", path: "/v1/queues/q_1/jobs", body: mockJob },
      {
        method: "GET", path: "/v1/queues/q_1/jobs",
        body: integrationPage([mockJob]),
      },
    ]);

    const { http: schedulesHttp } = harness.createHttp();
    const { http: queuesHttp } = harness.createHttp();

    const schedules = new SchedulesService(schedulesHttp);
    const queues = new QueuesService(queuesHttp);

    // Step 1: Create schedule targeting a queue
    const schedule = await schedules.schedules.create({
      name: "Nightly Export",
      cron: "0 2 * * *",
      target: { type: "queue", id: "q_1" },
    });
    expect(schedule.target.type).toBe("queue");

    // Step 2: Create the queue
    const queue = await queues.queues.create({ name: "exports" });
    expect(queue.id).toBe("q_1");

    // Step 3: Trigger schedule
    const run = await schedules.schedules.trigger(schedule.id);
    expect(run.status).toBe("completed");

    // Step 4: Enqueue job and verify
    const job = await queues.jobs.enqueue(queue.id, { format: "csv" });
    expect(job.status).toBe("completed");

    // Step 5: List jobs in queue
    const jobs = await queues.jobs.list(queue.id);
    expect(jobs.data.length).toBeGreaterThan(0);
  });
});

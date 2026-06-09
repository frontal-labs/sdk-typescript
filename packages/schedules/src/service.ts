import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type { Schedule, ScheduleRun } from "./schemas";

export class SchedulesService {
  readonly runs: RunsNamespace;
  readonly cron: CronNamespace;

  constructor(private readonly http: HttpClient) {
    this.runs = new RunsNamespace(http);
    this.cron = new CronNamespace(http);
  }

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Schedule>> {
    const raw = await this.http.get("/schedules", opts);
    return createPageResult(asPagePayload<Schedule>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: {
    name: string;
    cron: string;
    timezone?: string;
    target: { type: string; id: string };
    payload?: Record<string, unknown>;
  }): Promise<Schedule> {
    return this.http.post("/schedules", input);
  }

  async get(id: string): Promise<Schedule> {
    return this.http.get(`/v1/schedules/${id}`);
  }

  async update(id: string, input: Partial<Schedule>): Promise<Schedule> {
    return this.http.put(`/v1/schedules/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/schedules/${id}`);
  }

  async pause(id: string): Promise<Schedule> {
    return this.http.post(`/v1/schedules/${id}/pause`, {});
  }

  async resume(id: string): Promise<Schedule> {
    return this.http.post(`/v1/schedules/${id}/resume`, {});
  }

  async trigger(id: string): Promise<ScheduleRun> {
    return this.http.post(`/v1/schedules/${id}/trigger`, {});
  }
}

export class RunsNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    scheduleId: string,
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<ScheduleRun>> {
    const raw = await this.http.get(`/v1/schedules/${scheduleId}/runs`, opts);
    return createPageResult(asPagePayload<ScheduleRun>(raw), (cursor) =>
      this.list(scheduleId, { ...opts, cursor })
    );
  }
  async get(scheduleId: string, runId: string): Promise<ScheduleRun> {
    return this.http.get(`/v1/schedules/${scheduleId}/runs/${runId}`);
  }
  async cancel(scheduleId: string, runId: string): Promise<void> {
    return this.http.post(
      `/v1/schedules/${scheduleId}/runs/${runId}/cancel`,
      {}
    );
  }
}

export class CronNamespace {
  constructor(private readonly http: HttpClient) {}
  async validate(
    expression: string
  ): Promise<{ valid: boolean; error?: string }> {
    return this.http.post("/schedules/cron/validate", { expression });
  }
  async nextRuns(
    expression: string,
    count?: number
  ): Promise<{ runs: string[] }> {
    return this.http.post("/schedules/cron/next", { expression, count });
  }
}

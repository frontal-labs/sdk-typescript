import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/_core";
import type { Schedule, ScheduleRun } from "./schemas";

/**
 * Client for the Frontal SchedulesSdk API. SchedulesSdk are part of the Workflows
 * domain and are served under `/v1/workflows/schedules` (with cron helpers at
 * `/v1/workflows/cron/*`).
 *
 * Paths are written without the leading `/v1` because the client base URL
 * already includes it.
 */
export class SchedulesSdk {
  /** Cron expression operations. */
  readonly cron: CronNamespace;

  constructor(private readonly http: HttpClient) {
    this.cron = new CronNamespace(http);
  }

  /** List schedules with pagination. */
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Schedule>> {
    const raw = await this.http.get("/workflows/schedules", opts);
    return createPageResult(asPagePayload<Schedule>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  /** Create a new schedule. */
  async create(input: {
    name: string;
    cron: string;
    timezone?: string;
    target: { type: string; id: string };
    payload?: Record<string, unknown>;
  }): Promise<Schedule> {
    return this.http.post("/workflows/schedules", input);
  }

  /** Get a single schedule by ID. */
  async get(id: string): Promise<Schedule> {
    return this.http.get(`/workflows/schedules/${id}`);
  }

  /** Update an existing schedule. */
  async update(id: string, input: Partial<Schedule>): Promise<Schedule> {
    return this.http.patch(`/workflows/schedules/${id}`, input);
  }

  /** Delete a schedule. */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/workflows/schedules/${id}`);
  }

  /** Pause a schedule. */
  async pause(id: string): Promise<Schedule> {
    return this.http.post(`/workflows/schedules/${id}/pause`, {});
  }

  /** Resume a paused schedule. */
  async resume(id: string): Promise<Schedule> {
    return this.http.post(`/workflows/schedules/${id}/resume`, {});
  }

  /** Trigger an immediate run of a schedule. */
  async trigger(id: string): Promise<ScheduleRun> {
    return this.http.post(`/workflows/schedules/${id}/trigger`, {});
  }
}

/** Namespace for cron expression operations. */
export class CronNamespace {
  constructor(private readonly http: HttpClient) {}
  /** Validate a cron expression against the server. */
  async validate(
    cronExpression: string
  ): Promise<{ valid: boolean; error?: string | null }> {
    return this.http.post("/workflows/cron/validate", { cronExpression });
  }
  /** Parse a cron expression and compute upcoming run times. */
  async parse(
    cronExpression: string,
    opts: { count?: number; timezone?: string } = {}
  ): Promise<{ valid: boolean; next?: string[]; error?: string | null }> {
    return this.http.post("/workflows/cron/parse", {
      cronExpression,
      ...opts,
    });
  }
}

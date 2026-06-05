import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type { Queue, Job } from "./schemas";

const asPagePayload = <T>(
  raw: unknown
): { data: T[]; pagination: PaginationMeta; meta?: unknown } =>
  raw as { data: T[]; pagination: PaginationMeta; meta?: unknown };

export class QueuesService {
  readonly queues: QueuesNamespace;
  readonly jobs: JobsNamespace;

  constructor(private readonly http: HttpClient) {
    this.queues = new QueuesNamespace(http);
    this.jobs = new JobsNamespace(http);
  }
}

export class QueuesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Queue>> {
    const raw = await this.http.get("/v1/queues", opts);
    return createPageResult(asPagePayload<Queue>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async create(input: {
    name: string;
    max_concurrency?: number;
  }): Promise<Queue> {
    return this.http.post("/v1/queues", input);
  }
  async get(id: string): Promise<Queue> {
    return this.http.get(`/v1/queues/${id}`);
  }
  async update(id: string, input: Partial<Queue>): Promise<Queue> {
    return this.http.put(`/v1/queues/${id}`, input);
  }
  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/queues/${id}`);
  }
  async pause(id: string): Promise<Queue> {
    return this.http.post(`/v1/queues/${id}/pause`, {});
  }
  async resume(id: string): Promise<Queue> {
    return this.http.post(`/v1/queues/${id}/resume`, {});
  }
}

export class JobsNamespace {
  constructor(private readonly http: HttpClient) {}
  async enqueue(
    queueId: string,
    payload: Record<string, unknown>,
    opts?: { scheduled_at?: string }
  ): Promise<Job> {
    return this.http.post(`/v1/queues/${queueId}/jobs`, { payload, ...opts });
  }
  async get(queueId: string, jobId: string): Promise<Job> {
    return this.http.get(`/v1/queues/${queueId}/jobs/${jobId}`);
  }
  async cancel(queueId: string, jobId: string): Promise<void> {
    return this.http.delete(`/v1/queues/${queueId}/jobs/${jobId}`);
  }
  async list(
    queueId: string,
    opts: { status?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Job>> {
    const raw = await this.http.get(`/v1/queues/${queueId}/jobs`, opts);
    return createPageResult(asPagePayload<Job>(raw), (cursor) =>
      this.list(queueId, { ...opts, cursor })
    );
  }
  async retry(queueId: string, jobId: string): Promise<Job> {
    return this.http.post(`/v1/queues/${queueId}/jobs/${jobId}/retry`, {});
  }
}

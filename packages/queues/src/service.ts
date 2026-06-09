import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";
import type { Queue, Job } from "./schemas";

export class QueuesService {
  readonly jobs: JobsNamespace;

  constructor(private readonly http: HttpClient) {
    this.jobs = new JobsNamespace(http);
  }

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Queue>> {
    const raw = await this.http.get("/queues", opts);
    return createPageResult(asPagePayload<Queue>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: {
    name: string;
    maxConcurrency?: number;
  }): Promise<Queue> {
    return this.http.post("/queues", input);
  }

  async get(id: string): Promise<Queue> {
    return this.http.get(`/queues/${id}`);
  }

  async update(id: string, input: Partial<Queue>): Promise<Queue> {
    return this.http.put(`/queues/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/queues/${id}`);
  }

  async pause(id: string): Promise<Queue> {
    return this.http.post(`/queues/${id}/pause`, {});
  }

  async resume(id: string): Promise<Queue> {
    return this.http.post(`/queues/${id}/resume`, {});
  }
}

export class JobsNamespace {
  constructor(private readonly http: HttpClient) {}
  async enqueue(
    queueId: string,
    payload: Record<string, unknown>,
    opts?: { scheduledAt?: string }
  ): Promise<Job> {
    return this.http.post(`/queues/${queueId}/jobs`, { payload, ...opts });
  }
  async get(queueId: string, jobId: string): Promise<Job> {
    return this.http.get(`/queues/${queueId}/jobs/${jobId}`);
  }
  async cancel(queueId: string, jobId: string): Promise<void> {
    return this.http.delete(`/queues/${queueId}/jobs/${jobId}`);
  }
  async list(
    queueId: string,
    opts: { status?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Job>> {
    const raw = await this.http.get(`/queues/${queueId}/jobs`, opts);
    return createPageResult(asPagePayload<Job>(raw), (cursor) =>
      this.list(queueId, { ...opts, cursor })
    );
  }
  async retry(queueId: string, jobId: string): Promise<Job> {
    return this.http.post(`/queues/${queueId}/jobs/${jobId}/retry`, {});
  }
}

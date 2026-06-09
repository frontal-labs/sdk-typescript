import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";
import type {
  AuditEvent,
  AuditEventInput,
  AuditQuery,
  AuditReport,
} from "./schemas";

export class EventsNamespace {
  constructor(private readonly http: HttpClient) {}

  async get(eventId: string): Promise<AuditEvent> {
    return this.http.get(`/audit/events/${eventId}`);
  }
}

export class AuditService {
  readonly trails: TrailsNamespace;
  readonly reports: ReportsNamespace;
  readonly compliance: ComplianceNamespace;
  readonly events: EventsNamespace;

  constructor(private readonly http: HttpClient) {
    this.trails = new TrailsNamespace(http);
    this.reports = new ReportsNamespace(http);
    this.compliance = new ComplianceNamespace(http);
    this.events = new EventsNamespace(http);
  }

  async log(event: AuditEventInput): Promise<AuditEvent> {
    return this.http.post("/audit/events", event);
  }

  async query(input: AuditQuery): Promise<PageResult<AuditEvent>> {
    const raw = await this.http.post("/audit/events/query", input);
    return createPageResult(asPagePayload<AuditEvent>(raw), (cursor) =>
      this.query({ ...input, cursor } as AuditQuery)
    );
  }

  async export(
    input: AuditQuery & { format: "csv" | "json" }
  ): Promise<{ downloadUrl: string }> {
    return this.http.post("/audit/events/export", input);
  }
}

export class TrailsNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(opts: { limit?: number; cursor?: string } = {}): Promise<
    PageResult<{
      id: string;
      name: string;
      filter: unknown;
      createdAt: string;
    }>
  > {
    const raw = await this.http.get("/audit/trails", opts);
    return createPageResult(asPagePayload(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async create(input: {
    name: string;
    filter: Record<string, unknown>;
  }): Promise<unknown> {
    return this.http.post("/audit/trails", input);
  }
  async get(id: string): Promise<unknown> {
    return this.http.get(`/audit/trails/${id}`);
  }
  async update(id: string, input: Record<string, unknown>): Promise<unknown> {
    return this.http.put(`/audit/trails/${id}`, input);
  }
  async delete(id: string): Promise<void> {
    return this.http.delete(`/audit/trails/${id}`);
  }
}

export class ReportsNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(): Promise<{ data: AuditReport[] }> {
    return this.http.get("/audit/reports");
  }
  async generate(input: {
    name: string;
    query: AuditQuery;
    format: string;
  }): Promise<AuditReport> {
    return this.http.post("/audit/reports", input);
  }
  async get(id: string): Promise<AuditReport> {
    return this.http.get(`/audit/reports/${id}`);
  }
  async download(id: string): Promise<{ downloadUrl: string }> {
    return this.http.get(`/audit/reports/${id}/download`);
  }
}

export class ComplianceNamespace {
  constructor(private readonly http: HttpClient) {}
  async runCheck(input: {
    checkId: string;
    scope?: Record<string, unknown>;
  }): Promise<{ passed: boolean; findings: unknown[] }> {
    return this.http.post("/audit/compliance/check", input);
  }
  async listChecks(): Promise<{ data: unknown[] }> {
    return this.http.get("/audit/compliance/checks");
  }
  async getResult(checkId: string): Promise<unknown> {
    return this.http.get(`/audit/compliance/results/${checkId}`);
  }
}

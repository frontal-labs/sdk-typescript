import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type {
  AuditEvent,
  AuditEventInput,
  AuditQuery,
  AuditReport,
} from "./schemas";

const asPagePayload = <T>(
  raw: unknown
): { data: T[]; pagination: PaginationMeta; meta?: unknown } =>
  raw as { data: T[]; pagination: PaginationMeta; meta?: unknown };

export class AuditService {
  readonly trails: AuditTrailsNamespace;
  readonly reports: ReportsNamespace;
  readonly compliance: ComplianceNamespace;

  constructor(private readonly http: HttpClient) {
    this.trails = new AuditTrailsNamespace(http);
    this.reports = new ReportsNamespace(http);
    this.compliance = new ComplianceNamespace(http);
  }

  async log(event: AuditEventInput): Promise<AuditEvent> {
    return this.http.post("/v1/audit/events", event);
  }

  async query(input: AuditQuery): Promise<PageResult<AuditEvent>> {
    const raw = await this.http.post("/v1/audit/events/query", input);
    return createPageResult(asPagePayload<AuditEvent>(raw), (cursor) =>
      this.query({ ...input, cursor } as AuditQuery)
    );
  }

  async getEvent(eventId: string): Promise<AuditEvent> {
    return this.http.get(`/v1/audit/events/${eventId}`);
  }

  async export(
    input: AuditQuery & { format: "csv" | "json" }
  ): Promise<{ download_url: string }> {
    return this.http.post("/v1/audit/events/export", input);
  }
}

export class AuditTrailsNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(opts: { limit?: number; cursor?: string } = {}): Promise<
    PageResult<{
      id: string;
      name: string;
      filter: unknown;
      created_at: string;
    }>
  > {
    const raw = await this.http.get("/v1/audit/trails", opts);
    return createPageResult(asPagePayload(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async create(input: {
    name: string;
    filter: Record<string, unknown>;
  }): Promise<unknown> {
    return this.http.post("/v1/audit/trails", input);
  }
  async get(id: string): Promise<unknown> {
    return this.http.get(`/v1/audit/trails/${id}`);
  }
  async update(id: string, input: Record<string, unknown>): Promise<unknown> {
    return this.http.put(`/v1/audit/trails/${id}`, input);
  }
  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/audit/trails/${id}`);
  }
}

export class ReportsNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(): Promise<{ data: AuditReport[] }> {
    return this.http.get("/v1/audit/reports");
  }
  async generate(input: {
    name: string;
    query: AuditQuery;
    format: string;
  }): Promise<AuditReport> {
    return this.http.post("/v1/audit/reports", input);
  }
  async get(id: string): Promise<AuditReport> {
    return this.http.get(`/v1/audit/reports/${id}`);
  }
  async download(id: string): Promise<{ download_url: string }> {
    return this.http.get(`/v1/audit/reports/${id}/download`);
  }
}

export class ComplianceNamespace {
  constructor(private readonly http: HttpClient) {}
  async runCheck(input: {
    check_id: string;
    scope?: Record<string, unknown>;
  }): Promise<{ passed: boolean; findings: unknown[] }> {
    return this.http.post("/v1/audit/compliance/check", input);
  }
  async listChecks(): Promise<{ data: unknown[] }> {
    return this.http.get("/v1/audit/compliance/checks");
  }
  async getResult(checkId: string): Promise<unknown> {
    return this.http.get(`/v1/audit/compliance/results/${checkId}`);
  }
}

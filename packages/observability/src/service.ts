import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type {
  AlertRule,
  Dashboard,
  Incident,
  LogEntry,
  MetricSeries,
  Trace,
} from "./schemas";

// ── Logs ───────────────────────────────────────────────────────────

export class LogsNamespace {
  constructor(private readonly http: HttpClient) {}

  async query(input: {
    query: string;
    timeFrom: string;
    timeTo: string;
    level?: string;
    limit?: number;
    order?: string;
  }): Promise<PageResult<LogEntry>> {
    const raw = await this.http.post("/observability/logs/query", input);
    return createPageResult(asPagePayload<LogEntry>(raw), (cursor) =>
      this.query({ ...input, cursor } as typeof input)
    );
  }

  async *stream(input: {
    query: string;
    timeFrom: string;
    timeTo: string;
  }): AsyncIterable<{ type: string; data: unknown; id?: string }> {
    yield* this.http.stream("/observability/logs/stream", input);
  }

  async ingest(entries: Omit<LogEntry, "id">[]): Promise<{ ingested: number }> {
    return this.http.post("/observability/logs/ingest", { entries });
  }
}

// ── Metrics ────────────────────────────────────────────────────────

export class MetricsNamespace {
  constructor(private readonly http: HttpClient) {}

  async query(
    metric: string,
    timeRange: {
      from: string;
      to: string;
      granularity?: string;
    }
  ): Promise<MetricSeries> {
    return this.http.get("/observability/metrics", {
      metric,
      ...timeRange,
    });
  }

  async listMetrics(opts: { limit?: number; cursor?: string } = {}): Promise<
    PageResult<{
      name: string;
      unit?: string;
      description?: string;
    }>
  > {
    const raw = await this.http.get("/observability/metrics/list", opts);
    return createPageResult(
      asPagePayload<{ name: string; unit?: string; description?: string }>(raw),
      (cursor) => this.listMetrics({ ...opts, cursor })
    );
  }

  async ingest(
    points: {
      metric: string;
      value: number;
      timestamp: string;
      tags?: Record<string, string>;
    }[]
  ): Promise<{ ingested: number }> {
    return this.http.post("/observability/metrics/ingest", { points });
  }
}

// ── Traces ─────────────────────────────────────────────────────────

export class TracesNamespace {
  constructor(private readonly http: HttpClient) {}

  async get(traceId: string): Promise<Trace> {
    return this.http.get(`/v1/observability/traces/${traceId}`);
  }

  async list(
    opts: {
      service?: string;
      status?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PageResult<Trace>> {
    const raw = await this.http.get("/observability/traces", opts);
    return createPageResult(asPagePayload<Trace>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async query(filter: {
    service?: string;
    minDuration?: number;
    maxDuration?: number;
    from?: string;
    to?: string;
  }): Promise<PageResult<Trace>> {
    const raw = await this.http.post("/observability/traces/query", filter);
    return createPageResult(asPagePayload<Trace>(raw), (cursor) =>
      this.query({ ...filter, cursor } as typeof filter)
    );
  }
}

// ── Alerts ─────────────────────────────────────────────────────────

export class AlertsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { enabled?: boolean; severity?: string } = {}
  ): Promise<{ data: AlertRule[] }> {
    return this.http.get("/observability/alerts", opts);
  }

  async create(
    rule: Omit<AlertRule, "id" | "createdAt" | "lastFiredAt">
  ): Promise<AlertRule> {
    return this.http.post("/observability/alerts", rule);
  }

  async update(id: string, rule: Partial<AlertRule>): Promise<AlertRule> {
    return this.http.put(`/v1/observability/alerts/${id}`, rule);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/observability/alerts/${id}`);
  }

  async enable(id: string): Promise<AlertRule> {
    return this.http.post(`/v1/observability/alerts/${id}/enable`, {});
  }

  async disable(id: string): Promise<AlertRule> {
    return this.http.post(`/v1/observability/alerts/${id}/disable`, {});
  }

  async listIncidents(
    opts: { status?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Incident>> {
    const raw = await this.http.get("/observability/alerts/incidents", opts);
    return createPageResult(asPagePayload<Incident>(raw), (cursor) =>
      this.listIncidents({ ...opts, cursor })
    );
  }
}

// ── Dashboards ─────────────────────────────────────────────────────

export class DashboardsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<{ data: Dashboard[] }> {
    return this.http.get("/observability/dashboards");
  }

  async get(id: string): Promise<Dashboard> {
    return this.http.get(`/v1/observability/dashboards/${id}`);
  }

  async create(
    dashboard: Omit<Dashboard, "id" | "createdAt" | "updatedAt">
  ): Promise<Dashboard> {
    return this.http.post("/observability/dashboards", dashboard);
  }

  async update(id: string, dashboard: Partial<Dashboard>): Promise<Dashboard> {
    return this.http.put(`/v1/observability/dashboards/${id}`, dashboard);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/observability/dashboards/${id}`);
  }

  async share(
    id: string,
    opts: { expiresIn?: string; public?: boolean } = {}
  ): Promise<{ shareUrl: string }> {
    return this.http.post(`/v1/observability/dashboards/${id}/share`, opts);
  }
}

// ── Service ────────────────────────────────────────────────────────

export class ObservabilityService {
  readonly logs: LogsNamespace;
  readonly metrics: MetricsNamespace;
  readonly traces: TracesNamespace;
  readonly alerts: AlertsNamespace;
  readonly dashboards: DashboardsNamespace;

  constructor(private readonly http: HttpClient) {
    this.logs = new LogsNamespace(http);
    this.metrics = new MetricsNamespace(http);
    this.traces = new TracesNamespace(http);
    this.alerts = new AlertsNamespace(http);
    this.dashboards = new DashboardsNamespace(http);
  }
}

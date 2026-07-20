import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "frontal/core";
import type {
  AlertRule,
  Dashboard,
  Incident,
  LogEntry,
  MetricSeries,
  Trace,
} from "./schemas";

// ── Logs ───────────────────────────────────────────────────────────

/** Namespace for log-related operations. */
export class LogsNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Query logs with a search expression and time range.
   * @param input - Query parameters including search expression and time window.
   */
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

  /**
   * Stream logs in real-time matching a query.
   * @param input - Stream query parameters.
   */
  async *stream(input: {
    query: string;
    timeFrom: string;
    timeTo: string;
  }): AsyncIterable<{ type: string; data: unknown; id?: string }> {
    yield* this.http.stream("/observability/logs/stream", input);
  }

  /** Ingest log entries into the observability platform. */
  async ingest(entries: Omit<LogEntry, "id">[]): Promise<{ ingested: number }> {
    return this.http.post("/observability/logs/ingest", { entries });
  }
}

// ── Metrics ────────────────────────────────────────────────────────

/** Namespace for metric-related operations. */
export class MetricsNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Query a time series for a specific metric.
   * @param metric - Metric name.
   * @param timeRange - Time range and optional granularity.
   */
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

  /** List available metrics with pagination. */
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

  /** Ingest metric data points. */
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

/** Namespace for trace-related operations. */
export class TracesNamespace {
  constructor(private readonly http: HttpClient) {}

  /** Get a single trace by ID. */
  async get(traceId: string): Promise<Trace> {
    return this.http.get(`/observability/traces/${traceId}`);
  }

  /** List traces with optional filtering and pagination. */
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

  /** Query traces with advanced filtering (duration, time range, etc.). */
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

/** Namespace for alert rule and incident operations. */
export class AlertsNamespace {
  constructor(private readonly http: HttpClient) {}

  /** List alert rules with optional filtering. */
  async list(
    opts: { enabled?: boolean; severity?: string } = {}
  ): Promise<{ data: AlertRule[] }> {
    return this.http.get("/observability/alerts", opts);
  }

  /** Create a new alert rule. */
  async create(
    rule: Omit<AlertRule, "id" | "createdAt" | "lastFiredAt">
  ): Promise<AlertRule> {
    return this.http.post("/observability/alerts", rule);
  }

  /** Update an existing alert rule. */
  async update(id: string, rule: Partial<AlertRule>): Promise<AlertRule> {
    return this.http.put(`/observability/alerts/${id}`, rule);
  }

  /** Delete an alert rule. */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/observability/alerts/${id}`);
  }

  /** Enable an alert rule. */
  async enable(id: string): Promise<AlertRule> {
    return this.http.post(`/observability/alerts/${id}/enable`, {});
  }

  /** Disable an alert rule. */
  async disable(id: string): Promise<AlertRule> {
    return this.http.post(`/observability/alerts/${id}/disable`, {});
  }

  /** List incidents with optional status filtering and pagination. */
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

/** Namespace for dashboard operations. */
export class DashboardsNamespace {
  constructor(private readonly http: HttpClient) {}

  /** List all dashboards. */
  async list(): Promise<{ data: Dashboard[] }> {
    return this.http.get("/observability/dashboards");
  }

  /** Get a single dashboard by ID. */
  async get(id: string): Promise<Dashboard> {
    return this.http.get(`/observability/dashboards/${id}`);
  }

  /** Create a new dashboard. */
  async create(
    dashboard: Omit<Dashboard, "id" | "createdAt" | "updatedAt">
  ): Promise<Dashboard> {
    return this.http.post("/observability/dashboards", dashboard);
  }

  /** Update an existing dashboard. */
  async update(id: string, dashboard: Partial<Dashboard>): Promise<Dashboard> {
    return this.http.put(`/observability/dashboards/${id}`, dashboard);
  }

  /** Delete a dashboard. */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/observability/dashboards/${id}`);
  }

  /** Generate a shareable link for a dashboard. */
  async share(
    id: string,
    opts: { expiresIn?: string; public?: boolean } = {}
  ): Promise<{ shareUrl: string }> {
    return this.http.post(`/observability/dashboards/${id}/share`, opts);
  }
}

// ── Service ────────────────────────────────────────────────────────

/**
 * Structured observability events (`/v1/observability/events`).
 */
export class ObservabilityEventsNamespace {
  readonly logs: LogsNamespace;
  readonly metrics: MetricsNamespace;
  readonly traces: TracesNamespace;

  constructor(private readonly http: HttpClient) {
    this.logs = new LogsNamespace(http);
    this.metrics = new MetricsNamespace(http);
    this.traces = new TracesNamespace(http);
  }

  /** Report a batch of observability events. */
  reportBatch(
    events: Record<string, unknown>[]
  ): Promise<Record<string, unknown>> {
    return this.http.post("/observability/events/batch", { events });
  }

  /** Aggregate statistics over reported events. */
  stats(
    opts: { from?: string; to?: string; [key: string]: unknown } = {}
  ): Promise<Record<string, unknown>> {
    return this.http.get("/observability/events/stats", opts);
  }
}

/**
 * Client for the Frontal Observability API (`/v1/observability`).
 * Manages logs, metrics, traces, alerts, dashboards, and events.
 */
export class ObservabilitySdk {
  /** Log operations. */
  readonly logs: LogsNamespace;
  /** Metric operations. */
  readonly metrics: MetricsNamespace;
  /** Trace operations. */
  readonly traces: TracesNamespace;
  /** Alert and incident operations. */
  readonly alerts: AlertsNamespace;
  /** Dashboard operations. */
  readonly dashboards: DashboardsNamespace;
  /** Event operations. */
  readonly events: ObservabilityEventsNamespace;

  constructor(private readonly http: HttpClient) {
    this.logs = new LogsNamespace(http);
    this.metrics = new MetricsNamespace(http);
    this.traces = new TracesNamespace(http);
    this.alerts = new AlertsNamespace(http);
    this.dashboards = new DashboardsNamespace(http);
    this.events = new ObservabilityEventsNamespace(http);
  }
}

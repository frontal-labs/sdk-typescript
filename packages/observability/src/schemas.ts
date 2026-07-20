import { z } from "zod";

// ── Logs ───────────────────────────────────────────────────────────

/** Valid log severity levels. */
export const LogLevelSchema = z.enum([
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);

/** Schema for a single log entry. */
export const LogEntrySchema = z
  .object({
    id: z.string(),
    timestamp: z.string(),
    level: LogLevelSchema,
    service: z.string(),
    message: z.string(),
    resource: z.object({ type: z.string(), id: z.string() }).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    traceId: z.string().optional(),
    spanId: z.string().optional(),
  })
  .loose();

/** Schema for querying logs. */
export const LogQuerySchema = z.object({
  query: z.string(),
  timeFrom: z.string(),
  timeTo: z.string(),
  level: LogLevelSchema.optional(),
  limit: z.number().int().positive().default(100),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// ── Metrics ────────────────────────────────────────────────────────

/** Schema for a single metric data point. */
export const MetricPointSchema = z
  .object({
    timestamp: z.string(),
    value: z.number(),
    tags: z.record(z.string(), z.string()).optional(),
  })
  .loose();

/** Schema for a metric series with multiple data points. */
export const MetricSeriesSchema = z
  .object({
    metric: z.string(),
    unit: z.string().optional(),
    data: z.array(MetricPointSchema),
  })
  .loose();

// ── Traces ─────────────────────────────────────────────────────────

/** Schema for a span within a trace. */
export const TraceSpanSchema = z
  .object({
    spanId: z.string(),
    parentSpanId: z.string().optional(),
    name: z.string(),
    startTime: z.string(),
    duration: z.number(),
    status: z.enum(["ok", "error"]),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

/** Schema for a trace with its spans. */
export const TraceSchema = z
  .object({
    id: z.string(),
    traceId: z.string(),
    name: z.string(),
    service: z.string(),
    duration: z.number(),
    status: z.enum(["ok", "error", "unknown"]),
    spans: z.array(TraceSpanSchema),
    startTime: z.string(),
    endTime: z.string(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

// ── Alerts ─────────────────────────────────────────────────────────

/** Alert severity levels. */
export const AlertSeveritySchema = z.enum(["critical", "warning", "info"]);

/** Schema for an alert rule definition. */
export const AlertRuleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    metric: z.string(),
    condition: z.enum([">", "<", ">=", "<=", "=="]),
    threshold: z.number(),
    severity: AlertSeveritySchema,
    duration: z.string(),
    channels: z.array(z.string()),
    enabled: z.boolean(),
    lastFiredAt: z.string().optional(),
    createdAt: z.string(),
  })
  .loose();

/** Incident lifecycle statuses. */
export const IncidentStatusSchema = z.enum([
  "firing",
  "resolved",
  "acknowledged",
]);

/** Schema for an alert incident. */
export const IncidentSchema = z
  .object({
    id: z.string(),
    alertRuleId: z.string(),
    status: IncidentStatusSchema,
    startedAt: z.string(),
    resolvedAt: z.string().optional(),
    metricValue: z.number(),
    threshold: z.number(),
  })
  .loose();

// ── Dashboards ─────────────────────────────────────────────────────

/** Dashboard widget visualization types. */
export const WidgetTypeSchema = z.enum([
  "line",
  "bar",
  "table",
  "stat",
  "heatmap",
]);

/** Schema for a dashboard widget. */
export const DashboardWidgetSchema = z
  .object({
    id: z.string(),
    type: WidgetTypeSchema,
    title: z.string(),
    metric: z.string(),
    query: z.string().optional(),
    width: z.number().int().min(1).max(12),
    height: z.number().int().min(1).max(6),
    options: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

/** Schema for a dashboard with its widgets. */
export const DashboardSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    widgets: z.array(DashboardWidgetSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose();

// ── Config ─────────────────────────────────────────────────────────

/** Schema for observability client configuration. */
export const obsConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

/** Log severity level. */
export type LogLevel = z.infer<typeof LogLevelSchema>;
/** A single log entry. */
export type LogEntry = z.infer<typeof LogEntrySchema>;
/** Log query parameters. */
export type LogQuery = z.infer<typeof LogQuerySchema>;
/** A single metric data point. */
export type MetricPoint = z.infer<typeof MetricPointSchema>;
/** A metric series with data points. */
export type MetricSeries = z.infer<typeof MetricSeriesSchema>;
/** A trace with spans. */
export type Trace = z.infer<typeof TraceSchema>;
/** A span within a trace. */
export type TraceSpan = z.infer<typeof TraceSpanSchema>;
/** Alert severity level. */
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;
/** Alert rule definition. */
export type AlertRule = z.infer<typeof AlertRuleSchema>;
/** Incident status. */
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
/** An alert incident. */
export type Incident = z.infer<typeof IncidentSchema>;
/** Dashboard widget type. */
export type WidgetType = z.infer<typeof WidgetTypeSchema>;
/** A dashboard with widgets. */
export type Dashboard = z.infer<typeof DashboardSchema>;
/** Observability client configuration. */
export type ObsConfig = z.input<typeof obsConfigSchema>;

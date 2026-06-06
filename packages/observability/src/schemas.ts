import { z } from "zod";

// ── Logs ───────────────────────────────────────────────────────────

export const LogLevelSchema = z.enum([
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);

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
  .passthrough();

export const LogQuerySchema = z.object({
  query: z.string(),
  timeFrom: z.string(),
  timeTo: z.string(),
  level: LogLevelSchema.optional(),
  limit: z.number().int().positive().default(100),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// ── Metrics ────────────────────────────────────────────────────────

export const MetricPointSchema = z
  .object({
    timestamp: z.string(),
    value: z.number(),
    tags: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

export const MetricSeriesSchema = z
  .object({
    metric: z.string(),
    unit: z.string().optional(),
    data: z.array(MetricPointSchema),
  })
  .passthrough();

// ── Traces ─────────────────────────────────────────────────────────

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
  .passthrough();

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
  .passthrough();

// ── Alerts ─────────────────────────────────────────────────────────

export const AlertSeveritySchema = z.enum(["critical", "warning", "info"]);

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
  .passthrough();

export const IncidentStatusSchema = z.enum([
  "firing",
  "resolved",
  "acknowledged",
]);

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
  .passthrough();

// ── Dashboards ─────────────────────────────────────────────────────

export const WidgetTypeSchema = z.enum([
  "line",
  "bar",
  "table",
  "stat",
  "heatmap",
]);

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
  .passthrough();

export const DashboardSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    widgets: z.array(DashboardWidgetSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

// ── Config ─────────────────────────────────────────────────────────

export const obsConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type LogLevel = z.infer<typeof LogLevelSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type LogQuery = z.infer<typeof LogQuerySchema>;
export type MetricPoint = z.infer<typeof MetricPointSchema>;
export type MetricSeries = z.infer<typeof MetricSeriesSchema>;
export type Trace = z.infer<typeof TraceSchema>;
export type TraceSpan = z.infer<typeof TraceSpanSchema>;
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;
export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type WidgetType = z.infer<typeof WidgetTypeSchema>;
export type Dashboard = z.infer<typeof DashboardSchema>;
export type ObsConfig = z.input<typeof obsConfigSchema>;

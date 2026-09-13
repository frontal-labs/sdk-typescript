import { z } from "zod";

/** Outcome of the audited action. */
export const AuditOutcomeSchema = z.enum(["success", "failure", "denied"]);

/**
 * A stored audit event — the shape the audit service returns
 * (`GET /v1/audit/events`). Field names mirror the backend record; the SDK
 * converts between camelCase here and snake_case on the wire.
 */
export const AuditEventSchema = z
  .object({
    id: z.string(),
    /** Who performed the action (user, service account, agent, …). */
    actorId: z.string(),
    actorType: z.string().optional(),
    /** Verb, e.g. `dataset.export`. */
    action: z.string(),
    /** Coarse grouping, e.g. `data`, `agents`, `governance`. */
    eventDomain: z.string().optional(),
    /** Fine-grained type inside the domain. */
    eventType: z.string().optional(),
    resourceType: z.string().optional(),
    resourceId: z.string().optional(),
    outcome: AuditOutcomeSchema,
    /** Run / execution the event belongs to, when any. */
    runId: z.string().optional(),
    /** Monotonic position within `runId`. */
    sequence: z.number().int().optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    requestId: z.string().optional(),
    idempotencyKey: z.string().optional(),
    tenantId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.string(),
  })
  .loose();

/** Input for recording a new audit event (`POST /v1/audit/events`). */
export const AuditEventInputSchema = z.object({
  action: z.string().min(1),
  /** Defaults to the caller identity when omitted server-side. */
  actorId: z.string().optional(),
  actorType: z.string().optional(),
  eventDomain: z.string().optional(),
  eventType: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  outcome: AuditOutcomeSchema.default("success"),
  runId: z.string().optional(),
  sequence: z.number().int().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
  /** Makes retries safe: the service de-duplicates on this key. */
  idempotencyKey: z.string().optional(),
  tenantId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** Filters accepted by `GET /v1/audit/events`. */
export const AuditEventFiltersSchema = z.object({
  actorId: z.string().optional(),
  action: z.string().optional(),
  runId: z.string().optional(),
  eventDomain: z.string().optional(),
  eventType: z.string().optional(),
  resourceType: z.string().optional(),
  outcome: AuditOutcomeSchema.optional(),
  /** ISO timestamp lower bound (inclusive). */
  from: z.string().optional(),
  /** ISO timestamp upper bound (exclusive). */
  to: z.string().optional(),
  pageSize: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  cursor: z.string().optional(),
});

/** Zod schema for validating audit client configuration. */
export const auditConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

/** Alias for AuditEventSchema (used by tests). */
export const AuditSdkEventSchema = AuditEventSchema;

/** A stored audit event. */
export type AuditEvent = z.infer<typeof AuditEventSchema>;
/** Input for recording a new audit event. */
export type AuditEventInput = z.input<typeof AuditEventInputSchema>;
/** Filters for querying audit events. */
export type AuditEventFilters = z.input<typeof AuditEventFiltersSchema>;
/** Outcome of an audited action. */
export type AuditOutcome = z.infer<typeof AuditOutcomeSchema>;
/** Validated audit client configuration. */
export type AuditConfig = z.input<typeof auditConfigSchema>;

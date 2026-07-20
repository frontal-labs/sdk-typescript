import { z } from "zod";

/** Zod schema for a stored audit event. */
export const AuditEventSchema = z
  .object({
    id: z.string(),
    actor: z.object({ userId: z.string(), memberId: z.string().optional() }),
    action: z.string(),
    resource: z.object({ type: z.string(), id: z.string() }),
    metadata: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(["success", "failure", "denied"]),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    organizationId: z.string().optional(),
    tenantId: z.string().optional(),
    timestamp: z.string(),
  })
  .loose();

/** Zod schema for creating a new audit event. */
export const AuditEventInputSchema = z.object({
  action: z.string(),
  resource: z.object({ type: z.string(), id: z.string() }),
  metadata: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["success", "failure", "denied"]).default("success"),
});

/** Zod schema for filtering audit events when querying. */
export const AuditQuerySchema = z.object({
  actorUserId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  status: z.string().optional(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
});

/** Zod schema for an audit report. */
export const AuditReportSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    query: AuditQuerySchema,
    format: z.enum(["csv", "json"]),
    status: z.enum(["pending", "running", "completed", "failed"]),
    downloadUrl: z.string().optional(),
    createdAt: z.string(),
  })
  .loose();

/** Zod schema for validating audit client configuration. */
export const auditConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

/** A stored audit event. */
export type AuditEvent = z.infer<typeof AuditEventSchema>;
/** Input for recording a new audit event. */
export type AuditEventInput = z.infer<typeof AuditEventInputSchema>;
/** Filters for querying audit events. */
export type AuditQuery = z.infer<typeof AuditQuerySchema>;
/** An audit report definition. */
export type AuditReport = z.infer<typeof AuditReportSchema>;
/** Validated audit client configuration. */
export type AuditConfig = z.input<typeof auditConfigSchema>;

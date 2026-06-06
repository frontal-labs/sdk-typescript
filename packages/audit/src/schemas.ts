import { z } from "zod";

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
  .passthrough();

export const AuditEventInputSchema = z.object({
  action: z.string(),
  resource: z.object({ type: z.string(), id: z.string() }),
  metadata: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["success", "failure", "denied"]).default("success"),
});

export const AuditQuerySchema = z.object({
  actorUserId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  status: z.string().optional(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
});

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
  .passthrough();

export const auditConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type AuditEventInput = z.infer<typeof AuditEventInputSchema>;
export type AuditQuery = z.infer<typeof AuditQuerySchema>;
export type AuditReport = z.infer<typeof AuditReportSchema>;
export type AuditConfig = z.input<typeof auditConfigSchema>;

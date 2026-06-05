import { z } from "zod";

export const AuditEventSchema = z
  .object({
    id: z.string(),
    actor: z.object({ user_id: z.string(), member_id: z.string().optional() }),
    action: z.string(),
    resource: z.object({ type: z.string(), id: z.string() }),
    metadata: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(["success", "failure", "denied"]),
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
    organization_id: z.string().optional(),
    tenant_id: z.string().optional(),
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
  actor_user_id: z.string().optional(),
  action: z.string().optional(),
  resource_type: z.string().optional(),
  status: z.string().optional(),
  time_from: z.string().optional(),
  time_to: z.string().optional(),
});

export const AuditReportSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    query: AuditQuerySchema,
    format: z.enum(["csv", "json"]),
    status: z.enum(["pending", "running", "completed", "failed"]),
    download_url: z.string().optional(),
    created_at: z.string(),
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

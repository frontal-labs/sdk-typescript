import { z } from "zod";

export const WebhookSchema = z
  .object({
    id: z.string(),
    url: z.string().url(),
    events: z.array(z.string()),
    secret: z.string().optional(),
    status: z.enum(["active", "disabled"]),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();
export const DeliveryAttemptSchema = z
  .object({
    id: z.string(),
    webhook_id: z.string(),
    event_id: z.string(),
    status: z.enum(["success", "failed", "pending"]),
    status_code: z.number().optional(),
    response_body: z.string().optional(),
    duration_ms: z.number().optional(),
    attempted_at: z.string(),
  })
  .passthrough();
export const WebhookStatsSchema = z
  .object({
    total_deliveries: z.number(),
    success_rate: z.number(),
    avg_latency_ms: z.number(),
    error_rate: z.number(),
  })
  .passthrough();
export const webhooksConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type Webhook = z.infer<typeof WebhookSchema>;
export type DeliveryAttempt = z.infer<typeof DeliveryAttemptSchema>;
export type WebhookStats = z.infer<typeof WebhookStatsSchema>;
export type WebhooksConfig = z.input<typeof webhooksConfigSchema>;

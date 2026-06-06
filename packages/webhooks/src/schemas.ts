import { z } from "zod";

export const WebhookSchema = z
  .object({
    id: z.string(),
    url: z.string().url(),
    events: z.array(z.string()),
    secret: z.string().optional(),
    status: z.enum(["active", "disabled"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();
export const DeliveryAttemptSchema = z
  .object({
    id: z.string(),
    webhookId: z.string(),
    eventId: z.string(),
    status: z.enum(["success", "failed", "pending"]),
    statusCode: z.number().optional(),
    responseBody: z.string().optional(),
    durationMs: z.number().optional(),
    attemptedAt: z.string(),
  })
  .passthrough();
export const WebhookStatsSchema = z
  .object({
    totalDeliveries: z.number(),
    successRate: z.number(),
    avgLatencyMs: z.number(),
    errorRate: z.number(),
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

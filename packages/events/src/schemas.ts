import { z } from "zod";

// ── Event ──────────────────────────────────────────────────────────

export const EventSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    type: z.string(),
    version: z.string().default("1.0"),
    data: z.record(z.string(), z.unknown()),
    metadata: z.object({
      correlation_id: z.string().optional(),
      causation_id: z.string().optional(),
      timestamp: z.string(),
      user_id: z.string().optional(),
      organization_id: z.string().optional(),
      subject: z.string().optional(),
      subject_type: z.string().optional(),
    }),
    specversion: z.string().default("1.0"),
    datacontenttype: z.literal("application/json").default("application/json"),
  })
  .passthrough();

export const PublishEventSchema = z.object({
  source: z.string(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()),
  metadata: z
    .object({
      correlation_id: z.string().optional(),
      user_id: z.string().optional(),
      organization_id: z.string().optional(),
      subject: z.string().optional(),
      subject_type: z.string().optional(),
    })
    .optional(),
});

// ── Topic ──────────────────────────────────────────────────────────

export const TopicSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    schema_id: z.string().optional(),
    event_count: z.number().int(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

// ── Subscription ───────────────────────────────────────────────────

export const SubscriptionSchema = z
  .object({
    id: z.string(),
    topic_id: z.string(),
    name: z.string(),
    endpoint: z.string(),
    filter: z.string().optional(),
    status: z.enum(["active", "paused", "error"]),
    retry_policy: z
      .object({
        max_retries: z.number().int(),
        backoff: z.enum(["exponential", "linear", "constant"]),
      })
      .optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

// ── Dead Letter ────────────────────────────────────────────────────

export const DeadLetterEventSchema = z
  .object({
    id: z.string(),
    event: EventSchema,
    subscription_id: z.string(),
    error: z.string(),
    attempts: z.number().int(),
    last_attempt_at: z.string(),
    created_at: z.string(),
  })
  .passthrough();

// ── Event Schema Registry ──────────────────────────────────────────

export const EventTypeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    schema: z.record(z.string(), z.unknown()),
    description: z.string().optional(),
    created_at: z.string(),
  })
  .passthrough();

// ── Config ─────────────────────────────────────────────────────────

export const eventsConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type Event = z.infer<typeof EventSchema>;
export type PublishEvent = z.infer<typeof PublishEventSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type DeadLetterEvent = z.infer<typeof DeadLetterEventSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type EventsConfig = z.input<typeof eventsConfigSchema>;

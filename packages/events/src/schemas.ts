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
      correlationId: z.string().optional(),
      causationId: z.string().optional(),
      timestamp: z.string(),
      userId: z.string().optional(),
      organizationId: z.string().optional(),
      subject: z.string().optional(),
      subjectType: z.string().optional(),
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
      correlationId: z.string().optional(),
      userId: z.string().optional(),
      organizationId: z.string().optional(),
      subject: z.string().optional(),
      subjectType: z.string().optional(),
    })
    .optional(),
});

// ── Topic ──────────────────────────────────────────────────────────

export const TopicSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    schemaId: z.string().optional(),
    eventCount: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

// ── Subscription ───────────────────────────────────────────────────

export const SubscriptionSchema = z
  .object({
    id: z.string(),
    topicId: z.string(),
    name: z.string(),
    endpoint: z.string(),
    filter: z.string().optional(),
    status: z.enum(["active", "paused", "error"]),
    retryPolicy: z
      .object({
        maxRetries: z.number().int(),
        backoff: z.enum(["exponential", "linear", "constant"]),
      })
      .optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

// ── Dead Letter ────────────────────────────────────────────────────

export const DeadLetterEventSchema = z
  .object({
    id: z.string(),
    event: EventSchema,
    subscriptionId: z.string(),
    error: z.string(),
    attempts: z.number().int(),
    lastAttemptAt: z.string(),
    createdAt: z.string(),
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
    createdAt: z.string(),
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

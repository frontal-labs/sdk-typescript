import { z } from "zod";

// ── Event ──────────────────────────────────────────────────────────

/** Zod schema for a stored event (CloudEvents-compliant). */
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
  .loose();

/** Zod schema for publishing an event to a topic. */
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

/** Zod schema for an event topic. */
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
  .loose();

// ── Subscription ───────────────────────────────────────────────────

/** Zod schema for an event subscription. */
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
  .loose();

// ── Dead Letter ────────────────────────────────────────────────────

/** Zod schema for a dead-letter event (failed delivery). */
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
  .loose();

// ── Event Schema Registry ──────────────────────────────────────────

/** Zod schema for a registered event type/schema. */
export const EventTypeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    schema: z.record(z.string(), z.unknown()),
    description: z.string().optional(),
    createdAt: z.string(),
  })
  .loose();

// ── Config ─────────────────────────────────────────────────────────

/** Zod schema for validating events client configuration. */
export const eventsConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

/** A stored event. */
export type Event = z.infer<typeof EventSchema>;
/** An event to publish. */
export type PublishEvent = z.infer<typeof PublishEventSchema>;
/** An event topic. */
export type Topic = z.infer<typeof TopicSchema>;
/** An event subscription. */
export type Subscription = z.infer<typeof SubscriptionSchema>;
/** A dead-letter event from a failed delivery. */
export type DeadLetterEvent = z.infer<typeof DeadLetterEventSchema>;
/** A registered event type with schema. */
export type EventType = z.infer<typeof EventTypeSchema>;
/** Validated events client configuration. */
export type EventsConfig = z.input<typeof eventsConfigSchema>;

import { z } from "zod";

export const QueueSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    status: z.enum(["active", "paused"]),
    maxConcurrency: z.number().int(),
    retentionDays: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();
export const JobSchema = z
  .object({
    id: z.string(),
    queueId: z.string(),
    payload: z.record(z.string(), z.unknown()),
    status: z.enum([
      "pending",
      "processing",
      "completed",
      "failed",
      "canceled",
    ]),
    attempts: z.number().int(),
    maxAttempts: z.number().int(),
    error: z.string().optional(),
    scheduledAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();
export const queuesConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type Queue = z.infer<typeof QueueSchema>;
export type Job = z.infer<typeof JobSchema>;
export type QueuesConfig = z.input<typeof queuesConfigSchema>;

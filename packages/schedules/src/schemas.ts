import { z } from "zod";

/** Schema for a schedule definition. */
export const ScheduleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    cron: z.string(),
    timezone: z.string(),
    target: z.object({
      type: z.enum(["pipeline", "workflow", "function", "webhook"]),
      id: z.string(),
    }),
    payload: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(["active", "paused"]),
    lastRunAt: z.string().optional(),
    nextRunAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose();

/** Schema for a schedule execution run. */
export const ScheduleRunSchema = z
  .object({
    id: z.string(),
    scheduleId: z.string(),
    status: z.enum(["running", "completed", "failed", "canceled"]),
    startedAt: z.string(),
    completedAt: z.string().optional(),
    error: z.string().optional(),
    createdAt: z.string(),
  })
  .loose();

/** Schema for schedules client configuration. */
export const schedulesConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

/** A schedule definition. */
export type Schedule = z.infer<typeof ScheduleSchema>;
/** A schedule execution run. */
export type ScheduleRun = z.infer<typeof ScheduleRunSchema>;
/** Schedules client configuration. */
export type SchedulesConfig = z.input<typeof schedulesConfigSchema>;

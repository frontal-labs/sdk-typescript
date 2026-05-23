import {
  filterConditionsSchema,
  retryConfigSchema,
  timestampSchema,
} from "@frontal/core";
import { z } from "zod";

export const PipelineStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "deprecated",
]);
export const RunStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const PipelineSourceSchema = z
  .object({
    type: z.enum(["graph-entity", "webhook", "schedule", "manual"]),
    entityType: z.string().optional(),
    filter: filterConditionsSchema.optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const PipelineStepSchema = z
  .object({
    id: z.string(),
    type: z.enum([
      "collect",
      "transform",
      "enrich",
      "validate",
      "write",
      "notify",
    ]),
    name: z.string().optional(),
    description: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    dependsOn: z.array(z.string()).optional(),
    condition: z.string().optional(),
    timeout: z.string().optional(),
    retry: retryConfigSchema.optional(),
  })
  .passthrough();

export const PipelineDefinitionSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    source: PipelineSourceSchema,
    steps: z.array(PipelineStepSchema).min(1),
    schedule: z.string().optional(),
    timeout: z.string().optional(),
    retryPolicy: z.enum(["linear", "exponential", "none"]).default("linear"),
    errorHandling: z.enum(["fail", "skip", "retry"]).default("fail"),
    tags: z.array(z.string()).default([]),
  })
  .strict();

export const PipelineSchema = PipelineDefinitionSchema.extend({
  id: z.string(),
  version: z.number().int(),
  status: PipelineStatusSchema,
  lastRun: z
    .object({
      id: z.string(),
      status: RunStatusSchema,
      startedAt: timestampSchema,
      completedAt: timestampSchema.optional(),
      durationMs: z.number().int().optional(),
    })
    .optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).passthrough();

export const PipelineRunSchema = z
  .object({
    id: z.string(),
    pipelineId: z.string(),
    version: z.number().int(),
    status: RunStatusSchema,
    input: z.record(z.string(), z.unknown()).optional(),
    output: z.record(z.string(), z.unknown()).optional(),
    context: z.record(z.string(), z.unknown()).optional(),
    stepRuns: z.array(
      z.object({
        stepId: z.string(),
        status: RunStatusSchema,
        startedAt: timestampSchema.optional(),
        completedAt: timestampSchema.optional(),
        durationMs: z.number().int().optional(),
        output: z.record(z.string(), z.unknown()).optional(),
        error: z.string().optional(),
      })
    ),
    triggeredBy: z.string(),
    startedAt: timestampSchema,
    completedAt: timestampSchema.optional(),
    durationMs: z.number().int().optional(),
    error: z.string().optional(),
  })
  .passthrough();

export const BackfillSchema = z
  .object({
    id: z.string(),
    pipelineId: z.string(),
    status: z.enum(["pending", "running", "completed", "failed", "cancelled"]),
    from: z.string().datetime(),
    to: z.string().datetime(),
    strategy: z.enum(["full", "incremental"]).default("incremental"),
    dryRun: z.boolean().default(false),
    processed: z.number().int().default(0),
    total: z.number().int(),
    errors: z
      .array(
        z.object({
          timestamp: timestampSchema,
          entity: z.record(z.string(), z.unknown()),
          error: z.string(),
        })
      )
      .optional(),
    createdAt: timestampSchema,
    completedAt: timestampSchema.optional(),
  })
  .passthrough();

export const LineageGraphSchema = z
  .object({
    nodes: z.array(
      z.object({
        id: z.string(),
        type: z.enum(["pipeline", "entity", "dataset"]),
        name: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    ),
    edges: z.array(
      z.object({
        from: z.string(),
        to: z.string(),
        type: z.enum(["data-flow", "dependency", "produces"]),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    ),
    lastUpdated: timestampSchema,
  })
  .passthrough();

export const PipelineHealthSchema = z
  .object({
    pipelineId: z.string(),
    status: z.enum(["healthy", "degraded", "unhealthy"]),
    lastRun: z.object({
      status: RunStatusSchema,
      completedAt: timestampSchema,
      durationMs: z.number().int(),
      success: z.boolean(),
    }),
    recentRuns: z.array(
      z.object({
        id: z.string(),
        status: RunStatusSchema,
        completedAt: timestampSchema,
        durationMs: z.number().int(),
        success: z.boolean(),
      })
    ),
    metrics: z.object({
      avgRunTime: z.number(),
      successRate: z.number(),
      errorRate: z.number(),
      throughput: z.number(),
    }),
    alerts: z.array(
      z.object({
        level: z.enum(["info", "warning", "error", "critical"]),
        message: z.string(),
        timestamp: timestampSchema,
      })
    ),
  })
  .passthrough();

// Inferred types
export type PipelineStatus = z.infer<typeof PipelineStatusSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
export type PipelineSource = z.infer<typeof PipelineSourceSchema>;
export type PipelineStep = z.infer<typeof PipelineStepSchema>;
export type PipelineDefinition = z.infer<typeof PipelineDefinitionSchema>;
export type Pipeline = z.infer<typeof PipelineSchema>;
export type PipelineRun = z.infer<typeof PipelineRunSchema>;
export type Backfill = z.infer<typeof BackfillSchema>;
export type LineageGraph = z.infer<typeof LineageGraphSchema>;
export type PipelineHealth = z.infer<typeof PipelineHealthSchema>;

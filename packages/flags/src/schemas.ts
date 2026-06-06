import { z } from "zod";

// ── Flag ───────────────────────────────────────────────────────────

export const FlagTypeSchema = z.enum(["boolean", "string", "number"]);

export const FlagSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: FlagTypeSchema,
    defaultValue: z.union([z.boolean(), z.string(), z.number()]),
    status: z.enum(["active", "inactive", "archived"]),
    tags: z.array(z.string()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const CreateFlagSchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1),
  description: z.string().optional(),
  type: FlagTypeSchema,
  defaultValue: z.union([z.boolean(), z.string(), z.number()]),
});

// ── Targeting ──────────────────────────────────────────────────────

export const TargetingRuleSchema = z
  .object({
    id: z.string(),
    flagId: z.string(),
    attribute: z.string(),
    operator: z.enum([
      "eq",
      "ne",
      "in",
      "nin",
      "contains",
      "starts_with",
      "ends_with",
    ]),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    priority: z.number().int(),
  })
  .passthrough();

// ── Rollout ────────────────────────────────────────────────────────

export const RolloutSchema = z
  .object({
    id: z.string(),
    flagId: z.string(),
    percentage: z.number().min(0).max(100),
    value: z.union([z.boolean(), z.string(), z.number()]),
    status: z.enum(["active", "paused", "completed"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

// ── Experiment ─────────────────────────────────────────────────────

export const ExperimentVariantSchema = z.object({
  name: z.string(),
  value: z.union([z.boolean(), z.string(), z.number()]),
  percentage: z.number().min(0).max(100),
});

export const ExperimentSchema = z
  .object({
    id: z.string(),
    flagId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    variants: z.array(ExperimentVariantSchema),
    status: z.enum(["draft", "running", "stopped", "completed"]),
    startedAt: z.string().optional(),
    endedAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

// ── Evaluation ─────────────────────────────────────────────────────

export const EvaluationContextSchema = z.object({
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  tenantId: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const FlagEvaluationSchema = z.object({
  flagKey: z.string(),
  value: z.union([z.boolean(), z.string(), z.number()]),
  reason: z.string(),
  source: z.enum(["default", "targeting", "rollout", "experiment"]),
});

// ── Config ─────────────────────────────────────────────────────────

export const flagsConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type FlagType = z.infer<typeof FlagTypeSchema>;
export type Flag = z.infer<typeof FlagSchema>;
export type CreateFlag = z.infer<typeof CreateFlagSchema>;
export type TargetingRule = z.infer<typeof TargetingRuleSchema>;
export type Rollout = z.infer<typeof RolloutSchema>;
export type ExperimentVariant = z.infer<typeof ExperimentVariantSchema>;
export type Experiment = z.infer<typeof ExperimentSchema>;
export type EvaluationContext = z.infer<typeof EvaluationContextSchema>;
export type FlagEvaluation = z.infer<typeof FlagEvaluationSchema>;
export type FlagsConfig = z.input<typeof flagsConfigSchema>;

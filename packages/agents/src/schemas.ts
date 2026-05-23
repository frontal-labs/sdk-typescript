import { z } from "zod";
import { filterConditionsSchema } from "@frontal/core";

export const timestampSchema = z
  .union([z.string().datetime(), z.date()])
  .transform((value) => (value instanceof Date ? value : new Date(value)));

export const retryConfigSchema = z
  .object({
    maxRetries: z.number().int().min(0).default(3),
    retryDelay: z.number().int().positive().default(1000),
    backoff: z
      .enum(["constant", "linear", "exponential"])
      .default("exponential"),
    retryOn: z
      .array(z.number().int())
      .default([408, 409, 425, 429, 500, 502, 503, 504]),
  })
  .default({
    maxRetries: 3,
    retryDelay: 1000,
    backoff: "exponential",
    retryOn: [408, 409, 425, 429, 500, 502, 503, 504],
  });

export const AgentStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "deprecated",
]);
export const UrgencySchema = z.enum(["critical", "high", "medium", "low"]);
export const EscalationStatusSchema = z.enum([
  "pending",
  "resolved",
  "delegated",
  "overridden",
  "expired",
]);

export const TriggerDefinitionSchema = z
  .object({
    event: z.string(),
    filter: filterConditionsSchema.optional(),
    debounce: z.string().optional(),
  })
  .strict();

export const AgentScopeSchema = z
  .object({
    read: z.array(z.string()).default([]),
    write: z.array(z.string()).default([]),
    actions: z.array(z.string()).default([]),
    escalate: z.array(z.string()).default([]),
    invokeAgents: z.array(z.string()).default([]),
    invokeFunctions: z.array(z.string()).default([]),
  })
  .default({
    read: [],
    write: [],
    actions: [],
    escalate: [],
    invokeAgents: [],
    invokeFunctions: [],
  });

export const ConfidenceConfigSchema = z
  .object({
    autoExecuteAbove: z.number().min(0).max(1).default(0.85),
    escalateBelow: z.number().min(0).max(1).default(0.6),
    requireReviewBetween: z.boolean().default(true),
  })
  .default({
    autoExecuteAbove: 0.85,
    escalateBelow: 0.6,
    requireReviewBetween: true,
  });

export const MemoryConfigSchema = z
  .object({
    type: z.enum(["working", "persistent", "episodic"]).default("working"),
    ttl: z.string().optional(),
    maxTokens: z.number().int().positive().optional(),
  })
  .default({ type: "working" as const });

export const RateLimitConfigSchema = z.object({
  maxExecutionsPerMinute: z.number().int().positive().optional(),
  maxConcurrent: z.number().int().positive().optional(),
});

export const AgentDefinitionSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    triggers: z.array(TriggerDefinitionSchema).min(1),
    scope: AgentScopeSchema,
    confidence: ConfidenceConfigSchema,
    memory: MemoryConfigSchema,
    retry: retryConfigSchema,
    timeout: z.string().default("30s"),
    rateLimit: RateLimitConfigSchema.optional(),
    tags: z.array(z.string()).default([]),
  })
  .strict();

export const AgentMetricsSummarySchema = z
  .object({
    executionsToday: z.number().int(),
    escalationRate: z.number().min(0).max(1),
    avgExecutionMs: z.number().int(),
    successRate: z.number().min(0).max(1),
  })
  .passthrough();

export const AgentSchema = AgentDefinitionSchema.omit({
  scope: true,
  confidence: true,
  memory: true,
  retry: true,
})
  .extend({
    id: z.string(),
    scope: AgentScopeSchema,
    confidence: ConfidenceConfigSchema,
    memory: MemoryConfigSchema,
    retry: retryConfigSchema,
    version: z.number().int(),
    status: AgentStatusSchema,
    environment: z.string(),
    metrics: AgentMetricsSummarySchema.optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .passthrough();

export const DecisionStepSchema = z
  .object({
    step: z.number().int(),
    type: z.enum(["observe", "reason", "plan", "act", "escalate", "complete"]),
    description: z.string(),
    dataRead: z
      .array(
        z.object({
          entity: z.string(),
          id: z.string(),
          fields: z.array(z.string()),
        })
      )
      .optional(),
    reasoning: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    actionTaken: z
      .object({
        type: z.string(),
        parameters: z.record(z.string(), z.unknown()),
      })
      .optional(),
    durationMs: z.number().int(),
  })
  .passthrough();

export const SimulationOutcomeSchema = z.enum([
  "would-execute",
  "would-escalate",
  "would-skip",
  "would-fail",
]);

export const SimulationResultSchema = z
  .object({
    agentId: z.string(),
    event: z.string(),
    outcome: SimulationOutcomeSchema,
    confidence: z.number().min(0).max(1),
    decisionTrace: z.array(DecisionStepSchema),
    actionsWouldTake: z.array(
      z.object({
        action: z.string(),
        parameters: z.record(z.string(), z.unknown()),
        confidence: z.number().min(0).max(1),
      })
    ),
    escalationWouldTrigger: z.boolean(),
    escalationReason: z.string().optional(),
    durationMs: z.number().int(),
  })
  .passthrough();

export const ExecutionStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "escalated",
]);

export const ExecutionSchema = z
  .object({
    id: z.string(),
    agentId: z.string(),
    triggerEvent: z.string(),
    triggerPayload: z.record(z.string(), z.unknown()),
    status: ExecutionStatusSchema,
    outcome: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    decisionTrace: z.array(DecisionStepSchema).optional(),
    actionsTaken: z.array(z.unknown()).optional(),
    escalationId: z.string().optional(),
    startedAt: timestampSchema,
    completedAt: timestampSchema.optional(),
    durationMs: z.number().int().optional(),
    error: z.string().optional(),
  })
  .passthrough();

export const EscalationSchema = z
  .object({
    id: z.string(),
    agentId: z.string(),
    executionId: z.string(),
    status: EscalationStatusSchema,
    urgency: UrgencySchema,
    situation: z.string(),
    recommendation: z.string(),
    evidence: z.record(z.string(), z.unknown()),
    alternatives: z.array(
      z.object({
        action: z.string(),
        tradeoff: z.string(),
      })
    ),
    availableActions: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
      })
    ),
    confidence: z.number().min(0).max(1),
    resolvedBy: z.string().optional(),
    resolution: z.record(z.string(), z.unknown()).optional(),
    expiresAt: timestampSchema.optional(),
    createdAt: timestampSchema,
    resolvedAt: timestampSchema.optional(),
  })
  .passthrough();

export const ExperimentDefinitionSchema = z
  .object({
    name: z.string(),
    variants: z
      .array(
        z.object({
          name: z.string(),
          weight: z.number().min(0).max(1),
          behaviorOverrides: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .min(2),
    metric: z.string(),
    metricDirection: z
      .enum(["higher-is-better", "lower-is-better"])
      .default("higher-is-better"),
    duration: z.string(),
    minSampleSize: z.number().int().positive().optional(),
  })
  .strict();

export const DeploymentSchema = z
  .object({
    id: z.string(),
    agentId: z.string(),
    version: z.number().int(),
    environment: z.string(),
    status: z.enum(["pending", "deploying", "active", "failed"]),
    simulationPassed: z.boolean().optional(),
    deployedAt: timestampSchema,
  })
  .passthrough();

// Resolve and escalate input schemas (validated before sending)
export const ResolveEscalationSchema = z
  .object({
    decision: z.string(),
    reasoning: z.string().optional(),
    learnFrom: z.boolean().default(true),
  })
  .strict();

export const EscalateOptionsSchema = z.object({
  reason: z.string(),
  urgency: UrgencySchema.default("medium"),
  recommendedAction: z.string().optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  alternatives: z
    .array(z.object({ action: z.string(), tradeoff: z.string() }))
    .optional(),
  availableActions: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
  deadline: z.string().optional(),
});

// Inferred types
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
export type Agent = z.infer<typeof AgentSchema>;
export type TriggerDefinition = z.infer<typeof TriggerDefinitionSchema>;
export type AgentScope = z.infer<typeof AgentScopeSchema>;
export type ConfidenceConfig = z.infer<typeof ConfidenceConfigSchema>;
export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;
export type DecisionStep = z.infer<typeof DecisionStepSchema>;
export type SimulationResult = z.infer<typeof SimulationResultSchema>;
export type Execution = z.infer<typeof ExecutionSchema>;
export type Escalation = z.infer<typeof EscalationSchema>;
export type ExperimentDefinition = z.infer<typeof ExperimentDefinitionSchema>;
export type Deployment = z.infer<typeof DeploymentSchema>;
export type EscalateOptions = z.input<typeof EscalateOptionsSchema>;

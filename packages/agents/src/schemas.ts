import { z } from "zod";
import { filterConditionsSchema } from "frontal/core";

/**
 * Zod schema for ISO datetime or Date objects, transformed to Date instances.
 */
export const timestampSchema = z
  .union([z.iso.datetime(), z.date()])
  .transform((value) => (value instanceof Date ? value : new Date(value)));

/**
 * Zod schema for retry configuration.
 */
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

/**
 * Schema for the lifecycle status of an agent.
 */
export const AgentStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "deprecated",
]);

/**
 * Schema for urgency levels used in escalations.
 */
export const UrgencySchema = z.enum(["critical", "high", "medium", "low"]);

/**
 * Schema for the status of an escalation.
 */
export const EscalationStatusSchema = z.enum([
  "pending",
  "resolved",
  "delegated",
  "overridden",
  "expired",
]);

/**
 * Schema for defining an agent trigger (event + optional filter + debounce).
 */
export const TriggerDefinitionSchema = z
  .object({
    event: z.string(),
    filter: filterConditionsSchema.optional(),
    debounce: z.string().optional(),
  })
  .strict();

/**
 * Schema for an agent's access scope (read/write/action permissions).
 */
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

/**
 * Schema for confidence threshold configuration (auto-execute, escalate, review).
 */
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

/**
 * Schema for agent memory configuration (type, TTL, token limits).
 */
export const MemoryConfigSchema = z
  .object({
    type: z.enum(["working", "persistent", "episodic"]).default("working"),
    ttl: z.string().optional(),
    maxTokens: z.number().int().positive().optional(),
  })
  .default({ type: "working" as const });

/**
 * Schema for rate limiting configuration.
 */
export const RateLimitConfigSchema = z.object({
  maxExecutionsPerMinute: z.number().int().positive().optional(),
  maxConcurrent: z.number().int().positive().optional(),
});

/**
 * Schema for defining a new agent (triggers, scope, confidence, memory, retry).
 */
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

/**
 * Schema for agent metrics summary (executions today, rates, averages).
 */
export const AgentMetricsSummarySchema = z
  .object({
    executionsToday: z.number().int(),
    escalationRate: z.number().min(0).max(1),
    avgExecutionMs: z.number().int(),
    successRate: z.number().min(0).max(1),
  })
  .loose();

/**
 * Schema for a full agent resource including runtime state and metrics.
 */
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
  .loose();

/**
 * Schema for a single decision step within an agent execution trace.
 */
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
  .loose();

/**
 * Schema for the possible outcomes of an agent simulation.
 */
export const SimulationOutcomeSchema = z.enum([
  "would-execute",
  "would-escalate",
  "would-skip",
  "would-fail",
]);

/**
 * Schema for the result of an agent simulation run.
 */
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
  .loose();

/**
 * Schema for execution status values.
 */
export const ExecutionStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "escalated",
]);

/**
 * Schema for an agent execution (run).
 */
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
  .loose();

/**
 * Schema for an escalation record.
 */
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
  .loose();

/**
 * Schema for A/B experiment definition (min 2 variants).
 */
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

/**
 * Schema for a deployment record.
 */
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
  .loose();

/**
 * Schema for resolving an escalation (decision + optional reasoning).
 */
export const ResolveEscalationSchema = z
  .object({
    decision: z.string(),
    reasoning: z.string().optional(),
    learnFrom: z.boolean().default(true),
  })
  .strict();

/**
 * Schema for options when escalating from an agent handler.
 */
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

/**
 * Summary metrics for an agent's recent performance.
 */
export interface AgentMetrics {
  executionsToday: number;
  escalationRate: number;
  avgExecutionMs: number;
  successRate: number;
}

/**
 * An A/B experiment with variants and results.
 */
export interface Experiment {
  id: string;
  name: string;
  status: string;
  variants: unknown[];
  metric: string;
  metricDirection: string;
  duration: string;
  minSampleSize?: number;
  winnerVariant?: string;
  promoteToProduction?: boolean;
}

/** Input type for agent definition (inferred from AgentDefinitionSchema). */
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
/** Full agent resource type. */
export type Agent = z.infer<typeof AgentSchema>;
/** Event trigger definition type. */
export type TriggerDefinition = z.infer<typeof TriggerDefinitionSchema>;
/** Agent scope configuration type. */
export type AgentScope = z.infer<typeof AgentScopeSchema>;
/** Confidence threshold configuration type. */
export type ConfidenceConfig = z.infer<typeof ConfidenceConfigSchema>;
/** Memory configuration type. */
export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;
/** Single decision step within an execution trace type. */
export type DecisionStep = z.infer<typeof DecisionStepSchema>;
/** Simulation result type. */
export type SimulationResult = z.infer<typeof SimulationResultSchema>;
/** Execution (run) type. */
export type Execution = z.infer<typeof ExecutionSchema>;
/** Escalation record type. */
export type Escalation = z.infer<typeof EscalationSchema>;
/** A/B experiment input type. */
export type ExperimentDefinition = z.infer<typeof ExperimentDefinitionSchema>;
/** Deployment record type. */
export type Deployment = z.infer<typeof DeploymentSchema>;
/** Raw input type for escalation options (before parsing). */
export type EscalateOptions = z.input<typeof EscalateOptionsSchema>;

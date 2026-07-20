import { timestampSchema } from "@frontal-labs/core";
import { z } from "zod";

/**
 * Cursor used for paginated list operations.
 */
export type Cursor = string;

/**
 * Schema for workflow lifecycle status.
 */
export const WorkflowStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
  "failed",
  "cancelled",
]);
/**
 * Schema for workflow execution status.
 */
export const ExecutionStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
/**
 * Schema for individual step execution status.
 */
export const StepStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);
/**
 * Schema for approval status.
 */
export const ApprovalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "expired",
]);
/**
 * Schema for workflow trigger types.
 */
export const TriggerTypeSchema = z.enum([
  "manual",
  "schedule",
  "event",
  "webhook",
]);
/**
 * Schema for workflow step types.
 */
export const StepTypeSchema = z.enum([
  "task",
  "approval",
  "condition",
  "parallel",
  "delay",
  "notification",
]);

/**
 * Schema for a manual workflow trigger.
 */
const ManualTriggerSchema = z.object({
  type: z.literal("manual"),
  config: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for a scheduled workflow trigger (cron).
 */
const ScheduleTriggerSchema = z.object({
  type: z.literal("schedule"),
  schedule: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for an event-based workflow trigger.
 */
const EventTriggerSchema = z.object({
  type: z.literal("event"),
  eventType: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for a webhook-based workflow trigger.
 */
const WebhookTriggerSchema = z.object({
  type: z.literal("webhook"),
  webhookUrl: z.url(),
  config: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Discriminated union schema for all workflow trigger types.
 */
export const WorkflowTriggerSchema = z.discriminatedUnion("type", [
  ManualTriggerSchema,
  ScheduleTriggerSchema,
  EventTriggerSchema,
  WebhookTriggerSchema,
]);

const baseStepFields = {
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  dependsOn: z.array(z.string()).optional(),
  timeout: z.string().optional(),
  retryPolicy: z
    .object({
      maxAttempts: z.number().int().positive().optional(),
      backoff: z.enum(["linear", "exponential"]).optional(),
    })
    .optional(),
};

const TaskStepSchema = z.object({
  ...baseStepFields,
  type: z.literal("task"),
  config: z.record(z.string(), z.unknown()),
});

const ApprovalStepSchema = z.object({
  ...baseStepFields,
  type: z.literal("approval"),
  config: z
    .object({
      approvers: z.array(z.string()),
    })
    .loose(),
});

const ConditionStepSchema = z.object({
  ...baseStepFields,
  type: z.literal("condition"),
  condition: z.string(),
});

const ParallelStepSchema = z.object({
  ...baseStepFields,
  type: z.literal("parallel"),
  config: z
    .object({
      steps: z.array(z.string()),
    })
    .loose(),
});

const DelayStepSchema = z.object({
  ...baseStepFields,
  type: z.literal("delay"),
  config: z
    .object({
      duration: z.string(),
    })
    .loose(),
});

const NotificationStepSchema = z.object({
  ...baseStepFields,
  type: z.literal("notification"),
  config: z
    .object({
      message: z.string(),
      channels: z.array(z.string()),
    })
    .loose(),
});

/**
 * Discriminated union schema for all workflow step types.
 */
export const WorkflowStepSchema = z.discriminatedUnion("type", [
  TaskStepSchema,
  ApprovalStepSchema,
  ConditionStepSchema,
  ParallelStepSchema,
  DelayStepSchema,
  NotificationStepSchema,
]);

/**
 * Schema for defining a new workflow (triggers, steps, variables, tags).
 */
export const WorkflowDefinitionSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    version: z.string().optional(),
    triggers: z.array(WorkflowTriggerSchema).min(1),
    steps: z.array(WorkflowStepSchema).min(1),
    variables: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string()).default([]),
  })
  .strict();

/**
 * Schema for a full workflow resource including runtime state.
 */
export const WorkflowSchema = WorkflowDefinitionSchema.extend({
  id: z.string(),
  status: WorkflowStatusSchema,
  version: z.number().int(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  lastExecution: z
    .object({
      id: z.string(),
      status: ExecutionStatusSchema,
      startedAt: timestampSchema,
      completedAt: timestampSchema.optional(),
      durationMs: z.number().int().optional(),
    })
    .optional(),
}).loose();

/**
 * Schema for a workflow execution with step-level details.
 */
export const WorkflowExecutionSchema = z
  .object({
    id: z.string(),
    workflowId: z.string(),
    workflowVersion: z.number().int(),
    status: ExecutionStatusSchema,
    input: z.record(z.string(), z.unknown()).optional(),
    output: z.record(z.string(), z.unknown()).optional(),
    variables: z.record(z.string(), z.unknown()).optional(),
    stepExecutions: z.array(
      z.object({
        stepId: z.string(),
        status: StepStatusSchema,
        input: z.record(z.string(), z.unknown()).optional(),
        output: z.record(z.string(), z.unknown()).optional(),
        startedAt: timestampSchema.optional(),
        completedAt: timestampSchema.optional(),
        durationMs: z.number().int().optional(),
        error: z.string().optional(),
        retryCount: z.number().int().default(0),
      })
    ),
    triggeredBy: z.string(),
    startedAt: timestampSchema,
    completedAt: timestampSchema.optional(),
    durationMs: z.number().int().optional(),
    error: z.string().optional(),
  })
  .loose();

/**
 * Schema for a workflow approval request.
 */
export const ApprovalSchema = z
  .object({
    id: z.string(),
    workflowId: z.string(),
    executionId: z.string(),
    stepId: z.string(),
    status: ApprovalStatusSchema,
    requestedBy: z.string(),
    requestedAt: timestampSchema,
    approvers: z.array(
      z.object({
        userId: z.string(),
        status: ApprovalStatusSchema,
        respondedAt: timestampSchema.optional(),
        comment: z.string().optional(),
      })
    ),
    requiredApprovals: z.number().int().positive(),
    expiresAt: timestampSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

/**
 * Schema for a workflow step definition (standalone).
 */
export const StepDefinitionSchema = z
  .object({
    id: z.string(),
    type: StepTypeSchema,
    name: z.string().optional(),
    description: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    timeout: z.string().optional(),
    retryPolicy: z
      .object({
        maxAttempts: z.number().int().positive().optional(),
        backoff: z.enum(["linear", "exponential"]).optional(),
      })
      .optional(),
  })
  .loose();

/**
 * Schema for a reusable workflow template.
 */
export const WorkflowTemplateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    definition: WorkflowDefinitionSchema,
    usage: z
      .object({
        count: z.number().int(),
        lastUsed: timestampSchema.optional(),
      })
      .optional(),
    tags: z.array(z.string()).default([]),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .loose();

/** Workflow lifecycle status type. */
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
/** Workflow execution status type. */
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;
/** Step execution status type. */
export type StepStatus = z.infer<typeof StepStatusSchema>;
/** Approval status type. */
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
/** Trigger type identifier. */
export type TriggerType = z.infer<typeof TriggerTypeSchema>;
/** Step type identifier. */
export type StepType = z.infer<typeof StepTypeSchema>;
/** Workflow trigger configuration type. */
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;
/** Workflow step configuration type. */
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
/** Workflow definition (input) type. */
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
/** Full workflow resource type. */
export type Workflow = z.infer<typeof WorkflowSchema>;
/** Workflow execution type. */
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;
/** Approval request type. */
export type Approval = z.infer<typeof ApprovalSchema>;
/** Standalone step definition type. */
export type StepDefinition = z.infer<typeof StepDefinitionSchema>;
/** Reusable workflow template type. */
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

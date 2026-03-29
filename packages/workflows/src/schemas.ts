import { z } from "zod";
import { timestampSchema, filterConditionsSchema } from "@frontal/core";

export const WorkflowStatusSchema = z.enum([
	"draft",
	"active",
	"paused",
	"completed",
	"failed",
	"cancelled",
]);
export const ExecutionStatusSchema = z.enum([
	"pending",
	"running",
	"completed",
	"failed",
	"cancelled",
]);
export const StepStatusSchema = z.enum([
	"pending",
	"running",
	"completed",
	"failed",
	"skipped",
]);
export const ApprovalStatusSchema = z.enum([
	"pending",
	"approved",
	"rejected",
	"expired",
]);
export const TriggerTypeSchema = z.enum([
	"manual",
	"schedule",
	"event",
	"webhook",
]);
export const StepTypeSchema = z.enum([
	"task",
	"approval",
	"condition",
	"parallel",
	"delay",
	"notification",
]);

export const WorkflowTriggerSchema = z
	.object({
		type: TriggerTypeSchema,
		config: z.record(z.string(), z.unknown()).optional(),
		schedule: z.string().optional(),
		eventType: z.string().optional(),
		webhookUrl: z.string().url().optional(),
	})
	.passthrough();

export const WorkflowStepSchema = z
	.object({
		id: z.string(),
		type: StepTypeSchema,
		name: z.string().optional(),
		description: z.string().optional(),
		config: z.record(z.string(), z.unknown()).optional(),
		dependsOn: z.array(z.string()).optional(),
		timeout: z.string().optional(),
		retryPolicy: z
			.object({
				maxAttempts: z.number().int().positive().optional(),
				backoff: z.enum(["linear", "exponential"]).optional(),
			})
			.optional(),
		condition: z.string().optional(),
	})
	.passthrough();

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
}).passthrough();

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
			}),
		),
		triggeredBy: z.string(),
		startedAt: timestampSchema,
		completedAt: timestampSchema.optional(),
		durationMs: z.number().int().optional(),
		error: z.string().optional(),
	})
	.passthrough();

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
			}),
		),
		requiredApprovals: z.number().int().positive(),
		expiresAt: timestampSchema.optional(),
		metadata: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough();

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
	.passthrough();

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
	.passthrough();

// Inferred types
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;
export type StepStatus = z.infer<typeof StepStatusSchema>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type TriggerType = z.infer<typeof TriggerTypeSchema>;
export type StepType = z.infer<typeof StepTypeSchema>;
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;
export type Approval = z.infer<typeof ApprovalSchema>;
export type StepDefinition = z.infer<typeof StepDefinitionSchema>;
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

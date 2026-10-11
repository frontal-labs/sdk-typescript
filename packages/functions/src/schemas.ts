import { z } from "zod";
import {
  type AiCapabilitySchema,
  type BlobCapabilitySchema,
  type CapabilityBudgetSchema,
  type CapabilityKindSchema,
  CapabilitySchema,
  type DataCapabilitySchema,
  type KvCapabilitySchema,
  type OntologyCapabilitySchema,
  type TelemetryCapabilitySchema,
} from "./capabilities";

/**
 * Zod schema for function runtime.
 */
export const FunctionRuntimeSchema = z.enum([
  "nodejs20",
  "nodejs22",
  "python311",
]);

/**
 * Function runtime.
 */
export type FunctionRuntime = z.input<typeof FunctionRuntimeSchema>;

/**
 * Zod schema for function status.
 */
export const FunctionStatusSchema = z.enum([
  "draft",
  "active",
  "deprecated",
  "failed",
]);

/**
 * Function status.
 */
export type FunctionStatus = z.input<typeof FunctionStatusSchema>;

/**
 * Zod schema for schema reference (inline or remote).
 */
export const SchemaRefSchema = z.object({
  /** Inline schema object */
  schema: z.record(z.string(), z.any()).optional(),
  /** Remote schema URI */
  schemaUri: z.string().url().optional(),
  /** Schema version */
  schemaVersion: z.string().optional(),
  /** Content hash for integrity verification */
  contentHash: z.string().optional(),
});

/**
 * Schema reference.
 */
export type SchemaRef = z.input<typeof SchemaRefSchema>;

/**
 * Zod schema for function resource.
 */
export const FunctionResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  runtime: FunctionRuntimeSchema,
  handler: z.string(),
  status: FunctionStatusSchema,
  version: z.number().int().positive(),
  latestVersion: z.number().int().positive().optional(),
  memory: z.number().int().positive().optional(), // in MB
  timeout: z.number().int().positive().optional(), // in seconds
  capabilities: z.array(CapabilitySchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Function resource.
 */
export type FunctionResource = z.infer<typeof FunctionResourceSchema>;

/**
 * Zod schema for function definition.
 */
export const FunctionDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  runtime: FunctionRuntimeSchema,
  handler: z.string(),
  inputSchema: SchemaRefSchema.optional(),
  outputSchema: SchemaRefSchema.optional(),
  envVars: z.record(z.string(), z.string()).optional(),
  secrets: z.array(z.string()).optional(), // secret names
  capabilities: z.array(CapabilitySchema).optional(),
  memory: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
});

/**
 * Function definition.
 */
export type FunctionDefinition = z.input<typeof FunctionDefinitionSchema>;

/**
 * Zod schema for function version.
 */
export const FunctionVersionSchema = z.object({
  version: z.number().int().positive(),
  handler: z.string(),
  createdAt: z.string().datetime(),
  publishedBy: z.string().optional(),
});

/**
 * Function version.
 */
export type FunctionVersion = z.infer<typeof FunctionVersionSchema>;

/**
 * Zod schema for function execution.
 */
export const FunctionExecutionSchema = z.object({
  id: z.string(),
  functionId: z.string(),
  version: z.number().int().positive(),
  status: FunctionStatusSchema,
  input: z.record(z.string(), z.any()).optional(),
  output: z.record(z.string(), z.any()).optional(),
  error: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  durationMs: z.number().int().nonnegative().optional(),
});

/**
 * Function execution.
 */
export type FunctionExecution = z.infer<typeof FunctionExecutionSchema>;

/**
 * Zod schema for function invocation input.
 */
export const FunctionInvocationInputSchema = z.object({
  functionId: z.string(),
  version: z.number().int().positive().optional(),
  input: z.record(z.string(), z.any()).optional(),
  idempotencyKey: z.string().optional(),
});

/**
 * Function invocation input.
 */
export type FunctionInvocationInput = z.input<
  typeof FunctionInvocationInputSchema
>;

/**
 * Zod schema for function invocation result.
 */
export const FunctionInvocationResultSchema = z.object({
  executionId: z.string(),
  result: z.record(z.string(), z.any()).optional(),
  error: z.string().optional(),
  status: FunctionStatusSchema.optional(),
});

/**
 * Function invocation result.
 */
export type FunctionInvocationResult = z.infer<
  typeof FunctionInvocationResultSchema
>;

/**
 * Zod schema for function list response.
 */
export const FunctionListResponseSchema = z.object({
  functions: z.array(FunctionResourceSchema),
  pagination: z.object({
    cursor: z.string().optional(),
    hasMore: z.boolean(),
  }),
});

/**
 * Function list response.
 */
export type FunctionListResponse = z.infer<typeof FunctionListResponseSchema>;

/**
 * Zod schema for function version list response.
 */
export const FunctionVersionListResponseSchema = z.object({
  versions: z.array(FunctionVersionSchema),
  pagination: z.object({
    cursor: z.string().optional(),
    hasMore: z.boolean(),
  }),
});

/**
 * Function version list response.
 */
export type FunctionVersionListResponse = z.infer<
  typeof FunctionVersionListResponseSchema
>;

/**
 * Zod schema for function execution list response.
 */
export const FunctionExecutionListResponseSchema = z.object({
  executions: z.array(FunctionExecutionSchema),
  pagination: z.object({
    cursor: z.string().optional(),
    hasMore: z.boolean(),
  }),
});

/**
 * Function execution list response.
 */
export type FunctionExecutionListResponse = z.infer<
  typeof FunctionExecutionListResponseSchema
>;

/**
 * Re-export capability types for convenience
 */
export type Capability = z.infer<typeof CapabilitySchema>;
export type CapabilityInput = z.input<typeof CapabilitySchema>;
export type CapabilityBudget = z.infer<typeof CapabilityBudgetSchema>;
export type CapabilityBudgetInput = z.input<typeof CapabilityBudgetSchema>;
export type CapabilityKind = z.infer<typeof CapabilityKindSchema>;
export type CapabilityKindInput = z.input<typeof CapabilityKindSchema>;
export type KvCapability = z.infer<typeof KvCapabilitySchema>;
export type KvCapabilityInput = z.input<typeof KvCapabilitySchema>;
export type BlobCapability = z.infer<typeof BlobCapabilitySchema>;
export type BlobCapabilityInput = z.input<typeof BlobCapabilitySchema>;
export type AiCapability = z.infer<typeof AiCapabilitySchema>;
export type AiCapabilityInput = z.input<typeof AiCapabilitySchema>;
export type TelemetryCapability = z.infer<typeof TelemetryCapabilitySchema>;
export type TelemetryCapabilityInput = z.input<
  typeof TelemetryCapabilitySchema
>;
export type OntologyCapability = z.infer<typeof OntologyCapabilitySchema>;
export type OntologyCapabilityInput = z.input<typeof OntologyCapabilitySchema>;
export type DataCapability = z.infer<typeof DataCapabilitySchema>;
export type DataCapabilityInput = z.input<typeof DataCapabilitySchema>;

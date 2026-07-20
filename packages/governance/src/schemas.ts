import { z } from "zod";

/** Zod schema for a permission definition. */
export const PermissionSchema = z
  .object({
    resource: z.string(),
    action: z.enum(["create", "read", "update", "delete", "admin"]),
    conditions: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/** Zod schema for a policy with rules. */
export const PolicySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    rules: z.array(
      z.object({
        id: z.string(),
        resource: z.string(),
        actions: z.array(z.string()),
        effect: z.enum(["allow", "deny"]),
        conditions: z.record(z.string(), z.unknown()).optional(),
      })
    ),
    enabled: z.boolean(),
    priority: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose();

/** Zod schema for a policy evaluation result. */
export const PolicyEvaluationResultSchema = z.object({
  policyId: z.string(),
  passed: z.boolean(),
  ruleResults: z.array(
    z.object({
      ruleId: z.string(),
      passed: z.boolean(),
      reason: z.string().optional(),
    })
  ),
});

/** Zod schema for an RBAC binding (user/role/resource). */
export const RbacBindingSchema = z
  .object({
    id: z.string(),
    userId: z.string().optional(),
    memberId: z.string().optional(),
    role: z.string(),
    resource: z.string(),
    createdAt: z.string(),
  })
  .loose();

/** Zod schema for validating governance client configuration. */
export const governanceConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

/** A permission definition. */
export type Permission = z.infer<typeof PermissionSchema>;
/** A policy with rules. */
export type Policy = z.infer<typeof PolicySchema>;
/** Result of evaluating a policy. */
export type PolicyEvaluationResult = z.infer<
  typeof PolicyEvaluationResultSchema
>;
/** An RBAC binding linking a user/role to a resource. */
export type RbacBinding = z.infer<typeof RbacBindingSchema>;
/** Validated governance client configuration. */
export type GovernanceConfig = z.input<typeof governanceConfigSchema>;

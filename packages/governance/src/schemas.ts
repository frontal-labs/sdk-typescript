import { z } from "zod";

/** Zod schema for a permission definition. */
export const PermissionSchema = z
  .object({
    resource: z.string(),
    action: z.enum(["create", "read", "update", "delete", "admin"]),
    conditions: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/** Zod schema for a policy rule. */
export const PolicyRuleSchema = z
  .object({
    id: z.string(),
    resource: z.string(),
    actions: z.array(z.string()),
    effect: z.enum(["allow", "deny"]),
    conditions: z.record(z.string(), z.unknown()).optional(),
    description: z.string().optional(),
  })
  .strict();

/** Zod schema for a policy with rules. */
export const PolicySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    rules: z.array(PolicyRuleSchema),
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
/** A policy rule effect ("allow" | "deny"). */
export type PolicyRuleEffect = "allow" | "deny";
/** Policy effect type. */
export type Effect = "allow" | "deny";

/**
 * Explicit matcher operators for policy conditions.
 *
 * A condition is a `Record<path, ConditionValue>`. When the value is a
 * {@link ConditionMatcher} the engine uses the named operator; a bare
 * primitive is shorthand (see {@link ConditionValue}).
 */
export type ConditionMatcher =
  | { readonly $eq: unknown }
  | { readonly $gt: number }
  | { readonly $gte: number }
  | { readonly $lt: number }
  | { readonly $lte: number }
  | { readonly $in: unknown[] }
  | { readonly $nin: unknown[] }
  | { readonly $contains: string }
  | { readonly $matches: string }
  | { readonly $exists: boolean };

/**
 * Condition value types for policy conditions.
 *
 * - A bare `string`/`number` means **equality** (`$eq`).
 * - A bare `true` means the path must be **truthy**.
 * - A bare `false` means the path must be **falsy**.
 * - A {@link ConditionMatcher} applies an explicit operator.
 */
export type ConditionValue = ConditionMatcher | string | number | boolean;
/** A policy rule. */
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;
/** Result of evaluating a policy. */
export type PolicyEvaluationResult = z.infer<
  typeof PolicyEvaluationResultSchema
>;

/**
 * Zod schema for PolicyDefinition (for validation).
 */
export const PolicyDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  rules: z.array(
    z.object({
      id: z.string().min(1),
      resource: z.string().min(1),
      actions: z.array(z.string()).min(1),
      effect: z.enum(["allow", "deny"]),
      conditions: z.record(z.string(), z.unknown()).optional(),
      description: z.string().optional(),
    })
  ),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
});

export type PolicyDefinitionInput = z.input<typeof PolicyDefinitionSchema>;
export type PolicyDefinitionOutput = z.output<typeof PolicyDefinitionSchema>;
/** An RBAC binding linking a user/role to a resource. */
export type RbacBinding = z.infer<typeof RbacBindingSchema>;
/** Validated governance client configuration. */
export type GovernanceConfig = z.input<typeof governanceConfigSchema>;

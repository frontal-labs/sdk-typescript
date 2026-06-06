import { z } from "zod";

export const PermissionSchema = z
  .object({
    resource: z.string(),
    action: z.enum(["create", "read", "update", "delete", "admin"]),
    conditions: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

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
  .passthrough();

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

export const RbacBindingSchema = z
  .object({
    id: z.string(),
    userId: z.string().optional(),
    memberId: z.string().optional(),
    role: z.string(),
    resource: z.string(),
    createdAt: z.string(),
  })
  .passthrough();

export const governanceConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type Permission = z.infer<typeof PermissionSchema>;
export type Policy = z.infer<typeof PolicySchema>;
export type PolicyEvaluationResult = z.infer<
  typeof PolicyEvaluationResultSchema
>;
export type RbacBinding = z.infer<typeof RbacBindingSchema>;
export type GovernanceConfig = z.input<typeof governanceConfigSchema>;

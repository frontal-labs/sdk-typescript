/**
 * Policy DSL - Type-safe policy authoring in TypeScript.
 *
 * Instead of writing Rego strings, you define policies as typed objects
 * that compile to Rego. Provides IDE support, refactoring safety, and
 * validation at compile time.
 */

import type { ConditionValue, Effect, Policy } from "./schemas";

// Export the internal types we reference
export type {
  ConditionMatcher,
  ConditionValue,
  Effect,
  PolicyRule,
  PolicyRuleEffect,
} from "./schemas";

/**
 * A single policy rule definition.
 */
export interface RuleDefinition {
  /** Unique rule identifier. */
  id: string;
  /** Resource this rule applies to (e.g., "function", "ontology", "ai"). */
  resource: string;
  /** Actions this rule governs (e.g., ["create", "read", "update"]). */
  actions: string[];
  /** Effect: allow or deny. */
  effect: Effect;
  /** Optional conditions that must match for rule to apply. */
  conditions?: Record<string, ConditionValue>;
  /** Human-readable description. */
  description?: string;
}

/**
 * Policy definition using the DSL.
 */
export interface PolicyDefinition {
  /** Unique policy identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Optional description. */
  description?: string;
  /** Rules in priority order (first match wins for deny). */
  rules: RuleDefinition[];
  /** Whether the policy is enabled. */
  enabled?: boolean;
  /** Priority for ordering (lower = higher priority). */
  priority?: number;
}

/**
 * Creates a policy from a type-safe definition.
 * Compiles to the internal Policy schema.
 */
export function definePolicy(def: PolicyDefinition): Policy {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    rules: def.rules.map((rule) => ({
      id: rule.id,
      resource: rule.resource,
      actions: rule.actions,
      effect: rule.effect,
      conditions: rule.conditions,
      description: rule.description,
    })),
    enabled: def.enabled ?? true,
    priority: def.priority ?? 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Convenience function for creating deny rules.
 */
export function denyRule(
  id: string,
  resource: string,
  actions: string | string[],
  conditions?: Record<string, ConditionValue>,
  description?: string
): RuleDefinition {
  return {
    id,
    resource,
    actions: Array.isArray(actions) ? actions : [actions],
    effect: "deny",
    conditions,
    description,
  };
}

/**
 * Convenience function for creating allow rules.
 */
export function allowRule(
  id: string,
  resource: string,
  actions: string | string[],
  conditions?: Record<string, ConditionValue>,
  description?: string
): RuleDefinition {
  return {
    id,
    resource,
    actions: Array.isArray(actions) ? actions : [actions],
    effect: "allow",
    conditions,
    description,
  };
}

/**
 * Common condition builders for type-safe conditions.
 *
 * Bare primitives are shorthand: `true` = truthy, `false` = falsy,
 * strings/numbers = equality. Builders that would be ambiguous as a bare
 * value (`gt`, `lt`, `in`, `contains`, `matches`, ...) emit an explicit
 * {@link ConditionMatcher} so the engine applies the right operator.
 */
export const conditions = {
  /** Matches when the value at `key` loosely equals `value`. */
  equals: (key: string, value: unknown): Record<string, ConditionValue> => ({
    [key]: value as ConditionValue,
  }),

  /** Matches when the value at `key` is truthy. */
  truthy: (key: string): Record<string, ConditionValue> => ({ [key]: true }),

  /** Matches when the value at `key` is falsy. */
  falsy: (key: string): Record<string, ConditionValue> => ({ [key]: false }),

  /** Matches when the value at `key` is greater than `value`. */
  gt: (key: string, value: number): Record<string, ConditionValue> => ({
    [key]: { $gt: value },
  }),

  /** Matches when the value at `key` is greater than or equal to `value`. */
  gte: (key: string, value: number): Record<string, ConditionValue> => ({
    [key]: { $gte: value },
  }),

  /** Matches when the value at `key` is less than `value`. */
  lt: (key: string, value: number): Record<string, ConditionValue> => ({
    [key]: { $lt: value },
  }),

  /** Matches when the value at `key` is less than or equal to `value`. */
  lte: (key: string, value: number): Record<string, ConditionValue> => ({
    [key]: { $lte: value },
  }),

  /** Matches when the value at `key` is one of `values`. */
  in: (key: string, values: unknown[]): Record<string, ConditionValue> => ({
    [key]: { $in: values },
  }),

  /** Matches when the value at `key` is not one of `values`. */
  nin: (key: string, values: unknown[]): Record<string, ConditionValue> => ({
    [key]: { $nin: values },
  }),

  /** Matches when the value at `key` is a string containing `substring`. */
  contains: (
    key: string,
    substring: string
  ): Record<string, ConditionValue> => ({
    [key]: { $contains: substring },
  }),

  /** Matches when the value at `key` is a string matching regex `pattern`. */
  matches: (key: string, pattern: string): Record<string, ConditionValue> => ({
    [key]: { $matches: pattern },
  }),

  /** Matches on presence (`present: true`, default) or absence of `key`. */
  exists: (key: string, present = true): Record<string, ConditionValue> => ({
    [key]: { $exists: present },
  }),
};

/**
 * Pre-built common policies.
 */
export const commonPolicies = {
  /**
   * Deny AI capabilities whose budget exceeds `maxCostUsd`.
   */
  aiBudgetLimit: (maxCostUsd: number) =>
    definePolicy({
      id: "ai-budget-limit",
      name: "AI Budget Limit",
      description: `Deny AI capabilities with maxCostUsd > ${maxCostUsd}`,
      rules: [
        denyRule(
          "ai-budget-exceeded",
          "ai",
          ["chat", "embeddings", "rerank"],
          {
            ...conditions.truthy("capabilities[_].kind.ai"),
            ...conditions.gt("capabilities[_].budget.maxCostUsd", maxCostUsd),
          },
          `AI capability budget exceeds $${maxCostUsd}`
        ),
      ],
    }),

  /**
   * Deny functions that declare a capability outside the allowed set.
   */
  denyDisallowedCapabilities: (...allowed: string[]) =>
    definePolicy({
      id: "deny-disallowed-capabilities",
      name: "Deny Disallowed Capabilities",
      description: `Only these capabilities are allowed: ${allowed.join(", ")}`,
      rules: [
        denyRule(
          "disallowed-capability",
          "function",
          ["create", "update"],
          conditions.nin("capabilities[_].name", allowed),
          `Capabilities must be one of: ${allowed.join(", ")}`
        ),
      ],
    }),

  /**
   * Deny functions whose declared memory exceeds `maxMB`.
   */
  memoryLimit: (maxMB: number) =>
    definePolicy({
      id: "memory-limit",
      name: "Memory Limit",
      description: `Functions cannot exceed ${maxMB}MB memory`,
      rules: [
        denyRule(
          "memory-exceeded",
          "function",
          ["create", "update"],
          conditions.gt("body.memory", maxMB),
          `Memory limit of ${maxMB}MB exceeded`
        ),
      ],
    }),

  /**
   * Deny functions whose declared timeout exceeds `maxSeconds`.
   */
  timeoutLimit: (maxSeconds: number) =>
    definePolicy({
      id: "timeout-limit",
      name: "Timeout Limit",
      description: `Functions cannot exceed ${maxSeconds}s timeout`,
      rules: [
        denyRule(
          "timeout-exceeded",
          "function",
          ["create", "update"],
          conditions.gt("body.timeout", maxSeconds),
          `Timeout limit of ${maxSeconds}s exceeded`
        ),
      ],
    }),

  /**
   * Deny production-prefixed secrets on functions not running in production.
   */
  productionSecretsInNonProd: (prefix = "PRODUCTION_") =>
    definePolicy({
      id: "production-secrets-scoping",
      name: "Production Secret Scoping",
      description: `Secrets prefixed "${prefix}" are only allowed in production`,
      rules: [
        denyRule(
          "prod-secret-in-nonprod",
          "function",
          ["create", "update"],
          {
            ...conditions.contains("body.secrets[_]", prefix),
            ...conditions.nin("body.environment", ["production", "prod"]),
          },
          `Secret "${prefix}" only allowed in production functions`
        ),
      ],
    }),

  /**
   * Deny payment-like functions that do not accept an idempotency key.
   */
  requireIdempotency: (namePattern: string) =>
    definePolicy({
      id: "require-idempotency",
      name: "Require Idempotency Key",
      description: `Functions matching ${namePattern} must accept idempotencyKey`,
      rules: [
        denyRule(
          "missing-idempotency",
          "function",
          ["create", "update"],
          {
            ...conditions.matches("body.name", namePattern),
            ...conditions.equals("body.handler", "payment"),
            ...conditions.exists("body.idempotencyKey", false),
          },
          "Payment function missing idempotencyKey parameter"
        ),
      ],
    }),
};

// ── Short DX aliases (canonical names above remain fully supported) ──

/** Short alias for {@link definePolicy}. */
export const policy = definePolicy;
/** Short alias for {@link denyRule}. */
export const deny = denyRule;
/** Short alias for {@link allowRule}. */
export const allow = allowRule;
/** Short alias for the {@link conditions} builders. */
export const where = conditions;

/**
 * Short-named pre-built policies. Spreads {@link commonPolicies} (so the
 * long names keep working) and adds concise aliases:
 * `budget`, `allowOnly`, `memory`, `timeout`, `prodSecrets`, `idempotency`.
 */
export const policies = {
  ...commonPolicies,
  budget: commonPolicies.aiBudgetLimit,
  allowOnly: commonPolicies.denyDisallowedCapabilities,
  memory: commonPolicies.memoryLimit,
  timeout: commonPolicies.timeoutLimit,
  prodSecrets: commonPolicies.productionSecretsInNonProd,
  idempotency: commonPolicies.requireIdempotency,
};

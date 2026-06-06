import type {
  EvaluationContext,
  Flag,
  FlagEvaluation,
  TargetingRule,
} from "./schemas";

function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

export function hashContext(key: string, context: EvaluationContext): number {
  const seed = `${key}:${context.userId ?? ""}:${context.organizationId ?? ""}`;
  return fnv1a(seed) % 100;
}

export function matchesRule(
  rule: TargetingRule,
  context: EvaluationContext
): boolean {
  const attrValue = context.attributes?.[rule.attribute];

  switch (rule.operator) {
    case "eq":
      return attrValue === rule.value;
    case "ne":
      return attrValue !== rule.value;
    case "in": {
      if (!Array.isArray(rule.value)) return false;
      return rule.value.includes(attrValue as string);
    }
    case "nin": {
      if (!Array.isArray(rule.value)) return true;
      return !rule.value.includes(attrValue as string);
    }
    case "contains":
      return typeof attrValue === "string" && typeof rule.value === "string"
        ? attrValue.includes(rule.value)
        : false;
    case "starts_with":
      return typeof attrValue === "string" && typeof rule.value === "string"
        ? attrValue.startsWith(rule.value)
        : false;
    case "ends_with":
      return typeof attrValue === "string" && typeof rule.value === "string"
        ? attrValue.endsWith(rule.value)
        : false;
    default:
      return false;
  }
}

export function evaluateFlag(
  flag: Flag,
  context: EvaluationContext,
  rules: TargetingRule[]
): FlagEvaluation {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    if (matchesRule(rule, context)) {
      return {
        flagKey: flag.key,
        value: rule.value as boolean | string | number,
        reason: `matched_rule:${rule.id}`,
        source: "targeting",
      };
    }
  }

  return {
    flagKey: flag.key,
    value: flag.defaultValue,
    reason: "default",
    source: "default",
  };
}

export function evaluateFlagWithRollout(
  flag: Flag,
  context: EvaluationContext,
  rules: TargetingRule[],
  rolloutPercent?: number,
  rolloutValue?: boolean | string | number
): FlagEvaluation {
  const bucket = hashContext(flag.key, context);

  if (rolloutPercent !== undefined && rolloutPercent > 0) {
    if (bucket < rolloutPercent) {
      return {
        flagKey: flag.key,
        value: rolloutValue ?? true,
        reason: `rollout:${rolloutPercent}%`,
        source: "rollout",
      };
    }
  }

  return evaluateFlag(flag, context, rules);
}

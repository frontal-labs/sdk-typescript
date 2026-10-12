/**
 * Local Policy Engine
 *
 * Evaluates {@link Policy} rules locally, in-process, with zero network
 * round-trips and no native toolchain. A policy is a list of rules; a rule
 * "fires" when all of its path conditions match the evaluation input.
 *
 * ## Decision model
 * - A **deny** rule that fires blocks the request.
 * - If the policy contains **allow** rules, the request must match at least
 *   one allow rule *and* no deny rule (default-deny / allow-list semantics).
 * - A policy with only deny rules is a guardrail: it allows everything except
 *   what its deny rules match.
 *
 * ## Path syntax
 * Condition keys are dot paths against the input, optionally prefixed with
 * `input.`. Array wildcards are written `key[_]` and match if *any* element of
 * `key` satisfies the remaining path, e.g. `capabilities[_].budget.maxCostUsd`.
 *
 * ## Condition values
 * Bare `true` = truthy, bare `false` = falsy, bare string/number = equality.
 * A {@link ConditionMatcher} (`{ $gt: n }`, `{ $in: [...] }`, ...) applies an
 * explicit operator.
 */

import type {
  ConditionMatcher,
  ConditionValue,
  Policy,
  PolicyEvaluationResult,
  PolicyRule,
} from "./schemas";

/** A single rule's contribution to a policy evaluation. */
type RuleResult = PolicyEvaluationResult["ruleResults"][number];

/** Keys of the supported {@link ConditionMatcher} operators. */
const MATCHER_KEYS = new Set([
  "$eq",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$in",
  "$nin",
  "$contains",
  "$matches",
  "$exists",
]);

/** Type guard for a {@link ConditionMatcher} object (`{ $op: value }`). */
function isMatcher(value: unknown): value is ConditionMatcher {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return keys.length === 1 && MATCHER_KEYS.has(keys[0] as string);
}

/** Coerce a value to a finite number, or `undefined` when not numeric. */
function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Result of resolving a path against the evaluation input. */
interface PathResolution {
  /** Whether at least one value was found at the path. */
  found: boolean;
  /** All values found (multiple when a `[_]` wildcard matches several elements). */
  values: unknown[];
}

/**
 * Resolves a dot-path against `input`, supporting `input.` prefixes and
 * `key[_]` array wildcards. Wildcards expand to every matching element so the
 * caller can test "any element satisfies" semantics.
 */
function resolvePath(input: unknown, rawPath: string): PathResolution {
  const path = rawPath.startsWith("input.")
    ? rawPath.slice("input.".length)
    : rawPath;
  const segments = path.split(".").filter((s) => s.length > 0);

  let current: unknown[] = [input];
  for (const segment of segments) {
    const wildcard = segment.endsWith("[_]");
    const key = wildcard ? segment.slice(0, -"[_]".length) : segment;
    const next: unknown[] = [];

    for (const value of current) {
      if (typeof value !== "object" || value === null) {
        continue;
      }
      const child = (value as Record<string, unknown>)[key];
      if (child === undefined) {
        continue;
      }
      if (wildcard) {
        if (Array.isArray(child)) {
          next.push(...child);
        } else {
          next.push(child);
        }
      } else {
        next.push(child);
      }
    }

    current = next;
    if (current.length === 0) {
      break;
    }
  }

  return { found: current.length > 0, values: current };
}

/** Applies an explicit operator matcher to a single value. */
function matchOperator(value: unknown, matcher: ConditionMatcher): boolean {
  if ("$eq" in matcher) {
    return value === matcher.$eq || String(value) === String(matcher.$eq);
  }
  if ("$gt" in matcher) {
    const n = toNumber(value);
    return n !== undefined && n > matcher.$gt;
  }
  if ("$gte" in matcher) {
    const n = toNumber(value);
    return n !== undefined && n >= matcher.$gte;
  }
  if ("$lt" in matcher) {
    const n = toNumber(value);
    return n !== undefined && n < matcher.$lt;
  }
  if ("$lte" in matcher) {
    const n = toNumber(value);
    return n !== undefined && n <= matcher.$lte;
  }
  if ("$in" in matcher) {
    return matcher.$in.some((candidate) => candidate === value);
  }
  if ("$nin" in matcher) {
    return !matcher.$nin.some((candidate) => candidate === value);
  }
  if ("$contains" in matcher) {
    return typeof value === "string" && value.includes(matcher.$contains);
  }
  if ("$matches" in matcher) {
    return (
      typeof value === "string" && new RegExp(matcher.$matches).test(value)
    );
  }
  if ("$exists" in matcher) {
    const defined = value !== undefined;
    return matcher.$exists ? defined : !defined;
  }
  return false;
}

/**
 * Determines whether a single condition holds given the values resolved at
 * its path. A condition matches when *any* resolved value satisfies it.
 */
function conditionMatches(
  resolution: PathResolution,
  condition: ConditionValue
): boolean {
  const { found, values } = resolution;

  if (isMatcher(condition)) {
    if ("$exists" in condition) {
      const anyDefined = values.some((v) => v !== undefined);
      return condition.$exists ? anyDefined : !anyDefined;
    }
    if (!found) {
      return false;
    }
    return values.some((value) => matchOperator(value, condition));
  }

  if (typeof condition === "boolean") {
    return condition ? values.some(Boolean) : !values.some(Boolean);
  }

  if (typeof condition === "number") {
    return values.some((value) => toNumber(value) === condition);
  }

  // Bare string (and any other value): equality.
  return values.some((value) => value === condition);
}

/**
 * Local policy evaluation engine.
 *
 * Stateless and synchronous at evaluation time. A {@link LocalPolicyEngine}
 * instance holds no per-request mutable state and is safe to reuse across
 * requests and service namespaces.
 */
export class LocalPolicyEngine {
  /**
   * Evaluates a single policy against the input and returns a
   * {@link PolicyEvaluationResult}.
   */
  evaluate(policy: Policy, input: unknown): PolicyEvaluationResult {
    const fired = new Map<PolicyRule, boolean>();
    for (const rule of policy.rules) {
      fired.set(rule, this.ruleFires(rule, input));
    }

    const denyRules = policy.rules.filter((r) => r.effect === "deny");
    const allowRules = policy.rules.filter((r) => r.effect === "allow");
    const hasAllowRules = allowRules.length > 0;

    const denied = denyRules.some((rule) => fired.get(rule));
    const anyAllowFired = allowRules.some((rule) => fired.get(rule));
    const passed = !denied && (hasAllowRules ? anyAllowFired : true);

    const ruleResults: RuleResult[] = policy.rules.map((rule) => {
      let rulePassed = true;
      let reason: string | undefined;

      if (rule.effect === "deny" && fired.get(rule)) {
        rulePassed = false;
        reason = ruleMessage(rule);
      } else if (hasAllowRules && rule.effect === "allow" && !anyAllowFired) {
        rulePassed = false;
        reason = `no matching allow rule for resource "${rule.resource}"`;
      }

      return { ruleId: rule.id, passed: rulePassed, reason };
    });

    return { policyId: policy.id, passed, ruleResults };
  }

  /**
   * Evaluates multiple policies against the same input. The combined request
   * passes only when *every* policy passes.
   */
  evaluateAll(policies: Policy[], input: unknown): PolicyEvaluationResult {
    const results = policies.map((policy) => this.evaluate(policy, input));
    return {
      policyId: policies.map((p) => p.id).join(","),
      passed: results.every((r) => r.passed),
      ruleResults: results.flatMap((r) => r.ruleResults),
    };
  }

  /**
   * Pre-validates a policy so malformed conditions surface early rather than
   * on first request. Currently recompiles any `$matches` regex patterns; the
   * stateless evaluator has nothing else to warm up. Resolves when done and
   * rejects with the underlying error for an invalid pattern.
   */
  async warmup(policy: Policy): Promise<void> {
    for (const rule of policy.rules) {
      for (const condition of Object.values(rule.conditions ?? {})) {
        if (isMatcher(condition) && "$matches" in condition) {
          // Throws SyntaxError on an invalid pattern to fail fast.
          new RegExp(condition.$matches);
        }
      }
    }
  }

  /**
   * A rule fires when it has no conditions, or when every condition matches
   * the input.
   */
  private ruleFires(rule: PolicyRule, input: unknown): boolean {
    const conditions = rule.conditions ?? {};
    const entries = Object.entries(conditions);
    if (entries.length === 0) {
      return true;
    }
    return entries.every(([path, condition]) =>
      conditionMatches(resolvePath(input, path), condition as ConditionValue)
    );
  }
}

/** Human-readable reason describing a rule (used in violation messages). */
function ruleMessage(rule: PolicyRule): string {
  if (rule.description) {
    return `${rule.id}: ${rule.description}`;
  }
  const actions = rule.actions.join(", ");
  return `${rule.id}: ${rule.effect} ${actions} on ${rule.resource}`;
}

/**
 * Policy violation error thrown by the governance interceptor when a request
 * is denied. Carries the offending policy id and per-rule results.
 */
export class PolicyViolationError extends Error {
  public readonly policyId: string;
  public readonly ruleResults: PolicyEvaluationResult["ruleResults"];

  constructor(
    policyId: string,
    ruleResults: PolicyEvaluationResult["ruleResults"]
  ) {
    const messages = ruleResults
      .filter((r) => !r.passed)
      .map((r) => r.reason)
      .join("; ");

    super(`Policy violation: ${messages}`);
    this.name = "PolicyViolationError";
    this.policyId = policyId;
    this.ruleResults = ruleResults;
  }
}

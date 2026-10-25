/**
 * Deterministic policy over decision results.
 *
 * A model's answer is an input to a decision, not the decision. Rules here are
 * plain functions of the answers, so the outcome is reproducible and explained
 * by the rule that fired. Use them to veto or route an action before it runs.
 */

import type { Answers, DecisionResult, Questions } from "./decisions";

/** What to do with an action. `allow` is the outcome when no rule fires. */
export type DecisionAction = "allow" | "review" | "reject";

/**
 * A rule for one question. `matches` receives that question's typed answer, so
 * a `noul` rule reads `.noul`, and a `choice` rule reads `.choice`, with no
 * casts. `reject` stops the action; `review` sends it to a person.
 */
export type DecisionRule<Q extends Questions> = {
  [K in keyof Q & string]: {
    /** Stable id, recorded with every verdict for the audit trail. */
    readonly id: string;
    readonly question: K;
    readonly action: Exclude<DecisionAction, "allow">;
    /** Human-readable reason, shown to the reviewer. */
    readonly reason: string;
    readonly matches: (answer: Answers<Q>[K]) => boolean;
  };
}[keyof Q & string];

/** An ordered set of rules over the questions `Q`. */
export type DecisionPolicy<Q extends Questions> = readonly DecisionRule<Q>[];

/** A rule that fired, with the action it requested. */
export interface DecisionRuleMatch {
  readonly id: string;
  readonly action: Exclude<DecisionAction, "allow">;
  readonly reason: string;
}

/** The outcome of evaluating a policy against one decision. */
export interface DecisionVerdict {
  /**
   * `reject` if any reject rule fired, else `review` if any review rule fired,
   * else `allow`.
   */
  readonly action: DecisionAction;
  /** Every rule that fired, in policy order. */
  readonly matched: readonly DecisionRuleMatch[];
}

/**
 * Evaluates `policy` against a decision. Every rule runs, so the verdict lists
 * all the reasons, not only the first.
 *
 * @throws {Error} A rule names a question the result does not contain. This
 *   only happens when a policy built for one question set is applied to another.
 */
export function evaluateDecision<Q extends Questions>(
  result: DecisionResult<Q>,
  policy: DecisionPolicy<Q>
): DecisionVerdict {
  const matched: DecisionRuleMatch[] = [];
  let action: DecisionAction = "allow";

  for (const rule of policy) {
    const answers: Readonly<Record<string, unknown>> = result.answers;
    if (!(rule.question in answers)) {
      throw new Error(
        `Policy rule "${rule.id}" reads question "${rule.question}", which the decision does not contain`
      );
    }
    // The rule's question key ties its matcher to that question's answer type.
    // The union of all rule types can't express that per call, so this is the
    // one cast, and it is sound because the key was checked just above.
    const answer = answers[rule.question] as Answers<Q>[typeof rule.question];
    if (!rule.matches(answer)) continue;

    matched.push({ id: rule.id, action: rule.action, reason: rule.reason });
    if (rule.action === "reject") action = "reject";
    else if (action !== "reject") action = "review";
  }

  return { action, matched };
}

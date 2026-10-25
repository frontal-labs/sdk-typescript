/**
 * Tests for the decision policy and the audit hook.
 */

import { createHash } from "node:crypto";
import { HttpClient } from "@frontal-labs/core";
import { describe, expect, it } from "vitest";
import {
  choice,
  type DecisionAuditRecord,
  type DecisionResult,
  DecisionsResource,
  noul,
  score,
} from "../src/decisions";
import { type DecisionPolicy, evaluateDecision } from "../src/policy";

const questions = {
  billing: noul("Is this about billing?"),
  topic: choice("Topic?", { refund: null, bug: null }),
  severity: score("How severe?", ["low", "high"]),
};

function result(
  overrides: Partial<{ billing: number; topic: string; level: string }> = {}
): DecisionResult<typeof questions> {
  return {
    model: "frontal-labs/decision-4B",
    requestId: "req_policy",
    usage: { inputTokens: 1, outputTokens: 1, cachedTokens: null },
    answers: {
      billing: { type: "noul", noul: overrides.billing ?? 0.1 },
      topic: {
        type: "choice",
        choice: (overrides.topic ?? "bug") as "refund" | "bug",
        probabilities: { refund: 0.5, bug: 0.5 },
        confidence: 0.5,
      },
      severity: {
        type: "score",
        score: 0,
        level: (overrides.level ?? "low") as "low" | "high",
        probabilities: [0.5, 0.5],
        confidence: 0.5,
      },
    },
  } as DecisionResult<typeof questions>;
}

const policy: DecisionPolicy<typeof questions> = [
  {
    id: "refund-needs-review",
    question: "topic",
    action: "review",
    reason: "Refunds are reviewed by a person",
    matches: (answer) => answer.choice === "refund",
  },
  {
    id: "high-billing-probability",
    question: "billing",
    action: "review",
    reason: "Billing probability above 0.8",
    matches: (answer) => answer.noul > 0.8,
  },
  {
    id: "high-severity-rejects-automation",
    question: "severity",
    action: "reject",
    reason: "High severity is never automated",
    matches: (answer) => answer.level === "high",
  },
];

describe("evaluateDecision", () => {
  it("allows when no rule fires", () => {
    const verdict = evaluateDecision(result(), policy);
    expect(verdict).toEqual({ action: "allow", matched: [] });
  });

  it("routes to review when a review rule fires", () => {
    const verdict = evaluateDecision(result({ topic: "refund" }), policy);
    expect(verdict.action).toBe("review");
    expect(verdict.matched.map((m) => m.id)).toEqual(["refund-needs-review"]);
  });

  it("rejects when a reject rule fires, even alongside a review rule", () => {
    const verdict = evaluateDecision(
      result({ topic: "refund", billing: 0.95, level: "high" }),
      policy
    );
    expect(verdict.action).toBe("reject");
  });

  it("reports every rule that fired, with its reason, in policy order", () => {
    const verdict = evaluateDecision(
      result({ topic: "refund", billing: 0.95 }),
      policy
    );
    expect(verdict.matched).toEqual([
      {
        id: "refund-needs-review",
        action: "review",
        reason: "Refunds are reviewed by a person",
      },
      {
        id: "high-billing-probability",
        action: "review",
        reason: "Billing probability above 0.8",
      },
    ]);
  });

  it("throws when a rule reads a question the decision does not contain", () => {
    const partial = {
      ...result(),
      answers: { billing: result().answers.billing },
    } as unknown as DecisionResult<typeof questions>;
    expect(() => evaluateDecision(partial, policy)).toThrow(
      /reads question "topic"/
    );
  });

  it("types each matcher from its own question's answer", () => {
    // A compile-time check: `answer.noul` exists only for the noul question.
    // The @ts-expect-error below fails the type-check if it stops being an error.
    const bad: DecisionPolicy<typeof questions> = [
      {
        id: "wrong",
        question: "billing",
        action: "review",
        reason: "x",
        // @ts-expect-error a noul answer has no `choice` property
        matches: (answer) => answer.choice === "refund",
      },
    ];
    expect(bad).toHaveLength(1);
  });
});

describe("onDecision audit hook", () => {
  const serializedState = JSON.stringify({ ticket: "charged twice" });

  function clientWith(respond: () => Response) {
    const http = new HttpClient({
      apiKey: "frt_test1234567890",
      baseUrl: "https://api.test/v1",
      timeout: 1000,
      maxRetries: 0,
      retryDelay: 0,
      headers: {},
      environment: "test",
      debug: false,
      fetch: async () => respond(),
    });
    return new DecisionsResource(http);
  }

  const envelope = {
    model: "frontal-labs/decision-4B",
    request_id: "req_audit",
    answers: [{ name: "billing", type: "noul", noul: 0.9 }],
  };

  it("passes a record with a digest of the state, not the state itself", async () => {
    const records: DecisionAuditRecord[] = [];
    const decisions = clientWith(() => Response.json(envelope));
    await decisions.decide(
      {
        model: "frontal-labs/decision-4B",
        state: { ticket: "charged twice" },
        questions: { billing: questions.billing },
      },
      { onDecision: (record) => void records.push(record) }
    );
    expect(records).toHaveLength(1);
    const [record] = records;
    expect(record?.requestId).toBe("req_audit");
    expect(record?.stateDigest).toBe(
      createHash("sha256").update(serializedState).digest("hex")
    );
    expect(JSON.stringify(record)).not.toContain("charged twice");
    expect(record?.questions).toEqual([{ name: "billing", type: "noul" }]);
    expect(record?.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("fails the call when the hook throws, so an unaudited decision is not returned", async () => {
    const decisions = clientWith(() => Response.json(envelope));
    await expect(
      decisions.decide(
        {
          model: "m",
          state: { ticket: "charged twice" },
          questions: { billing: questions.billing },
        },
        {
          onDecision: () => {
            throw new Error("audit store unavailable");
          },
        }
      )
    ).rejects.toThrow("audit store unavailable");
  });

  it("does not hash the state when no hook is registered", async () => {
    const decisions = clientWith(() => Response.json(envelope));
    const result = await decisions.decide({
      model: "m",
      state: { ticket: "charged twice" },
      questions: { billing: questions.billing },
    });
    expect(result.requestId).toBe("req_audit");
  });
});

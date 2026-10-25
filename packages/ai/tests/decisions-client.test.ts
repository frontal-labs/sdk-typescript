/**
 * Tests for DecisionsResource against a stubbed fetch that returns the
 * server's snake_case envelope, so the real key transform runs.
 */

import { HttpClient } from "@frontal-labs/core";
import { describe, expect, it } from "vitest";
import {
  choice,
  DecisionRequestError,
  DecisionResponseError,
  DecisionsResource,
  noul,
  score,
} from "../src/decisions";

const base = {
  apiKey: "frt_test1234567890",
  baseUrl: "https://api.test/v1",
  timeout: 1000,
  maxRetries: 0,
  retryDelay: 0,
  headers: {},
  environment: "test",
  debug: false,
};

interface Capture {
  bodies: unknown[];
  calls: number;
}

function setup(
  respond: (call: number) => Response,
  config: Partial<typeof base> = {}
) {
  const capture: Capture = { bodies: [], calls: 0 };
  const http = new HttpClient({
    ...base,
    ...config,
    fetch: async (_input, init) => {
      capture.calls++;
      if (typeof init?.body === "string") {
        capture.bodies.push(JSON.parse(init.body));
      }
      return respond(capture.calls);
    },
  });
  return { decisions: new DecisionsResource(http), capture };
}

const okEnvelope = {
  model: "frontal-labs/decision-4B",
  request_id: "req_1",
  usage: { input_tokens: 42, output_tokens: 3 },
  answers: [
    { name: "billing_issue", type: "noul", noul: 0.91 },
    {
      name: "topic",
      type: "choice",
      choice: "api_error",
      probabilities: [
        { label: "api_error", probability: 0.8 },
        { label: "billingIssue", probability: 0.2 },
      ],
      confidence: 0.8,
    },
    {
      name: "severity",
      type: "score",
      score: 2,
      level: "high",
      probabilities: [0.1, 0.2, 0.7],
      confidence: 0.7,
    },
  ],
};

const questions = {
  billing_issue: noul("Is this about billing?"),
  topic: choice("What is it about?", { api_error: null, billingIssue: null }),
  severity: score("How severe?", ["low", "medium", "high"]),
};

describe("decide: request", () => {
  it("sends names and labels as values, never as keys", async () => {
    const { decisions, capture } = setup(() => Response.json(okEnvelope));
    await decisions.decide({
      model: "frontal-labs/decision-4B",
      state: { order_id: 7, totalAmount: 12.5 },
      questions,
    });
    const body = capture.bodies[0] as Record<string, unknown>;
    expect(body.questions).toEqual([
      {
        name: "billing_issue",
        type: "noul",
        instructions: "Is this about billing?",
        criteria: undefined,
      },
      {
        name: "topic",
        type: "choice",
        instructions: "What is it about?",
        criteria: [
          { label: "api_error", description: null },
          { label: "billingIssue", description: null },
        ],
      },
      {
        name: "severity",
        type: "score",
        instructions: "How severe?",
        criteria: ["low", "medium", "high"],
      },
    ]);
  });

  it("serializes object state once and passes strings through", async () => {
    const oneAnswer = {
      ...okEnvelope,
      answers: [{ name: "ok", type: "noul", noul: 0.5 }],
    };
    const { decisions, capture } = setup(() => Response.json(oneAnswer));
    await decisions.decide({
      model: "m",
      state: { order_id: 7 },
      questions: { ok: noul("Is it?") },
    });
    await decisions.decide({
      model: "m",
      state: "plain text",
      questions: { ok: noul("Is it?") },
    });
    const [first, second] = capture.bodies as Record<string, unknown>[];
    expect(first?.state).toBe('{"order_id":7}');
    expect(second?.state).toBe("plain text");
  });

  it("sends nothing when the input is invalid", async () => {
    const { decisions, capture } = setup(() => Response.json(okEnvelope));
    await expect(
      decisions.decide({
        model: "m",
        state: { value: Number.NaN },
        questions: { ok: noul("Is it?") },
      })
    ).rejects.toBeInstanceOf(DecisionRequestError);
    expect(capture.calls).toBe(0);
  });
});

describe("decide: response", () => {
  it("indexes answers by question name and maps choice probabilities", async () => {
    const { decisions } = setup(() => Response.json(okEnvelope));
    const result = await decisions.decide({
      model: "frontal-labs/decision-4B",
      state: "x",
      questions,
    });
    expect(result.answers.billing_issue.noul).toBe(0.91);
    expect(result.answers.topic.choice).toBe("api_error");
    expect(result.answers.topic.probabilities).toEqual({
      api_error: 0.8,
      billingIssue: 0.2,
    });
    expect(result.answers.severity.level).toBe("high");
    expect(result.requestId).toBe("req_1");
    expect(result.usage).toEqual({
      inputTokens: 42,
      outputTokens: 3,
      cachedTokens: null,
    });
  });

  it("reports missing, duplicate, extra and mistyped answers", async () => {
    const q = { ok: noul("Is it?") };
    const cases: [string, unknown[], RegExp][] = [
      ["missing", [], /Missing answer for question "ok"/],
      [
        "duplicate",
        [
          { name: "ok", type: "noul", noul: 0.5 },
          { name: "ok", type: "noul", noul: 0.5 },
        ],
        /Duplicate answer/,
      ],
      [
        "extra",
        [
          { name: "ok", type: "noul", noul: 0.5 },
          { name: "other", type: "noul", noul: 0.5 },
        ],
        /Unexpected answer for question "other"/,
      ],
      [
        "mistyped",
        [
          {
            name: "ok",
            type: "score",
            score: 0,
            level: "a",
            probabilities: [1, 0],
            confidence: 1,
          },
        ],
        /has type "score", expected "noul"/,
      ],
    ];
    for (const [, answers, pattern] of cases) {
      const { decisions } = setup(() =>
        Response.json({ ...okEnvelope, answers })
      );
      await expect(
        decisions.decide({ model: "m", state: "x", questions: q })
      ).rejects.toThrow(DecisionResponseError);
      await expect(
        decisions.decide({ model: "m", state: "x", questions: q })
      ).rejects.toThrow(pattern);
    }
  });

  it("retries a transient failure because decisions are idempotent", async () => {
    const oneAnswer = {
      ...okEnvelope,
      answers: [okEnvelope.answers[0]],
    };
    const { decisions, capture } = setup(
      (call) =>
        call === 1
          ? new Response("{}", { status: 503 })
          : Response.json(oneAnswer),
      { maxRetries: 2 }
    );
    const result = await decisions.decide({
      model: "m",
      state: "x",
      questions: { billing_issue: questions.billing_issue },
    });
    expect(result.requestId).toBe("req_1");
    expect(capture.calls).toBe(2);
  });
});

describe("models", () => {
  it("maps the model list to camelCase fields", async () => {
    const { decisions } = setup(() =>
      Response.json({
        models: [
          {
            name: "frontal-labs/decision-4B",
            description: "Structured decisions",
            release_date: "2026-10-01",
          },
        ],
      })
    );
    expect(await decisions.models()).toEqual([
      {
        name: "frontal-labs/decision-4B",
        description: "Structured decisions",
        releaseDate: "2026-10-01",
      },
    ]);
  });
});

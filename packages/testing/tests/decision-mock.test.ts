/**
 * Tests for mockDecisionModel: the real AI client talks to the scripted model.
 */

import { AISdk, choice, noul, score } from "@frontal-labs/ai";
import { describe, expect, it } from "vitest";
import { createTestHttpClient, mockDecisionModel } from "../src/index";

function clientFor(model: ReturnType<typeof mockDecisionModel>) {
  const { http } = createTestHttpClient(model.routes);
  return new AISdk(http);
}

describe("mockDecisionModel", () => {
  it("answers a decision through the real client and parsing", async () => {
    const model = mockDecisionModel({
      answer: (q) =>
        q.name === "billing"
          ? { type: "noul", noul: 0.9 }
          : q.type === "choice"
            ? { type: "choice", choice: "api_error" }
            : { type: "score", score: 2 },
    });
    const ai = clientFor(model);

    const result = await ai.decisions.decide({
      model: "frontal-labs/decision-4B",
      state: { ticket: "I was charged twice" },
      questions: {
        billing: noul("Is this about billing?"),
        topic: choice("What is it?", { api_error: null, billing: null }),
        severity: score("How severe?", ["low", "medium", "high"]),
      },
    });

    expect(result.answers.billing.noul).toBe(0.9);
    expect(result.answers.topic.choice).toBe("api_error");
    expect(result.answers.severity.level).toBe("high");
    expect(result.requestId).toBe("req_mock_1");
  });

  it("uses neutral defaults when no answer function is given", async () => {
    const model = mockDecisionModel();
    const result = await clientFor(model).decisions.decide({
      model: "frontal-labs/decision-4B",
      state: "text",
      questions: {
        yes: noul("Is it?"),
        topic: choice("Topic?", { first: null, second: null }),
        severity: score("Severity?", ["low", "high"]),
      },
    });
    expect(result.answers.yes.noul).toBe(0.5);
    expect(result.answers.topic.choice).toBe("first");
    expect(result.answers.severity.level).toBe("low");
  });

  it("records each request as the SDK sent it", async () => {
    const model = mockDecisionModel();
    await clientFor(model).decisions.decide({
      model: "frontal-labs/decision-4B",
      state: { order_id: 7 },
      questions: { yes: noul("Is it?") },
    });
    expect(model.calls).toHaveLength(1);
    expect(model.calls[0]).toEqual({
      model: "frontal-labs/decision-4B",
      state: '{"order_id":7}',
      questions: [
        {
          name: "yes",
          type: "noul",
          instructions: "Is it?",
          criteria: undefined,
        },
      ],
    });
  });

  it("lists the configured models", async () => {
    const model = mockDecisionModel({
      models: [
        {
          name: "frontal-labs/decision-4B",
          description: "d",
          releaseDate: "2026-10-01",
        },
      ],
    });
    const models = await clientFor(model).decisions.models();
    expect(models.map((m) => m.name)).toEqual(["frontal-labs/decision-4B"]);
  });

  it("fails the client's own validation when the scripted answer is malformed", async () => {
    const model = mockDecisionModel({
      answer: () => ({ type: "noul", noul: 2 }),
    });
    await expect(
      clientFor(model).decisions.decide({
        model: "m",
        state: "x",
        questions: { yes: noul("Is it?") },
      })
    ).rejects.toThrow();
  });
});

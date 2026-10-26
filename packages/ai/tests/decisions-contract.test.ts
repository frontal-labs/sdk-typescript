/**
 * Keeps the decisions contract honest:
 * - the decisions sections of the committed `ai.openapi.json` match the Zod
 *   wire schemas they are generated from, so the spec cannot drift;
 * - the server's snake_case shapes and the SDK's camelCase shapes agree, so a
 *   response the spec allows is one the client accepts.
 */

import { readFileSync } from "node:fs";
import { deepSnakeToCamel } from "@frontal-labs/core";
import { describe, expect, it } from "vitest";
import {
  AI_OPENAPI_PATH,
  applyDecisions,
  DECISION_PATHS,
  DECISION_SCHEMAS,
  EXTRACTION_PATHS,
  EXTRACTION_SCHEMAS,
  type OpenApiDocument,
} from "../../../scripts/generate-decisions-openapi";
import {
  decisionModelsSpecSchema,
  decisionModelsWireSchema,
  decisionResponseSpecSchema,
  decisionResponseWireSchema,
} from "../src/schemas";

const committed = JSON.parse(
  readFileSync(AI_OPENAPI_PATH, "utf8")
) as OpenApiDocument;

const sampleResponse = {
  model: "frontal-labs/decision-4B",
  request_id: "req_contract",
  usage: { input_tokens: 10, output_tokens: 2, cached_tokens: 4 },
  answers: [
    { name: "billing_issue", type: "noul", noul: 0.9 },
    {
      name: "topic",
      type: "choice",
      choice: "api_error",
      probabilities: [{ label: "api_error", probability: 0.8 }],
      confidence: 0.8,
    },
    {
      name: "severity",
      type: "score",
      score: 1,
      level: "medium",
      probabilities: [0.2, 0.7, 0.1],
      confidence: 0.7,
    },
  ],
};

describe("decisions sections of ai.openapi.json", () => {
  it("match the schemas they are generated from (run `bun run contract:decisions` to fix)", () => {
    expect(applyDecisions(structuredClone(committed))).toEqual(committed);
  });

  it("declare both decisions routes and their schemas", () => {
    expect(Object.keys(committed.paths)).toEqual(
      expect.arrayContaining([...DECISION_PATHS])
    );
    expect(Object.keys(committed.components?.schemas ?? {})).toEqual(
      expect.arrayContaining([...DECISION_SCHEMAS])
    );
  });

  it("declare the extraction routes and their schemas", () => {
    expect(Object.keys(committed.paths)).toEqual(
      expect.arrayContaining([...EXTRACTION_PATHS])
    );
    expect(Object.keys(committed.components?.schemas ?? {})).toEqual(
      expect.arrayContaining([...EXTRACTION_SCHEMAS])
    );
  });

  it("keep the gateway routes alongside the decisions routes", () => {
    expect(Object.keys(committed.paths)).toEqual(
      expect.arrayContaining(["/ai/chat/completions", "/health"])
    );
  });

  it("describe the decision response in the server's snake_case", () => {
    expect(
      JSON.stringify(committed.components?.schemas?.DecisionResponse)
    ).toContain("request_id");
  });
});

describe("server and SDK shapes agree", () => {
  it("accepts a server response that the SDK then validates after transform", () => {
    expect(decisionResponseSpecSchema.safeParse(sampleResponse).success).toBe(
      true
    );
    expect(
      decisionResponseWireSchema.safeParse(deepSnakeToCamel(sampleResponse))
        .success
    ).toBe(true);
  });

  it("accepts a server model list that the SDK then validates after transform", () => {
    const models = {
      models: [
        {
          name: "frontal-labs/decision-4B",
          description: "Structured decisions",
          release_date: "2026-10-01",
        },
      ],
    };
    expect(decisionModelsSpecSchema.safeParse(models).success).toBe(true);
    expect(
      decisionModelsWireSchema.safeParse(deepSnakeToCamel(models)).success
    ).toBe(true);
  });

  it("rejects a response that drops a required answer field", () => {
    const broken = structuredClone(sampleResponse);
    (broken.answers[0] as Record<string, unknown>).noul = undefined;
    expect(decisionResponseSpecSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a probability outside [0, 1]", () => {
    const broken = structuredClone(sampleResponse);
    (broken.answers[0] as Record<string, unknown>).noul = 1.5;
    expect(decisionResponseSpecSchema.safeParse(broken).success).toBe(false);
  });
});

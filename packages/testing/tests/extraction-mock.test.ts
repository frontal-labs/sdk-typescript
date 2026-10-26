/**
 * `mockExtractionModel`: the real `AISdk` talks to the scripted model, so the
 * SDK's request shape, span conversion and response checks all run.
 */

import { AISdk } from "@frontal-labs/ai";
import { describe, expect, it } from "vitest";
import { createTestHttpClient, mockExtractionModel } from "../src/index";

function clientFor(model: ReturnType<typeof mockExtractionModel>) {
  const { http } = createTestHttpClient(model.routes);
  return new AISdk(http);
}

describe("mockExtractionModel", () => {
  it("answers an extraction and reports entity spans the SDK can slice", async () => {
    const model = mockExtractionModel({
      intent: "billing.refund_request",
      entities: () => [{ type: "invoice_id", value: "INV-2024-0042" }],
    });
    const input = "😀 refund INV-2024-0042";
    const result = await clientFor(model).extractions.create({
      vocabulary: "support-tasks@1.1.0",
      input,
    });

    expect(result.intent).toBe("billing.refund_request");
    expect(result.model).toBe("frontal-labs/extract-4B");
    const [entity] = result.entities;
    expect(entity?.codePointSpan).toEqual({ start: 9, end: 22 });
    expect(input.slice(entity?.span.start, entity?.span.end)).toBe(
      "INV-2024-0042"
    );
  });

  it("records each request as the SDK sent it", async () => {
    const model = mockExtractionModel();
    await clientFor(model).extractions.create({
      vocabulary: "support-tasks@1.1.0",
      vocabularyChecksum: "a".repeat(64),
      input: "hello",
    });
    expect(model.calls).toEqual([
      {
        model: "frontal-labs/extract-4B",
        vocabulary: "support-tasks@1.1.0",
        vocabularyChecksum: "a".repeat(64),
        input: "hello",
      },
    ]);
  });

  it("serves the vocabulary list and detail, including entity types", async () => {
    const model = mockExtractionModel({
      entities: () => [],
      vocabulary: {
        entityTypes: [{ entity_type_id: "invoice_id" }],
        schema: { type: "object" },
      },
    });
    const client = clientFor(model);
    const list = await client.extractions.vocabularies.list();
    expect(list[0]?.version).toBe("1.1.0");
    const detail = await client.extractions.vocabularies.get(
      "support-tasks@1.1.0"
    );
    expect(detail.entityTypes).toEqual([{ entity_type_id: "invoice_id" }]);
  });

  it("reports a clarification when asked to, mapped to camelCase", async () => {
    const model = mockExtractionModel({
      status: "needs_clarification",
      clarification: {
        ambiguousSlot: "intent",
        candidates: ["billing.refund_request", "billing.invoice_copy"],
        question: "Refund or copy?",
      },
    });
    const result = await clientFor(model).extractions.create({
      vocabulary: "support-tasks@1.1.0",
      input: "invoice 42",
    });
    expect(result.status).toBe("needs_clarification");
    expect(result.clarification?.ambiguousSlot).toBe("intent");
    expect(result.clarification?.question).toBe("Refund or copy?");
  });
});

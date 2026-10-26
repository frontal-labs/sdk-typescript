/**
 * `ai.extractions`: request shape, idempotency, span conversion, preserved
 * keys, local validation, and the vocabulary reads.
 */

import { HttpClient } from "@frontal-labs/core";
import { describe, expect, it } from "vitest";
import {
  ExtractionRequestError,
  ExtractionResponseError,
  ExtractionsResource,
  MAX_EXTRACTION_INPUT,
} from "../src/extractions";

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

interface Seen {
  calls: number;
  bodies: unknown[];
  keys: (string | null)[];
}

function resource(
  respond: (call: number) => Response,
  config: Partial<typeof base> = {}
) {
  const seen: Seen = { calls: 0, bodies: [], keys: [] };
  const http = new HttpClient({
    ...base,
    ...config,
    fetch: async (_input, init) => {
      seen.calls += 1;
      seen.keys.push(new Headers(init?.headers).get("Idempotency-Key"));
      if (typeof init?.body === "string")
        seen.bodies.push(JSON.parse(init.body));
      return respond(seen.calls);
    },
  });
  return { extractions: new ExtractionsResource(http), seen };
}

/** A server envelope for `input`, with one entity labelled by `value`. */
function envelope(
  overrides: Record<string, unknown> = {},
  entity?: Record<string, unknown>
) {
  return {
    id: "extr_abc",
    model: "frontal-labs/extract-4B",
    model_version: "extract-4B",
    vocabulary: {
      id: "support-tasks",
      version: "1.1.0",
      checksum: "c".repeat(64),
    },
    status: "ok",
    intent: "billing.refund_request",
    confidence: 0.93,
    entities: entity ? [entity] : [],
    parameters: { invoice_id: "INV-2024-0042", order_total: 49 },
    usage: { input_tokens: 40, output_tokens: 12 },
    ...overrides,
  };
}

describe("extractions.create: request", () => {
  it("sends the body in the gateway's snake_case contract", async () => {
    const { extractions, seen } = resource(() => Response.json(envelope()));
    await extractions.create({
      vocabulary: "support-tasks@1.1.0",
      vocabularyChecksum: "c".repeat(64),
      input: "refund invoice INV-2024-0042",
    });
    expect(seen.bodies[0]).toEqual({
      model: "frontal-labs/extract-4B",
      vocabulary: "support-tasks@1.1.0",
      vocabulary_checksum: "c".repeat(64),
      input: "refund invoice INV-2024-0042",
    });
  });

  it("sends one idempotency key, reused on a retry of the same call", async () => {
    const { extractions, seen } = resource(
      (call) =>
        call === 1
          ? new Response("{}", { status: 503 })
          : Response.json(envelope()),
      { maxRetries: 2 }
    );
    await extractions.create({
      vocabulary: "support-tasks@1.1.0",
      input: "hello",
    });
    expect(seen.calls).toBe(2);
    expect(seen.keys[0]).toBeTruthy();
    expect(seen.keys[1]).toBe(seen.keys[0]);
  });

  it("honours a caller-supplied idempotency key", async () => {
    const { extractions, seen } = resource(() => Response.json(envelope()));
    await extractions.create(
      { vocabulary: "support-tasks@1.1.0", input: "hello" },
      { idempotencyKey: "caller-key-1" }
    );
    expect(seen.keys[0]).toBe("caller-key-1");
  });
});

describe("extractions.create: local validation sends nothing", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["latest", { vocabulary: "support-tasks@latest", input: "x" }],
    ["unversioned", { vocabulary: "support-tasks", input: "x" }],
    ["empty", { vocabulary: "support-tasks@1.1.0", input: "   " }],
    ["NUL", { vocabulary: "support-tasks@1.1.0", input: "a\0b" }],
  ];
  for (const [name, request] of cases) {
    it(`refuses ${name} input before the network`, async () => {
      const { extractions, seen } = resource(() => Response.json(envelope()));
      await expect(
        extractions.create(
          request as unknown as Parameters<ExtractionsResource["create"]>[0]
        )
      ).rejects.toBeInstanceOf(ExtractionRequestError);
      expect(seen.calls).toBe(0);
    });
  }

  it("counts the input limit in code points, not UTF-16 units", async () => {
    const { extractions, seen } = resource(() =>
      Response.json(envelope({ entities: [] }))
    );
    // 8000 emoji: 16000 UTF-16 units, but exactly at the limit in code points.
    await expect(
      extractions.create({
        vocabulary: "support-tasks@1.1.0",
        input: "😀".repeat(MAX_EXTRACTION_INPUT),
      })
    ).resolves.toBeDefined();
    await expect(
      extractions.create({
        vocabulary: "support-tasks@1.1.0",
        input: "😀".repeat(MAX_EXTRACTION_INPUT + 1),
      })
    ).rejects.toBeInstanceOf(ExtractionRequestError);
    expect(seen.calls).toBe(1);
  });
});

describe("extractions.create: spans", () => {
  it("converts code-point spans to string offsets that slice to the value", async () => {
    const input = "😀 refund INV-2024-0042";
    // Code points: 😀=0, space=1, "refund"=2..7, space=8, the id starts at 9.
    const entity = {
      type: "invoice_id",
      value: "INV-2024-0042",
      span: { start: 9, end: 22 },
      confidence: 0.99,
    };
    const { extractions } = resource(() => Response.json(envelope({}, entity)));
    const result = await extractions.create({
      vocabulary: "support-tasks@1.1.0",
      input,
    });
    const [found] = result.entities;
    expect(found?.codePointSpan).toEqual({ start: 9, end: 22 });
    // The emoji is two UTF-16 units, so the string offset is one more.
    expect(found?.span).toEqual({ start: 10, end: 23 });
    expect(input.slice(found?.span.start, found?.span.end)).toBe(
      "INV-2024-0042"
    );
  });

  it("refuses a span that does not label its value rather than return wrong offsets", async () => {
    const entity = {
      type: "invoice_id",
      value: "INV-2024-0042",
      span: { start: 0, end: 5 },
      confidence: 0.99,
    };
    const { extractions } = resource(() => Response.json(envelope({}, entity)));
    await expect(
      extractions.create({
        vocabulary: "support-tasks@1.1.0",
        input: "refund INV-2024-0042",
      })
    ).rejects.toBeInstanceOf(ExtractionResponseError);
  });
});

describe("extractions.create: response", () => {
  it("keeps parameter keys exactly as the service sent them", async () => {
    const { extractions } = resource(() => Response.json(envelope()));
    const result = await extractions.create({
      vocabulary: "support-tasks@1.1.0",
      input: "x",
    });
    expect(result.parameters).toEqual({
      invoice_id: "INV-2024-0042",
      order_total: 49,
    });
    expect(result.modelVersion).toBe("extract-4B");
    expect(result.usage).toEqual({ inputTokens: 40, outputTokens: 12 });
  });

  it("maps a clarification to camelCase only when the status asks for one", async () => {
    const asking = envelope({
      status: "needs_clarification",
      clarification: {
        ambiguous_slot: "intent",
        candidates: ["a", "b"],
        question: "Which?",
      },
    });
    const { extractions } = resource(() => Response.json(asking));
    const result = await extractions.create({
      vocabulary: "support-tasks@1.1.0",
      input: "x",
    });
    expect(result.clarification).toEqual({
      ambiguousSlot: "intent",
      candidates: ["a", "b"],
      question: "Which?",
    });
  });

  it("refuses needs_clarification with no clarification", async () => {
    const { extractions } = resource(() =>
      Response.json(envelope({ status: "needs_clarification" }))
    );
    await expect(
      extractions.create({ vocabulary: "support-tasks@1.1.0", input: "x" })
    ).rejects.toBeInstanceOf(ExtractionResponseError);
  });
});

describe("extractions.vocabularies", () => {
  it("lists the served vocabulary", async () => {
    const { extractions } = resource(() =>
      Response.json({
        data: [
          { id: "support-tasks", version: "1.1.0", checksum: "c".repeat(64) },
        ],
      })
    );
    const list = await extractions.vocabularies.list();
    expect(list).toEqual([
      { id: "support-tasks", version: "1.1.0", checksum: "c".repeat(64) },
    ]);
  });

  it("gets one vocabulary with its schema, and maps entity types", async () => {
    const { extractions, seen } = resource(() =>
      Response.json({
        id: "support-tasks",
        version: "1.1.0",
        checksum: "c".repeat(64),
        intents: [{ intent_id: "billing.refund_request" }],
        entity_types: [{ entity_type_id: "invoice_id" }],
        schema: { type: "object", min_items: 1 },
      })
    );
    const detail = await extractions.vocabularies.get("support-tasks@1.1.0");
    expect(detail.entityTypes).toEqual([{ entity_type_id: "invoice_id" }]);
    expect(detail.schema).toEqual({ type: "object", min_items: 1 });
    expect(detail.intents).toEqual([{ intent_id: "billing.refund_request" }]);
    expect(seen.calls).toBe(1);
  });

  it("refuses an unpinned or latest pin before the network", async () => {
    const { extractions, seen } = resource(() => Response.json({}));
    await expect(
      extractions.vocabularies.get("support-tasks@latest" as never)
    ).rejects.toBeInstanceOf(ExtractionRequestError);
    expect(seen.calls).toBe(0);
  });
});

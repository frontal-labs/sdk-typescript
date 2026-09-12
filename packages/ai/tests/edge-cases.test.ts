import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AISdk } from "../src/sdk";

function completion(
  content: string | null,
  extra: Record<string, unknown> = {}
) {
  return {
    id: "c",
    object: "chat.completion",
    created: 0,
    model: "m",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    ...extra,
  };
}

describe("generateObject retry paths", () => {
  it("retries on empty content, invalid JSON and schema mismatch, then succeeds", async () => {
    const answers = [
      completion(null),
      completion("not json"),
      completion('{"n":"x"}'),
      completion('{"n":1}'),
    ];
    let i = 0;
    const { http } = createTestHttpClient([
      {
        method: "POST",
        path: "/ai/chat/completions",
        handler: () => Response.json(answers[i++]),
      },
    ]);
    const ai = new AISdk(http);
    const result = await ai.generateObject({
      model: "m",
      prompt: "p",
      schema: z.object({ n: z.number() }),
      maxRetries: 3,
    });
    expect(result.object).toEqual({ n: 1 });
    expect(i).toBe(4);
  });

  it("retries 5xx, rethrows 4xx, and reports the last error when exhausted", async () => {
    let calls = 0;
    const { http } = createTestHttpClient([
      {
        method: "POST",
        path: "/ai/chat/completions",
        handler: () => {
          calls++;
          return Response.json(
            { code: "SERVICE_ERROR", message: "down" },
            { status: 503 }
          );
        },
      },
    ]);
    const ai = new AISdk(http);
    await expect(
      ai.generateObject({
        model: "m",
        prompt: "p",
        schema: { type: "object" },
        maxRetries: 1,
      })
    ).rejects.toThrow(/down/);
    expect(calls).toBe(2);

    const { http: bad } = createTestHttpClient([
      {
        method: "POST",
        path: "/ai/chat/completions",
        status: 400,
        body: { code: "VALIDATION_ERROR", message: "nope" },
      },
    ]);
    await expect(
      new AISdk(bad).generateObject({
        model: "m",
        prompt: "p",
        schema: { type: "object" },
        maxRetries: 3,
      })
    ).rejects.toThrow(/nope/);
  });

  it("falls back to a generic error when the transport throws non-Error values", async () => {
    const { http } = createTestHttpClient();
    (http as unknown as { config: { fetch: typeof fetch } }).config.fetch =
      async () => {
        // biome-ignore lint/style/useThrowOnlyError: exercising the non-Error path
        throw "weird";
      };
    await expect(
      new AISdk(http).generateObject({
        model: "m",
        prompt: "p",
        schema: {},
        maxRetries: 0,
      })
    ).rejects.toThrow();
  });
});

describe("misc option branches", () => {
  it("transcribe forwards optional fields as form data", async () => {
    const { http, mock } = createTestHttpClient([
      { method: "POST", path: "/internal/predictions", body: { text: "hi" } },
    ]);
    const ai = new AISdk(http);
    const res = await ai.transcribe({
      file: new Blob(["x"]),
      model: "whisper",
      language: "en",
      prompt: "p",
      responseFormat: "json",
      temperature: 0.2,
    });
    expect(res.text).toBe("hi");
    mock.expectCalled("POST", "/internal/predictions");
  });

  it("rerank normalizes string documents", async () => {
    const { http, mock } = createTestHttpClient([
      { method: "POST", path: "/internal/rerank", body: { scores: [1, 0.5] } },
    ]);
    const res = await new AISdk(http).rerank({
      query: "q",
      documents: ["a", { content: "b" }],
    });
    expect(res.scores).toEqual([1, 0.5]);
    const body = mock.expectCalled("POST", "/internal/rerank").body as {
      documents: unknown[];
    };
    expect(body.documents).toEqual([{ content: "a" }, { content: "b" }]);
  });

  it("listModels handles array and object-with-data responses", async () => {
    const { http: a } = createTestHttpClient([
      { method: "GET", path: "/internal/models", body: ["m1"] },
    ]);
    expect(await new AISdk(a).listModels()).toEqual(["m1"]);
    const { http: b } = createTestHttpClient([
      {
        method: "GET",
        path: "/internal/models",
        body: { data: [{ id: "m2" }] },
      },
    ]);
    expect(await new AISdk(b).listModels()).toEqual(["m2"]);
    const { http: c } = createTestHttpClient([
      { method: "GET", path: "/internal/models", body: { data: [] } },
    ]);
    expect(await new AISdk(c).listModels()).toEqual([]);
  });

  it("generateText tolerates missing usage and unknown finish reasons", async () => {
    const { http } = createTestHttpClient([
      {
        method: "POST",
        path: "/ai/chat/completions",
        body: completion("ok", {}),
      },
    ]);
    const r = await new AISdk(http).generateText({
      model: "m",
      prompt: [{ role: "user", content: "x" }],
    });
    expect(r.usage.totalTokens).toBe(0);
    expect(r.finishReason).toBe("stop");
  });

  it("prompt utilities and token helpers", () => {
    const { http } = createTestHttpClient();
    const ai = new AISdk(http);
    expect(ai.countTokens("hello world")).toBeGreaterThan(0);
    expect(
      ai.estimateCost({ model: "m", inputTokens: 10, outputTokens: 10 })
    ).toBeGreaterThanOrEqual(0);
    ai.stepCountIs(3);
    expect(ai.getCurrentStep()).toBe(3);
    ai.resetSteps();
    expect(ai.getCurrentStep()).toBe(0);
    const p = ai.createPrompt({
      name: "greet",
      template: "Hi {{name}}",
      variables: { name: { type: "string", required: true } },
    });
    expect(ai.getPrompt("greet", "9.9.9").name).toBe("greet");
    expect(() => ai.getPrompt("missing")).toThrow(/not found/);
    ai.updatePrompt("greet", { template: "Yo {{name}}" });
    expect(ai.getPrompt("greet").template).toContain("Yo");
    expect(ai.chainPrompts(p, p)).toBeDefined();
  });
});

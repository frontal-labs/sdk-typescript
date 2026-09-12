import { RateLimitError } from "@frontal-labs/core";
import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { AISdk } from "../src/sdk";
import type { TextStreamPart } from "../src/stream";

function chunk(delta: Record<string, unknown>, finish: string | null = null) {
  return `data: ${JSON.stringify({
    id: "c1",
    object: "chat.completion.chunk",
    created: 0,
    model: "m",
    choices: [{ index: 0, delta, finish_reason: finish }],
  })}\n\n`;
}

function sse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/event-stream" },
  });
}

function sdkWithFetch(fetchImpl: typeof fetch): AISdk {
  const { http } = createTestHttpClient();
  // Swap the fetch on the underlying config (test-only reach-in).
  (http as unknown as { config: { fetch: typeof fetch } }).config.fetch =
    fetchImpl;
  return new AISdk(http);
}

async function collect<T>(stream: ReadableStream<T>): Promise<T[]> {
  const out: T[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out.push(value);
  }
  return out;
}

describe("ai.streamText", () => {
  it("yields text on textStream and full parts on fullStream", async () => {
    const ai = sdkWithFetch(async () =>
      sse(
        chunk({ role: "assistant", content: "Hel" }) +
          chunk({ content: "lo" }, "stop") +
          `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } })}\n\n` +
          "data: [DONE]\n\n"
      )
    );
    const chunks: string[] = [];
    const result = ai.streamText({
      model: "m",
      prompt: "hi",
      onChunk: (c) => chunks.push(c),
    });
    const [text, full] = await Promise.all([
      collect(result.textStream),
      collect(result.fullStream),
    ]);
    expect(text.join("")).toBe("Hello");
    expect(chunks).toEqual(["Hel", "lo"]);
    expect(full.map((p) => p.type)).toEqual(["text", "text", "finish", "done"]);
    expect(await result.usage).toEqual({
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3,
    });
    expect(await result.finishReason).toBe("stop");
  });

  it("assembles streamed tool calls into a tool-call part", async () => {
    const ai = sdkWithFetch(async () =>
      sse(
        chunk({
          tool_calls: [
            {
              index: 0,
              id: "call_1",
              function: { name: "classify", arguments: '{"te' },
            },
          ],
        }) +
          chunk(
            { tool_calls: [{ index: 0, function: { arguments: 'xt":"x"}' } }] },
            "tool_calls"
          ) +
          "data: [DONE]\n\n"
      )
    );
    const full = await collect(
      ai.streamText({ model: "m", prompt: "hi" }).fullStream
    );
    const tool = full.find((p) => p.type === "tool-call");
    expect(tool).toEqual({
      type: "tool-call",
      id: "call_1",
      toolName: "classify",
      input: { text: "x" },
    });
    expect(full.find((p) => p.type === "finish")).toMatchObject({
      finishReason: "tool-calls",
    });
  });

  it("surfaces HTTP errors as an error part and calls onError", async () => {
    const ai = sdkWithFetch(
      async () =>
        new Response(
          JSON.stringify({
            code: "RATE_LIMITED",
            message: "slow",
            request_id: "r1",
          }),
          {
            status: 429,
            headers: { "content-type": "application/json", "retry-after": "3" },
          }
        )
    );
    const seen: unknown[] = [];
    const result = ai.streamText({
      model: "m",
      prompt: "hi",
      onError: (e) => seen.push(e),
    });
    const full = await collect(result.fullStream);
    expect(full.map((p) => p.type)).toEqual(["error", "done"]);
    const err = (full[0] as Extract<TextStreamPart, { type: "error" }>).error;
    expect(RateLimitError.isInstance(err)).toBe(true);
    expect(err.retryable).toBe(true);
    expect(seen).toHaveLength(1);
    // textStream is an alternative view of the same request: read it on a
    // fresh call rather than after fullStream has been drained.
    const again = ai.streamText({ model: "m", prompt: "hi" });
    await expect(collect(again.textStream)).rejects.toBeInstanceOf(
      RateLimitError
    );
  });

  it("retries before the first byte when streamRetries is set", async () => {
    let calls = 0;
    const ai = sdkWithFetch(async () => {
      calls++;
      if (calls === 1) {
        return new Response("{}", { status: 503 });
      }
      return sse(`${chunk({ content: "ok" }, "stop")}data: [DONE]\n\n`);
    });
    const text = await collect(
      ai.streamText({ model: "m", prompt: "hi", streamRetries: 1 }).textStream
    );
    expect(calls).toBe(2);
    expect(text.join("")).toBe("ok");
  });

  it("does not retry after data has been emitted", async () => {
    let calls = 0;
    const ai = sdkWithFetch(async () => {
      calls++;
      // A stream that yields a chunk, then breaks the connection.
      let pulls = 0;
      const body = new ReadableStream<Uint8Array>({
        pull(c) {
          pulls++;
          if (pulls === 1) {
            c.enqueue(new TextEncoder().encode(chunk({ content: "part" })));
          } else {
            c.error(new Error("connection reset"));
          }
        },
      });
      return new Response(body, { status: 200 });
    });
    const full = await collect(
      ai.streamText({ model: "m", prompt: "hi", streamRetries: 2 }).fullStream
    );
    expect(calls).toBe(1);
    expect(full.map((p) => p.type)).toEqual(["text", "error", "done"]);
  });

  it("aborts via signal", async () => {
    const ctl = new AbortController();
    const ai = sdkWithFetch(async (_url, init) => {
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new TextEncoder().encode(chunk({ content: "a" })));
          init?.signal?.addEventListener("abort", () =>
            c.error(new Error("aborted"))
          );
        },
      });
      return new Response(body, { status: 200 });
    });
    const aborted: string[] = [];
    const result = ai.streamText({
      model: "m",
      prompt: "hi",
      signal: ctl.signal,
      onAbort: () => aborted.push("yes"),
    });
    const reader = result.fullStream.getReader();
    const first = await reader.read();
    expect(first.value).toEqual({ type: "text", text: "a" });
    ctl.abort();
    const rest: TextStreamPart[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      rest.push(value);
    }
    expect(rest.map((p) => p.type)).toEqual(["abort", "done"]);
    expect(aborted).toEqual(["yes"]);
  });
});

describe("streamText lifecycle", () => {
  it("cancels the request when the textStream consumer breaks early", async () => {
    let cancelled = false;
    const ai = sdkWithFetch(async () => {
      const body = new ReadableStream<Uint8Array>({
        pull(c) {
          c.enqueue(new TextEncoder().encode(chunk({ content: "x" })));
        },
        cancel() {
          cancelled = true;
        },
      });
      return new Response(body, { status: 200 });
    });
    const result = ai.streamText({ model: "m", prompt: "hi" });
    for await (const _ of result.textStream) break;
    await new Promise((r) => setTimeout(r, 20));
    expect(cancelled).toBe(true);
  });

  it("waits for Retry-After before retrying a rate-limited stream", async () => {
    let calls = 0;
    const started = Date.now();
    const ai = sdkWithFetch(async () => {
      calls++;
      if (calls === 1) {
        return new Response(
          JSON.stringify({ code: "RATE_LIMITED", message: "slow" }),
          {
            status: 429,
            headers: { "content-type": "application/json", "retry-after": "0" },
          }
        );
      }
      return sse(`${chunk({ content: "ok" }, "stop")}data: [DONE]\n\n`);
    });
    // retry-after: 0 → immediate; the point is the path runs without error.
    const text = await collect(
      ai.streamText({ model: "m", prompt: "hi", streamRetries: 1 }).textStream
    );
    expect(calls).toBe(2);
    expect(text.join("")).toBe("ok");
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("keys tool-call deltas by id when index is absent", async () => {
    const ai = sdkWithFetch(async () =>
      sse(
        `${chunk(
          {
            tool_calls: [
              { id: "a", function: { name: "one", arguments: "{}" } },
              { id: "b", function: { name: "two", arguments: "{}" } },
            ],
          },
          "tool_calls"
        )}data: [DONE]\n\n`
      )
    );
    const full = await collect(
      ai.streamText({ model: "m", prompt: "hi" }).fullStream
    );
    expect(
      full
        .filter((p) => p.type === "tool-call")
        .map((p) => (p as { toolName: string }).toolName)
    ).toEqual(["one", "two"]);
  });
});

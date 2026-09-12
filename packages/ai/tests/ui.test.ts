import { parseFrontalError } from "@frontal-labs/core";
import { describe, expect, it } from "vitest";
import type { TextStreamPart } from "../src/stream";
import {
  applyUIFrame,
  createUIMessage,
  parseUIMessageStream,
  serializeError,
  toUIMessageStreamResponse,
  UI_MESSAGE_STREAM_HEADER,
} from "../src/ui";

function fullStream(parts: TextStreamPart[]): ReadableStream<TextStreamPart> {
  return new ReadableStream({
    start(c) {
      for (const p of parts) c.enqueue(p);
      c.close();
    },
  });
}

async function frames(res: Response) {
  const out = [];
  for await (const f of parseUIMessageStream(res)) out.push(f);
  return out;
}

describe("UI message stream", () => {
  it("round-trips parts → frames → message", async () => {
    const res = toUIMessageStreamResponse(
      {
        fullStream: fullStream([
          { type: "text", text: "Hel" },
          { type: "text", text: "lo" },
          { type: "tool-call", id: "c1", toolName: "route", input: { q: 1 } },
          {
            type: "finish",
            finishReason: "tool-calls",
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          },
          { type: "done" },
        ]),
      },
      { messageId: "msg_1" }
    );
    expect(res.headers.get(UI_MESSAGE_STREAM_HEADER)).toBe("v1");

    const got = await frames(res);
    expect(got.map((f) => f.type)).toEqual([
      "start",
      "text-delta",
      "text-delta",
      "tool-call",
      "finish",
      "done",
    ]);

    let msg = createUIMessage("assistant");
    for (const f of got) msg = applyUIFrame(msg, f);
    expect(msg.id).toBe("msg_1");
    expect(msg.text).toBe("Hello");
    expect(msg.parts).toEqual([
      { type: "text", text: "Hello" },
      {
        type: "tool-call",
        id: "c1",
        toolName: "route",
        input: { q: 1 },
        state: "pending",
      },
    ]);

    msg = applyUIFrame(msg, {
      type: "tool-result",
      id: "c1",
      toolName: "route",
      output: { ok: true },
    });
    expect(msg.parts[1]).toMatchObject({ state: "done", output: { ok: true } });
  });

  it("serializes SDK errors with retryable/fix", async () => {
    const err = parseFrontalError(
      { code: "RATE_LIMITED", message: "slow", requestId: "r1" },
      429
    );
    const res = toUIMessageStreamResponse({
      fullStream: fullStream([{ type: "error", error: err }, { type: "done" }]),
    });
    const got = await frames(res);
    expect(got[1]).toEqual({
      type: "error",
      error: expect.objectContaining({
        code: "RATE_LIMITED",
        requestId: "r1",
        statusCode: 429,
        retryable: true,
        fix: expect.stringMatching(/retryAfter/),
      }),
    });
  });

  it("turns a non-OK response into an error frame", async () => {
    const res = new Response(
      JSON.stringify({ code: "UNAUTHORIZED", message: "no" }),
      { status: 401 }
    );
    expect(await frames(res)).toEqual([
      {
        type: "error",
        error: expect.objectContaining({
          code: "UNAUTHORIZED",
          retryable: false,
          statusCode: 401,
        }),
      },
      { type: "done" },
    ]);
  });

  it("tolerates frames split across chunks", async () => {
    const text =
      'data: {"type":"text-delta","delta":"a"}\n\ndata: {"type":"text-delta","delta":"b"}\n\ndata: {"type":"done"}\n\n';
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode(text.slice(0, 20)));
        c.enqueue(enc.encode(text.slice(20, 55)));
        c.enqueue(enc.encode(text.slice(55)));
        c.close();
      },
    });
    const got = await frames(new Response(body, { status: 200 }));
    expect(got).toEqual([
      { type: "text-delta", delta: "a" },
      { type: "text-delta", delta: "b" },
      { type: "done" },
    ]);
  });
});

describe("UI message stream edge cases", () => {
  it("serializes plain errors with defaults", () => {
    const e = serializeError(new Error("plain"));
    expect(e).toMatchObject({
      code: "UNKNOWN_ERROR",
      message: "plain",
      retryable: false,
    });
  });

  it("non-OK responses with non-JSON bodies and retryable statuses", async () => {
    const res = new Response("<html>", {
      status: 503,
      statusText: "Unavailable",
    });
    const got = await frames(res);
    expect(got[0]).toEqual({
      type: "error",
      error: {
        code: "HTTP_503",
        message: "Unavailable",
        retryable: true,
        requestId: undefined,
        statusCode: 503,
      },
    });
  });

  it("handles an OK response without a body", async () => {
    const res = new Response(null, { status: 200 });
    expect(await frames(res)).toEqual([{ type: "done" }]);
  });

  it("appends done when the stream ends without a done frame and skips malformed frames", async () => {
    const res = new Response(
      'data: {"type":"text-delta","delta":"a"}\n\ndata: {bad json\n\n',
      { status: 200 }
    );
    expect(await frames(res)).toEqual([
      { type: "text-delta", delta: "a" },
      { type: "done" },
    ]);
  });

  it("aborts via signal", async () => {
    const ctl = new AbortController();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(
          new TextEncoder().encode(
            'data: {"type":"text-delta","delta":"a"}\n\n'
          )
        );
      },
    });
    const it = parseUIMessageStream(new Response(body, { status: 200 }), {
      signal: ctl.signal,
    });
    expect((await it.next()).value).toEqual({ type: "text-delta", delta: "a" });
    const pending = it.next();
    ctl.abort();
    const rest = [(await pending).value];
    for await (const f of it) rest.push(f);
    expect(rest.map((f) => f?.type)).toEqual(["abort", "done"]);
  });

  it("applyUIFrame: tool-result by name, unmatched result, text after tool, unknown frame", () => {
    let msg = createUIMessage("assistant", "seed");
    msg = applyUIFrame(msg, { type: "tool-call", toolName: "t", input: {} });
    msg = applyUIFrame(msg, { type: "text-delta", delta: "x" });
    expect(msg.parts.map((p) => p.type)).toEqual(["text", "tool-call", "text"]);
    msg = applyUIFrame(msg, { type: "tool-result", toolName: "t", output: 1 });
    expect(msg.parts[1]).toMatchObject({ state: "done", output: 1 });
    const same = applyUIFrame(msg, {
      type: "tool-result",
      toolName: "nope",
      output: 2,
    });
    expect(same.parts[1]).toMatchObject({ output: 1 });
    expect(
      applyUIFrame(msg, {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      })
    ).toBe(msg);
    expect(applyUIFrame(msg, { type: "abort" })).toBe(msg);
  });
});

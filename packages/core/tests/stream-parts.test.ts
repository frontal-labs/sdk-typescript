import { describe, expect, it } from "vitest";
import {
  FrontalError,
  isFrontalError,
  isRetryableError,
  NetworkError,
  NotFoundError,
  parseFrontalError,
  RateLimitError,
  ServiceError,
  TimeoutError,
  ValidationError,
} from "../src/errors";
import { HttpClient } from "../src/http";
import { dataParts, type StreamPart, toStreamParts } from "../src/stream";

const err = (code: string, message = "boom") => ({
  code,
  message,
  requestId: "req_1",
});

describe("error metadata", () => {
  it("marks transient statuses retryable", () => {
    expect(parseFrontalError(err("RATE_LIMITED"), 429).retryable).toBe(true);
    expect(parseFrontalError(err("X"), 503).retryable).toBe(true);
    expect(parseFrontalError(err("X"), 500).retryable).toBe(true);
    expect(parseFrontalError(err("NOT_FOUND"), 404).retryable).toBe(false);
    expect(parseFrontalError(err("VALIDATION_ERROR"), 400).retryable).toBe(
      false
    );
    expect(new NetworkError(new Error("x")).retryable).toBe(true);
    expect(new TimeoutError().retryable).toBe(true);
  });

  it("suggests a fix for well-known codes", () => {
    expect(parseFrontalError(err("UNAUTHORIZED"), 401).fix).toMatch(
      /FRONTAL_API_KEY/
    );
    expect(parseFrontalError(err("RATE_LIMITED"), 429).fix).toMatch(
      /retryAfter/
    );
    expect(parseFrontalError(err("SOMETHING"), 418).fix).toBeUndefined();
  });

  it("isInstance is structural and survives prototype loss", () => {
    const e = parseFrontalError(err("NOT_FOUND"), 404);
    expect(NotFoundError.isInstance(e)).toBe(true);
    expect(FrontalError.isInstance(e)).toBe(true);
    expect(RateLimitError.isInstance(e)).toBe(false);

    // Simulate a duplicate module instance: same shape, foreign prototype.
    const foreign = Object.assign(Object.create(Error.prototype), e, {
      name: "NotFoundError",
    });
    expect(foreign instanceof NotFoundError).toBe(false);
    expect(NotFoundError.isInstance(foreign)).toBe(true);
    expect(isFrontalError(foreign)).toBe(true);
    expect(isFrontalError(new Error("plain"))).toBe(false);
  });

  it("isRetryableError works on any value", () => {
    expect(isRetryableError(new TimeoutError())).toBe(true);
    expect(isRetryableError(parseFrontalError(err("X"), 400))).toBe(false);
    expect(isRetryableError(new Error("x"))).toBe(false);
    expect(isRetryableError(null)).toBe(false);
  });

  it("toJSON produces a serializable view", () => {
    const e = parseFrontalError(err("VALIDATION_ERROR"), 400);
    expect(ValidationError.isInstance(e)).toBe(true);
    const json = JSON.parse(JSON.stringify(e));
    expect(json).toMatchObject({
      name: "ValidationError",
      code: "VALIDATION_ERROR",
      requestId: "req_1",
      statusCode: 400,
      retryable: false,
    });
    expect(ServiceError.isInstance(parseFrontalError(err("X"), 502))).toBe(
      true
    );
  });
});

async function* events(
  items: Array<{ type: string; data: unknown }>,
  failAfter?: number
): AsyncGenerator<{ type: string; data: unknown; id?: string }> {
  let i = 0;
  for (const item of items) {
    if (failAfter !== undefined && i++ === failAfter) {
      throw parseFrontalError(err("RATE_LIMITED"), 429);
    }
    yield item;
  }
}

async function collect<T>(it: AsyncIterable<StreamPart<T>>) {
  const out: StreamPart<T>[] = [];
  for await (const p of it) out.push(p);
  return out;
}

describe("toStreamParts", () => {
  it("wraps events and always ends with done", async () => {
    const parts = await collect(
      toStreamParts(events([{ type: "step", data: { n: 1 } }]))
    );
    expect(parts).toEqual([
      { type: "data", event: "step", data: { n: 1 }, id: undefined },
      { type: "done" },
    ]);
  });

  it("yields thrown errors as data", async () => {
    const parts = await collect(
      toStreamParts(
        events(
          [
            { type: "a", data: 1 },
            { type: "b", data: 2 },
          ],
          1
        )
      )
    );
    expect(parts[0]).toMatchObject({ type: "data", event: "a" });
    expect(parts[1]?.type).toBe("error");
    if (parts[1]?.type === "error") {
      expect(RateLimitError.isInstance(parts[1].error)).toBe(true);
      expect(parts[1].error.retryable).toBe(true);
    }
    expect(parts.at(-1)).toEqual({ type: "done" });
  });

  it("honours an already-aborted signal", async () => {
    const ctl = new AbortController();
    ctl.abort();
    const parts = await collect(
      toStreamParts(events([{ type: "a", data: 1 }]), { signal: ctl.signal })
    );
    expect(parts).toEqual([{ type: "abort" }, { type: "done" }]);
  });

  it("aborts a hung stream", async () => {
    const ctl = new AbortController();
    async function* hung(): AsyncGenerator<{ type: string; data: unknown }> {
      yield { type: "a", data: 1 };
      await new Promise(() => undefined); // never resolves
    }
    const it = toStreamParts(hung(), { signal: ctl.signal });
    const first = await it.next();
    expect(first.value).toMatchObject({ type: "data" });
    const pending = it.next();
    ctl.abort();
    expect((await pending).value).toEqual({ type: "abort" });
    expect((await it.next()).value).toEqual({ type: "done" });
  });

  it("dataParts rethrows error parts", async () => {
    const out: unknown[] = [];
    await expect(async () => {
      for await (const d of dataParts(
        toStreamParts(events([{ type: "a", data: 1 }], 0))
      )) {
        out.push(d);
      }
    }).rejects.toThrow(/boom/);
  });
});

describe("HttpClient.streamParts", () => {
  const config = {
    apiKey: "frt_test1234567890",
    baseUrl: "https://api.test/v1",
    timeout: 1000,
    maxRetries: 0,
    retryDelay: 0,
    headers: {},
    environment: "test",
    debug: false,
  };

  it("turns an HTTP error into an error part", async () => {
    const http = new HttpClient({
      ...config,
      fetch: async () =>
        new Response(JSON.stringify(err("NOT_FOUND", "no run")), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
    });
    const parts = await collect(http.streamParts("/agents/runs/x/stream"));
    expect(parts[0]?.type).toBe("error");
    if (parts[0]?.type === "error") {
      expect(NotFoundError.isInstance(parts[0].error)).toBe(true);
    }
    expect(parts[1]).toEqual({ type: "done" });
  });

  it("streams SSE frames as data parts", async () => {
    const http = new HttpClient({
      ...config,
      fetch: async () =>
        new Response(
          'event: step\ndata: {"tier":"enterprise"}\n\nevent: done\ndata: {}\n\n',
          { status: 200, headers: { "content-type": "text/event-stream" } }
        ),
    });
    const parts = await collect(http.postStreamParts("/x", {}));
    expect(parts).toEqual([
      {
        type: "data",
        event: "step",
        data: { tier: "enterprise" },
        id: undefined,
      },
      { type: "data", event: "done", data: {}, id: undefined },
      { type: "done" },
    ]);
  });
});

describe("raw() opaque subtrees", () => {
  it("survive camel/snake transforms", async () => {
    const { deepCamelToSnake, raw } = await import("../src/transform");
    const out = deepCamelToSnake({
      toolChoice: "auto",
      tools: [
        {
          function: {
            parameters: raw({
              additionalProperties: false,
              properties: { ticketId: { type: "string" } },
            }),
          },
        },
      ],
    }) as unknown as {
      tool_choice: string;
      tools: Array<{ function: { parameters: Record<string, unknown> } }>;
    };
    expect(out.tool_choice).toBe("auto");
    expect(out.tools[0]?.function.parameters).toEqual({
      additionalProperties: false,
      properties: { ticketId: { type: "string" } },
    });
  });
});

describe("toStreamParts lifecycle", () => {
  it("closes the source when the consumer breaks early", async () => {
    let closed = false;
    async function* src() {
      try {
        yield { type: "a", data: 1 };
        yield { type: "b", data: 2 };
      } finally {
        closed = true;
      }
    }
    for await (const p of toStreamParts(src())) {
      if (p.type === "data") break;
    }
    expect(closed).toBe(true);
  });

  it("registers a single abort listener per stream and removes it", async () => {
    const ctl = new AbortController();
    let adds = 0;
    let removes = 0;
    const origAdd = ctl.signal.addEventListener.bind(ctl.signal);
    const origRemove = ctl.signal.removeEventListener.bind(ctl.signal);
    ctl.signal.addEventListener = ((...args: Parameters<typeof origAdd>) => {
      adds++;
      return origAdd(...args);
    }) as typeof origAdd;
    ctl.signal.removeEventListener = ((
      ...args: Parameters<typeof origRemove>
    ) => {
      removes++;
      return origRemove(...args);
    }) as typeof origRemove;
    async function* src() {
      for (let i = 0; i < 50; i++) yield { type: "a", data: i };
    }
    for await (const _ of toStreamParts(src(), { signal: ctl.signal })) {
      // drain
    }
    expect(adds).toBe(1);
    expect(removes).toBe(1);
  });
});

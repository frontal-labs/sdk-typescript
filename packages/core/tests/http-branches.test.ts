import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { RateLimitError, TimeoutError } from "../src/errors";
import { HttpClient } from "../src/http";

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

function withFetch(
  fetchImpl: typeof fetch,
  extra: Partial<typeof base> & { debug?: boolean } = {}
) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const http = new HttpClient({
    ...base,
    ...extra,
    fetch: async (input, init) => {
      calls.push({ url: String(input), init });
      return fetchImpl(input, init);
    },
  });
  return { http, calls };
}

describe("HttpClient branches", () => {
  it("put/patch default an empty body and non-JSON responses come back as text", async () => {
    const { http, calls } = withFetch(
      async () =>
        new Response("plain", {
          status: 200,
          headers: { "content-type": "text/plain" },
        })
    );
    expect(await http.put("/x")).toBe("plain");
    expect(await http.patch("/x")).toBe("plain");
    expect(calls[0]?.init?.body).toBe("{}");
  });

  it("returns undefined for 204", async () => {
    const { http } = withFetch(async () => new Response(null, { status: 204 }));
    expect(await http.delete("/x")).toBeUndefined();
  });

  it("normalizes a duplicated /v1 prefix and warns in debug mode", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { http, calls } = withFetch(async () => Response.json({}), {
      debug: true,
    });
    await http.get("/v1/agents");
    expect(calls[0]?.url).toBe("https://api.test/v1/agents");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    await http.get("agents"); // no leading slash
    expect(calls[1]?.url).toBe("https://api.test/v1/agents");
  });

  it("parses rate-limit headers and non-JSON error bodies", async () => {
    const { http } = withFetch(
      async () =>
        new Response("boom", {
          status: 429,
          headers: {
            "retry-after": "7",
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "100",
          },
        })
    );
    const err = await http.get("/x").catch((e) => e);
    expect(RateLimitError.isInstance(err)).toBe(true);
    expect(err.retryAfter).toBe(7);
    expect(err.rateLimit).toEqual({ limit: 10, remaining: 0, reset: 100 });
    expect(err.code).toBe("UNKNOWN_ERROR");
  });

  it("uses Retry-After for the retry delay when present", async () => {
    let n = 0;
    const { http } = withFetch(
      async () =>
        n++ === 0
          ? new Response("{}", { status: 503, headers: { "retry-after": "0" } })
          : Response.json({ ok: true }),
      { maxRetries: 1 }
    );
    expect(await http.get("/x")).toEqual({ ok: true });
    expect(n).toBe(2);
  });

  it("does not bypass schema failures that mention _zod", async () => {
    const { http } = withFetch(async () =>
      Response.json({ valid: "no", _zod: "unexpected" })
    );
    const schema = z.object({ valid: z.boolean() }).strict();
    await expect(http.get("/x", undefined, schema)).rejects.toBeInstanceOf(
      z.ZodError
    );
  });

  it("does not automatically replay POST writes after a transient response", async () => {
    let calls = 0;
    const { http } = withFetch(
      async () => {
        calls++;
        return Response.json(
          { code: "SERVICE_UNAVAILABLE", message: "try again" },
          { status: 503 }
        );
      },
      { maxRetries: 2 }
    );

    await expect(http.post("/charges", { amount: 100 })).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("times out while consuming a response body", async () => {
    const { http } = withFetch(
      async () =>
        ({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => new Promise(() => undefined),
        }) as Response,
      { timeout: 10 }
    );

    await expect(http.get("/slow-body")).rejects.toBeInstanceOf(TimeoutError);
  });

  it("keeps SSE event fields across chunks and joins data lines", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      "event: update\n",
      "id: evt_1\n",
      'data: {"first":\n',
      'data: "x"}\n',
      "\n",
    ];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
    const { http } = withFetch(
      async () =>
        new Response(stream, {
          headers: { "content-type": "text/event-stream" },
        })
    );

    const events = [];
    for await (const event of http.stream("/events")) events.push(event);

    expect(events).toEqual([
      { type: "update", id: "evt_1", data: { first: "x" } },
    ]);
  });

  it("invokes logger hooks", async () => {
    const seen: string[] = [];
    const http = new HttpClient({
      ...base,
      fetch: async () => Response.json({}),
      logger: {
        request: () => seen.push("request"),
        response: () => seen.push("response"),
        error: () => seen.push("error"),
      },
    });
    await http.get("/x");
    expect(seen).toEqual(["request", "response"]);
  });
});

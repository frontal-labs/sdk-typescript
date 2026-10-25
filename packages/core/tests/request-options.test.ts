/**
 * Tests for per-call RequestOptions (headers, timeout, abort, retry overrides)
 * and API-key validation at construction.
 */

import { describe, expect, it } from "vitest";
import { clientConfigSchema } from "../src/config";
import { TimeoutError } from "../src/errors";
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

/** A fetch that never answers unless its signal aborts. */
const hang = (_input: unknown, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () =>
      reject(init.signal?.reason ?? new Error("aborted"))
    );
  });

describe("per-call headers", () => {
  it("merges options.headers over the client defaults on post", async () => {
    let seen: Record<string, string> = {};
    const http = new HttpClient({
      ...base,
      fetch: async (_input, init) => {
        seen = init?.headers as Record<string, string>;
        return Response.json({ ok: true });
      },
    });
    await http.post("/x", { a: 1 }, undefined, {
      headers: { "X-Trace": "abc" },
    });
    expect(seen["X-Trace"]).toBe("abc");
    expect(seen.Authorization).toBe(`Bearer ${base.apiKey}`);
  });

  it("accepts options as the fifth argument of get", async () => {
    let seen: Record<string, string> = {};
    const http = new HttpClient({
      ...base,
      fetch: async (_input, init) => {
        seen = init?.headers as Record<string, string>;
        return Response.json({ ok: true });
      },
    });
    await http.get(
      "/x",
      undefined,
      undefined,
      {},
      {
        headers: { "X-Per-Call": "1" },
      }
    );
    expect(seen["X-Per-Call"]).toBe("1");
  });
});

describe("per-call timeout", () => {
  it("overrides the client timeout and reports the per-call value", async () => {
    const http = new HttpClient({ ...base, timeout: 60_000, fetch: hang });
    const error = await http
      .post("/x", {}, undefined, { timeout: 20 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TimeoutError);
    expect((error as Error).message).toBe("Request timed out after 20ms");
  });
});

describe("abort signal", () => {
  it("cancels an in-flight request and rethrows the abort reason", async () => {
    const http = new HttpClient({ ...base, fetch: hang });
    const controller = new AbortController();
    const pending = http.post("/x", {}, undefined, {
      signal: controller.signal,
    });
    controller.abort(new Error("caller stopped"));
    await expect(pending).rejects.toThrow("caller stopped");
  });

  it("does not wait out a retry delay once aborted", async () => {
    let calls = 0;
    const http = new HttpClient({
      ...base,
      maxRetries: 1,
      retryDelay: 5000,
      fetch: async () => {
        calls++;
        return new Response("{}", { status: 503 });
      },
    });
    const controller = new AbortController();
    const started = Date.now();
    const pending = http.get(
      "/x",
      undefined,
      undefined,
      {},
      {
        signal: controller.signal,
      }
    );
    setTimeout(() => controller.abort(new Error("stop")), 20);
    await expect(pending).rejects.toThrow("stop");
    expect(Date.now() - started).toBeLessThan(1000);
    expect(calls).toBe(1);
  });
});

describe("per-call retry", () => {
  const flaky = () => {
    let calls = 0;
    const fetch = async () => {
      calls++;
      return calls === 1
        ? new Response("{}", { status: 503 })
        : Response.json({ ok: true });
    };
    return { fetch, count: () => calls };
  };

  it("does not retry a POST by default", async () => {
    const f = flaky();
    const http = new HttpClient({ ...base, maxRetries: 2, fetch: f.fetch });
    await expect(http.post("/x", {})).rejects.toThrow();
    expect(f.count()).toBe(1);
  });

  it("retries a POST when the call marks it idempotent", async () => {
    const f = flaky();
    const http = new HttpClient({ ...base, maxRetries: 2, fetch: f.fetch });
    expect(
      await http.post("/x", {}, undefined, { retry: { idempotent: true } })
    ).toEqual({ ok: true });
    expect(f.count()).toBe(2);
  });

  it("overrides the client maxRetries for one call", async () => {
    const f = flaky();
    const http = new HttpClient({ ...base, maxRetries: 0, fetch: f.fetch });
    expect(
      await http.get(
        "/x",
        undefined,
        undefined,
        {},
        {
          retry: { maxRetries: 1 },
        }
      )
    ).toEqual({ ok: true });
    expect(f.count()).toBe(2);
  });
});

describe("API key validation", () => {
  it("rejects an empty key", () => {
    expect(clientConfigSchema.safeParse({ apiKey: "" }).success).toBe(false);
  });

  it("rejects a key with a newline and does not echo the key in the error", () => {
    const result = clientConfigSchema.safeParse({
      apiKey: "frt_EXAMPLE\nSECRETPART",
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain("SECRETPART");
  });
});

/**
 * Regression tests for transport hardening: Retry-After parsing, timer
 * clamping, custom fetch receiver, logger redaction, and 402/413 errors.
 */

import { describe, expect, it } from "vitest";
import {
  PayloadTooLargeError,
  PaymentRequiredError,
  parseFrontalError,
} from "../src/errors";
import { HttpClient } from "../src/http";
import { parseRetryAfterMs, parseRetryAfterMsHeader } from "../src/retry";

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

describe("parseRetryAfterMs", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");

  it("returns undefined for missing, blank, or garbage values", () => {
    expect(parseRetryAfterMs(undefined, now)).toBeUndefined();
    expect(parseRetryAfterMs(null, now)).toBeUndefined();
    expect(parseRetryAfterMs("", now)).toBeUndefined();
    expect(parseRetryAfterMs("   ", now)).toBeUndefined();
    expect(parseRetryAfterMs("soon", now)).toBeUndefined();
  });

  it("treats an explicit 0 as a valid zero delay", () => {
    expect(parseRetryAfterMs("0", now)).toBe(0);
  });

  it("parses integer seconds", () => {
    expect(parseRetryAfterMs("5", now)).toBe(5000);
  });

  it("parses an HTTP-date relative to now and clamps past dates to 0", () => {
    const future = new Date(now + 3000).toUTCString();
    expect(parseRetryAfterMs(future, now)).toBe(3000);
    const past = new Date(now - 3000).toUTCString();
    expect(parseRetryAfterMs(past, now)).toBe(0);
  });
});

describe("parseRetryAfterMsHeader", () => {
  it("reads retry-after-ms values as milliseconds, not seconds", () => {
    expect(parseRetryAfterMsHeader("250")).toBe(250);
    expect(parseRetryAfterMsHeader("250.5")).toBe(250.5);
  });

  it("ignores blank and malformed values", () => {
    expect(parseRetryAfterMsHeader(" ")).toBeUndefined();
    expect(parseRetryAfterMsHeader("-1")).toBeUndefined();
    expect(parseRetryAfterMsHeader("1e3")).toBeUndefined();
  });
});

describe("retry on blank Retry-After", () => {
  it("falls back to the configured backoff instead of retrying immediately", async () => {
    let calls = 0;
    const http = new HttpClient({
      ...base,
      maxRetries: 1,
      retryDelay: 120,
      fetch: async () => {
        calls++;
        return calls === 1
          ? new Response("{}", {
              status: 503,
              headers: { "retry-after": "   " },
            })
          : Response.json({ ok: true });
      },
    });
    const started = Date.now();
    expect(await http.get("/x")).toEqual({ ok: true });
    expect(calls).toBe(2);
    expect(Date.now() - started).toBeGreaterThanOrEqual(100);
  });

  it("honors retry-after-ms over Retry-After", async () => {
    let calls = 0;
    const http = new HttpClient({
      ...base,
      maxRetries: 1,
      retryDelay: 0,
      fetch: async () => {
        calls++;
        return calls === 1
          ? new Response("{}", {
              status: 503,
              headers: { "retry-after-ms": "80", "retry-after": "0" },
            })
          : Response.json({ ok: true });
      },
    });
    const started = Date.now();
    await http.get("/x");
    expect(Date.now() - started).toBeGreaterThanOrEqual(70);
  });
});

describe("timeout clamp", () => {
  it("does not fire early for a timeout above the 32-bit timer maximum", async () => {
    const http = new HttpClient({
      ...base,
      timeout: 2_147_483_648,
      fetch: async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return Response.json({ ok: true });
      },
    });
    expect(await http.get("/x")).toEqual({ ok: true });
  });
});

describe("custom fetch receiver", () => {
  it("calls an injected fetch without the config object as this", async () => {
    const seen: unknown[] = [];
    const fetchLike = function (this: unknown) {
      seen.push(this);
      return Promise.resolve(Response.json({ ok: true }));
    };
    const http = new HttpClient({
      ...base,
      fetch: fetchLike as typeof fetch,
    });
    await http.get("/x");
    expect(seen).toEqual([undefined]);
  });
});

describe("logger redaction", () => {
  it("masks the bearer token in logger input but sends the real key", async () => {
    const logged: Record<string, string>[] = [];
    const sent: Record<string, string>[] = [];
    const http = new HttpClient({
      ...base,
      logger: {
        request: (_m: unknown, _u: unknown, init: unknown) => {
          logged.push((init as RequestInit).headers as Record<string, string>);
        },
      },
      fetch: async (_input, init) => {
        sent.push(init?.headers as Record<string, string>);
        return Response.json({ ok: true });
      },
    });
    await http.get("/x");
    expect(logged[0]?.Authorization).toBe("Bearer [REDACTED]");
    expect(sent[0]?.Authorization).toBe(`Bearer ${base.apiKey}`);
  });
});

describe("402 and 413 errors", () => {
  it("maps 402 to PaymentRequiredError", () => {
    const err = parseFrontalError({ message: "no balance" }, 402);
    expect(err).toBeInstanceOf(PaymentRequiredError);
    expect(err.statusCode).toBe(402);
    expect(err.name).toBe("PaymentRequiredError");
  });

  it("maps 413 to PayloadTooLargeError", () => {
    const err = parseFrontalError({ message: "too big" }, 413);
    expect(err).toBeInstanceOf(PayloadTooLargeError);
    expect(err.statusCode).toBe(413);
  });

  it("surfaces 402 from the transport as PaymentRequiredError", async () => {
    const http = new HttpClient({
      ...base,
      fetch: async () =>
        Response.json(
          { code: "PAYMENT_REQUIRED", message: "top up", requestId: "r1" },
          { status: 402 }
        ),
    });
    await expect(http.get("/x")).rejects.toBeInstanceOf(PaymentRequiredError);
  });
});

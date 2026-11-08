import { isFrontalError as isLibraryFrontalError } from "@frontal-labs/error";
import { describe, expect, it, vi } from "vitest";
import { CircuitBreakerOpenError } from "../src/circuit-breaker";
import type { FrontalError } from "../src/errors";
import { isRetryableError, TimeoutError } from "../src/errors";
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

function clientReturning(
  response: () => Response,
  overrides: Partial<typeof base> & { logger?: unknown } = {}
) {
  return new HttpClient({
    ...base,
    ...overrides,
    fetch: async () => response(),
  } as never);
}

const notFound = (headers: Record<string, string> = {}, message = "missing") =>
  new Response(JSON.stringify({ error: { code: "NOT_FOUND", message } }), {
    status: 404,
    headers,
  });

describe("HTTP error boundary", () => {
  it("attaches the status and request id as error attributes", async () => {
    const http = clientReturning(() => notFound({ "x-request-id": "req_42" }));
    const error = (await http
      .get("/x")
      .catch((e: unknown) => e)) as FrontalError;
    expect(error.attributes).toEqual({
      "http.status_code": 404,
      "frontal.request_id": "req_42",
    });
  });

  it("sends redacted diagnostics to the configured logger", async () => {
    const logger = { error: vi.fn() };
    const http = clientReturning(
      () =>
        notFound({ "x-request-id": "req_1" }, "key frt_live_SECRET123 unknown"),
      { logger } as never
    );
    await http.get("/x").catch(() => undefined);

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [diagnostics] = logger.error.mock.calls[0] as [unknown];
    expect(diagnostics).toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
      fingerprint: "frontal/NOT_FOUND",
      retryable: false,
    });
    expect(JSON.stringify(diagnostics)).not.toContain("SECRET123");
  });

  it("prints the same diagnostics under debug", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const http = clientReturning(() => notFound(), { debug: true } as never);
      await http.get("/x").catch(() => undefined);
      expect(spy).toHaveBeenCalledTimes(1);
      const [text] = spy.mock.calls[0] as [string];
      expect(text).toContain("NOT_FOUND");
      expect(text).toContain("missing");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("circuit breaker error", () => {
  it("carries a code, is retryable, and keeps its retry window", () => {
    const error = new CircuitBreakerOpenError(5000);
    expect(error.code).toBe("CIRCUIT_OPEN");
    expect(error.retryAfterMs).toBe(5000);
    expect(isRetryableError(error)).toBe(true);
    expect(isLibraryFrontalError(error)).toBe(true);
    expect(error.name).toBe("CircuitBreakerOpenError");
  });
});

describe("two copies of core", () => {
  it("recognises errors from another module instance by brand", async () => {
    const a = await import("../src/errors");
    vi.resetModules();
    const b = await import("../src/errors");
    expect(a).not.toBe(b);
    expect(a.NotFoundError).not.toBe(b.NotFoundError);

    const fromA = new a.NotFoundError(
      { code: "NOT_FOUND", message: "m", requestId: "r" },
      undefined
    );
    expect(b.isFrontalError(fromA)).toBe(true);
    expect(b.NotFoundError.isInstance(fromA)).toBe(true);
    expect(fromA instanceof b.NotFoundError).toBe(false);
  });
});

describe("service.name and poll timeouts", () => {
  it("adds service.name to error attributes when the client names its service", async () => {
    const http = new HttpClient({
      ...base,
      serviceName: "ai",
      fetch: async () =>
        new Response(
          JSON.stringify({ error: { code: "NOT_FOUND", message: "m" } }),
          {
            status: 404,
            headers: { "x-request-id": "req_svc" },
          }
        ),
    } as never);
    const error = (await http
      .get("/x")
      .catch((e: unknown) => e)) as FrontalError;
    expect(error.attributes).toEqual({
      "http.status_code": 404,
      "frontal.request_id": "req_svc",
      "service.name": "ai",
    });
  });

  it("keeps the TIMEOUT code for polling timeouts and tags operation=poll", async () => {
    const { pollUntil } = await import("../src/polling");
    const error = (await pollUntil(async () => "pending", {
      until: (r) => r === "done",
      timeout: 1,
      interval: 1,
    }).catch((e: unknown) => e)) as { code?: string; metadata?: unknown };
    expect(error.code).toBe("TIMEOUT");
    expect(error.metadata).toEqual({ operation: "poll" });
  });
});

describe("debug output", () => {
  it("never prints an API key from the error message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const http = clientReturning(
        () => notFound({}, "bad key frt_live_DEBUGKEY1"),
        { debug: true } as never
      );
      await http.get("/x").catch(() => undefined);
      const printed = spy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(printed).toContain("NOT_FOUND");
      expect(printed).not.toContain("DEBUGKEY1");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("invalid request and timeout codes", () => {
  it("invalidRequestError is a TypeError with the invalid_request code", async () => {
    const { invalidRequestError } = await import("../src/errors");
    const error = invalidRequestError("bad argument");
    expect(error).toBeInstanceOf(TypeError);
    expect(error.code).toBe("invalid_request");
    expect(error.message).toBe("bad argument");
  });

  it("keeps request timeouts on the TIMEOUT code", () => {
    const error = new TimeoutError("slow");
    expect(error.code).toBe("TIMEOUT");
    expect(error.fix).toMatch(/timeout/);
  });

  it("accepts an explicit code and fix for polling-style timeouts", () => {
    const error = new TimeoutError("poll", {
      code: "POLL_TIMEOUT",
      fix: "wait less",
    });
    expect(error.code).toBe("POLL_TIMEOUT");
    expect(error.fix).toBe("wait less");
    expect(error).toBeInstanceOf(TimeoutError);
  });
});

describe("createErrors-built breaker and coded type errors", () => {
  it("builds CircuitBreakerOpenError through createErrors with the same class and code", async () => {
    const { createErrors } = await import("@frontal-labs/error");
    const { CircuitBreakerOpenError: Breaker } = await import(
      "../src/circuit-breaker"
    );
    const factory = createErrors({ scope: "frontal", ErrorClass: Breaker });
    const error = factory.create("Circuit breaker is open", {
      code: "CIRCUIT_OPEN",
      metadata: { retryAfterMs: 2500 },
    });
    expect(error).toBeInstanceOf(Breaker);
    expect(error.code).toBe("CIRCUIT_OPEN");
    expect(error.retryAfterMs).toBe(2500);
    expect(error.retryable).toBe(true);
  });

  it("keeps the original retry-window constructor", async () => {
    const { CircuitBreakerOpenError: Breaker } = await import(
      "../src/circuit-breaker"
    );
    const error = new Breaker(5000);
    expect(error.retryAfterMs).toBe(5000);
    expect(error.message).toBe("Circuit breaker is open — retry after 5s");
  });

  it("typeErrorWithCode keeps instanceof TypeError and carries the code", async () => {
    const { typeErrorWithCode } = await import("../src/errors");
    const error = typeErrorWithCode("unsupported_runtime", "needs zstd");
    expect(error).toBeInstanceOf(TypeError);
    expect(error.code).toBe("unsupported_runtime");
  });
});

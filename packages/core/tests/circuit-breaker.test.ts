import { describe, expect, it } from "vitest";
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
} from "../src/circuit-breaker";
import { HttpClient } from "../src/http";
import {
  createHttpSpan,
  finishSpan,
  getTracer,
  initTracing,
} from "../src/tracing";

describe("CircuitBreaker", () => {
  it("opens after the failure threshold and rejects fast", async () => {
    let opened = 0;
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 50,
      onOpen: () => opened++,
    });
    const fail = () => Promise.reject(new Error("boom"));
    await expect(cb.execute(fail)).rejects.toThrow("boom");
    expect(cb.getState()).toBe("CLOSED");
    await expect(cb.execute(fail)).rejects.toThrow("boom");
    expect(cb.getState()).toBe("OPEN");
    expect(cb.getFailures()).toBe(2);
    expect(opened).toBe(1);
    await expect(cb.execute(fail)).rejects.toBeInstanceOf(
      CircuitBreakerOpenError
    );
  });

  it("half-opens after the reset timeout and closes on success", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 5 });
    await expect(
      cb.execute(() => Promise.reject(new Error("x")))
    ).rejects.toThrow();
    expect(cb.getState()).toBe("OPEN");
    await new Promise((r) => setTimeout(r, 10));
    expect(await cb.execute(async () => "ok")).toBe("ok");
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.getFailures()).toBe(0);
  });

  it("forceOpen / forceClose", () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 5 });
    cb.forceOpen();
    expect(cb.getState()).toBe("OPEN");
    cb.forceClose();
    expect(cb.getState()).toBe("CLOSED");
  });

  it("is wired into HttpClient when configured", async () => {
    let calls = 0;
    const http = new HttpClient({
      apiKey: "frt_test1234567890",
      baseUrl: "https://api.test/v1",
      timeout: 100,
      maxRetries: 0,
      retryDelay: 0,
      headers: {},
      environment: "test",
      debug: false,
      circuitBreaker: { failureThreshold: 1, resetTimeoutMs: 10_000 },
      fetch: async () => {
        calls++;
        throw new Error("down");
      },
    });
    await expect(http.get("/x")).rejects.toThrow();
    await expect(http.get("/x")).rejects.toThrow(/Circuit breaker is open/);
    expect(calls).toBe(1);
  });
});

describe("tracing", () => {
  it("routes spans through a registered tracer", () => {
    const spans: string[] = [];
    initTracing({
      startSpan: (name) => ({
        setAttribute: (k, v) => {
          spans.push(`${name}:${k}=${String(v)}`);
        },
        setStatus: () => undefined,
        end: () => {
          spans.push(`${name}:end`);
        },
      }),
    });
    const span = createHttpSpan("GET", "/x");
    finishSpan(span, 200);
    expect(getTracer()).toBeDefined();
    expect(spans.some((s) => s.endsWith(":end"))).toBe(true);
  });
});

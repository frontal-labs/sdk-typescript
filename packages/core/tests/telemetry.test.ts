import { afterEach, describe, expect, it } from "vitest";
import { HttpClient } from "../src/http";
import {
  getTelemetry,
  registerTelemetry,
  requestIdOf,
  resetTelemetry,
  type TelemetryEvent,
} from "../src/tracing";

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

afterEach(() => resetTelemetry());

describe("registerTelemetry", () => {
  it("emits spans and hooks for a successful request, and tags the response", async () => {
    const attrs: Record<string, unknown> = {};
    const events: TelemetryEvent[] = [];
    let ended = 0;
    registerTelemetry({
      tracer: {
        startSpan: () => ({
          setAttribute: (k, v) => {
            attrs[k] = v;
          },
          setStatus: () => undefined,
          end: () => {
            ended++;
          },
        }),
      },
      onRequest: (e) => events.push({ ...e, durationMs: 0 }),
      onResponse: (e) => events.push(e),
      recordInputs: true,
      recordOutputs: true,
    });
    const http = new HttpClient({
      ...base,
      fetch: async () =>
        Response.json(
          { id: "a" },
          { headers: { "x-request-id": "req_server" } }
        ),
    });
    const res = await http.post<{ id: string }>("/agents", { name: "n" });
    expect(requestIdOf(res)).toBe("req_server");
    expect(JSON.stringify(res)).toBe('{"id":"a"}'); // tag is non-enumerable
    expect(attrs["http.method"]).toBe("POST");
    expect(attrs["http.status_code"]).toBe(200);
    expect(String(attrs["frontal.request.body"])).toContain("name");
    expect(String(attrs["frontal.response.body"])).toContain('"id"');
    expect(typeof attrs["frontal.request_id"]).toBe("string");
    expect(ended).toBe(1);
    expect(events.map((e) => e.status)).toEqual([undefined, 200]);
    expect(events[1]?.serverRequestId).toBe("req_server");
  });

  it("reports errors and network failures via onError", async () => {
    const errors: TelemetryEvent[] = [];
    registerTelemetry({ onError: (e) => errors.push(e) });
    const http = new HttpClient({
      ...base,
      fetch: async () =>
        Response.json({ code: "NOT_FOUND", message: "x" }, { status: 404 }),
    });
    await expect(http.get("/x")).rejects.toThrow();
    const down = new HttpClient({
      ...base,
      fetch: async () => {
        throw new Error("down");
      },
    });
    await expect(down.get("/y")).rejects.toThrow();
    expect(errors.map((e) => e.status)).toEqual([404, undefined]);
    expect(errors[1]?.error).toBeInstanceOf(Error);
  });

  it("accepts a bare tracer and can be reset", () => {
    registerTelemetry({
      startSpan: () => ({ setAttribute() {}, setStatus() {}, end() {} }),
    });
    expect(getTelemetry()?.tracer).toBeDefined();
    resetTelemetry();
    expect(getTelemetry()).toBeUndefined();
  });

  it("requestIdOf reads error requestIds and ignores primitives", () => {
    expect(requestIdOf({ requestId: "r1" })).toBe("r1");
    expect(requestIdOf("str")).toBeUndefined();
    expect(requestIdOf(null)).toBeUndefined();
  });
});

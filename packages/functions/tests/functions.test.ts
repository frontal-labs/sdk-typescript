import { createTestHttpClient, type MockRoute } from "@frontal/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FunctionsService } from "../src/client";
import { Functions } from "../src/compat";
import { functionConfigSchema, invokeOptionsSchema } from "../src/types";

function createService(routes: MockRoute[] = []) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new FunctionsService(http), mock };
}

const validConfig = {
  name: "my-function",
  runtime: "nodejs20" as const,
  handler: "index.handler",
  memory: 256,
  timeout: 30,
};

const functionEntry = {
  ...validConfig,
  id: "fn_abc123",
  url: "https://fn.frontal.dev/fn_abc123",
  createdAt: "2024-06-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

describe("FunctionsService", () => {
  describe("deploy()", () => {
    it("deploys a function with valid config", async () => {
      const { service, mock } = createService([
        { method: "POST", path: "/v1/workflows/batch", body: functionEntry },
      ]);

      const result = await service.deploy(validConfig);

      expect(result.id).toBe("fn_abc123");
      expect(result.name).toBe("my-function");
      mock.expectCalledWith("POST", "/v1/workflows/batch", {
        operation: "functions.deploy",
      });
    });

    it("throws on invalid config (missing memory)", async () => {
      const { service } = createService([]);

      await expect(
        service.deploy({
          ...validConfig,
          memory: undefined,
        } as unknown as Parameters<typeof service.deploy>[0])
      ).rejects.toThrow();
    });

    it("throws on invalid config (memory out of range)", async () => {
      const { service } = createService([]);

      await expect(
        service.deploy({ ...validConfig, memory: 50 })
      ).rejects.toThrow();
    });
  });

  describe("list()", () => {
    it("lists all functions", async () => {
      const { service } = createService([
        { method: "GET", path: "/v1/workflows", body: [functionEntry] },
      ]);

      const result = await service.list();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("my-function");
    });
  });

  describe("get()", () => {
    it("gets a function by ID", async () => {
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/v1/workflows",
          body: functionEntry,
        },
      ]);

      const result = await service.get("fn_abc123");

      expect(result.id).toBe("fn_abc123");
      mock.expectCalled("GET", "/v1/workflows");
    });

    it("throws on 404", async () => {
      const { service } = createService([]);

      await expect(service.get("fn_missing")).rejects.toThrow();
    });
  });

  describe("delete()", () => {
    it("deletes a function", async () => {
      const { service, mock } = createService([
        { method: "DELETE", path: "/v1/workflows", status: 204 },
      ]);

      await expect(service.delete("fn_abc123")).resolves.not.toThrow();
      mock.expectCalled("DELETE", "/v1/workflows");
    });
  });

  describe("invoke()", () => {
    it("invokes a function with payload", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/v1/workflows/batch",
          body: { result: 42 },
        },
      ]);

      const result = await service.invoke("fn_abc123", {
        payload: { input: "hello" },
      });

      expect(result).toEqual({ result: 42 });
      mock.expectCalledWith("POST", "/v1/workflows/batch", {
        payload: { input: "hello" },
      });
    });

    it("invokes with empty options", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/workflows/batch",
          body: { ok: true },
        },
      ]);

      const result = await service.invoke("fn_abc123");
      expect(result).toEqual({ ok: true });
    });
  });

  describe("stats()", () => {
    it("retrieves invocation statistics", async () => {
      const statsData = {
        functionId: "fn_abc123",
        totalInvocations: 1000,
        errors: 5,
        averageDuration: 150.5,
        lastInvoked: "2024-06-15T12:00:00Z",
      };
      const { service } = createService([
        { method: "GET", path: "/v1/workflows", body: statsData },
      ]);

      const result = await service.stats("fn_abc123");

      expect(result.totalInvocations).toBe(1000);
      expect(result.averageDuration).toBe(150.5);
    });
  });

  describe("updateTriggers()", () => {
    it("updates trigger configuration", async () => {
      const updated = {
        ...functionEntry,
        trigger: { type: "cron", schedule: "0 * * * *" },
      };
      const { service, mock } = createService([
        { method: "PUT", path: "/v1/workflows", body: updated },
      ]);

      const result = await service.updateTriggers("fn_abc123", {
        type: "cron",
        schedule: "0 * * * *",
      });

      expect(result).toBeDefined();
      mock.expectCalledWith("PUT", "/v1/workflows", {
        operation: "functions.triggers.update",
      });
    });
  });
});

describe("Schema validation", () => {
  it("validates function config schema", () => {
    expect(() => functionConfigSchema.parse(validConfig)).not.toThrow();
  });

  it("rejects invalid runtime", () => {
    expect(() =>
      functionConfigSchema.parse({ ...validConfig, runtime: "ruby3" })
    ).toThrow();
  });

  it("rejects timeout out of range", () => {
    expect(() =>
      functionConfigSchema.parse({ ...validConfig, timeout: 1000 })
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => functionConfigSchema.parse({})).toThrow();
  });

  it("validates invoke options", () => {
    expect(() =>
      invokeOptionsSchema.parse({ payload: { key: "value" } })
    ).not.toThrow();
  });
});

describe("Functions (deprecated compat)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns APIResponse with data on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([functionEntry]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const fns = new Functions({
      apiKey: "frt_test-api-key-1234567890",
      baseUrl: "https://api.test.frontal.dev/v1",
    });
    const result = await fns.list();

    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
  });

  it("returns APIResponse with error on validation failure", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const fns = new Functions({
      apiKey: "frt_test-api-key-1234567890",
      baseUrl: "https://api.test.frontal.dev/v1",
    });
    const result = await fns.deploy(
      {} as unknown as Parameters<typeof fns.deploy>[0]
    );

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
  });
});

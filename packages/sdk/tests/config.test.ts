import { FrontalClient } from "@frontal-labs/core";
import { createTestClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import {
  createFrontalClient,
  Frontal,
  resolveSdkConfig,
  sdkConfigSchema,
} from "../src";
import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT } from "../src/constants";

const API_KEY = "frt_test_key_123";

describe("SdkConfig", () => {
  it("resolves defaults", () => {
    const cfg = resolveSdkConfig({ apiKey: API_KEY });
    expect(cfg.apiKey).toBe(API_KEY);
    expect(cfg.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(cfg.timeout).toBe(DEFAULT_TIMEOUT);
    expect(cfg.maxRetries).toBe(3);
    expect(cfg.headers).toEqual({});
    expect(cfg.debug).toBe(false);
  });

  it("maps env to environment", () => {
    const cfg = resolveSdkConfig({ apiKey: API_KEY, env: "test" });
    expect(cfg.environment).toBe("test");
  });

  it("rejects an API key without the frt_ prefix", () => {
    expect(() => resolveSdkConfig({ apiKey: "bad_key_123" })).toThrow(/frt_/);
  });

  it("re-exports the core config schema", () => {
    expect(sdkConfigSchema.safeParse({ apiKey: API_KEY }).success).toBe(true);
  });
});

describe("new Frontal(config)", () => {
  it("builds a FrontalClient from config", () => {
    const f = new Frontal({ apiKey: API_KEY, baseUrl: "https://x.test/v1" });
    expect(f.client).toBeInstanceOf(FrontalClient);
    expect(f.client.config.baseUrl).toBe("https://x.test/v1");
    expect(f.ai).toBeDefined();
  });

  it("accepts an existing FrontalClient", () => {
    const { client } = createTestClient();
    const f = new Frontal(client);
    expect(f.client).toBe(client);
  });

  it("createFrontalClient is equivalent", () => {
    const f = createFrontalClient({ apiKey: API_KEY });
    expect(f).toBeInstanceOf(Frontal);
  });

  it("uses a custom fetch", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const f = new Frontal({ apiKey: API_KEY, fetch: fetchImpl, maxRetries: 0 });
    await f.client.get("/ping").catch(() => undefined);
    expect(calls[0]).toContain("/ping");
  });
});

describe("entry points agree on defaults", () => {
  it("FrontalClient and Frontal resolve the same environment", () => {
    const direct = new FrontalClient({ apiKey: API_KEY });
    const unified = new Frontal({ apiKey: API_KEY });
    expect(direct.config.environment).toBe(unified.client.config.environment);
  });
});

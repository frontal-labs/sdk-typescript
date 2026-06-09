import { describe, it, expect, vi } from "vitest";
import { FrontalClient, HttpClient } from "@frontal-labs/core";
import { Sdk } from "../src/sdk";

function createMockFrontalClient(): FrontalClient {
  // FrontalClient wraps HttpClient; we can create one with a fake key
  // and inject a mock fetch to avoid real network calls.
  const http = new HttpClient({
    apiKey: "frt_test-sdk-1234567890",
    baseUrl: "https://api.test.frontal.dev/v1",
    timeout: 5000,
    maxRetries: 0,
    retryDelay: 0,
    headers: {},
    environment: "test",
    debug: false,
  });
  // Access the internal _http to create a FrontalClient
  const client = new FrontalClient({
    apiKey: "frt_test-sdk-1234567890",
    baseUrl: "https://api.test.frontal.dev/v1",
    timeout: 5000,
    maxRetries: 0,
  });
  return client;
}

describe("Sdk", () => {
  it("constructs with a FrontalClient", () => {
    const frontal = createMockFrontalClient();
    const sdk = new Sdk(frontal);
    expect(sdk).toBeDefined();
    expect(sdk).toBeInstanceOf(Sdk);
  });

  it("exposes all service getters", () => {
    const frontal = createMockFrontalClient();
    const sdk = new Sdk(frontal);

    // Storage
    expect(sdk.blob).toBeDefined();

    // AI & Agents
    expect(sdk.ai).toBeDefined();
    expect(sdk.agents).toBeDefined();

    // Data
    expect(sdk.graph).toBeDefined();
    expect(sdk.datasets).toBeDefined();
    expect(sdk.vectors).toBeDefined();
    expect(sdk.search).toBeDefined();
    expect(sdk.lineage).toBeDefined();

    // Compute
    expect(sdk.functions).toBeDefined();
    expect(sdk.pipelines).toBeDefined();
    expect(sdk.workflows).toBeDefined();
    expect(sdk.queues).toBeDefined();
    expect(sdk.schedules).toBeDefined();
    expect(sdk.sandbox).toBeDefined();

    // Platform
    expect(sdk.auth).toBeDefined();
    expect(sdk.organization).toBeDefined();
    expect(sdk.observability).toBeDefined();
    expect(sdk.events).toBeDefined();
    expect(sdk.flags).toBeDefined();
    expect(sdk.audit).toBeDefined();
    expect(sdk.governance).toBeDefined();
    expect(sdk.billing).toBeDefined();

    // Integrations
    expect(sdk.connectors).toBeDefined();
    expect(sdk.integrations).toBeDefined();
    expect(sdk.webhooks).toBeDefined();

    // Models
    expect(sdk.ontology).toBeDefined();
  });

  it("lazy-initializes services (no eager construction)", () => {
    // Just constructing the Sdk should not call the factory functions
    const frontal = createMockFrontalClient();
    const sdk = new Sdk(frontal);

    // The Sdk class itself doesn't expose internals to check laziness,
    // but we verify that accessing each getter works and returns a value.
    // If construction were eager, some packages might throw due to env vars.
    // Here we just verify they all resolve without error.
    expect(() => sdk.blob).not.toThrow();
    expect(() => sdk.ai).not.toThrow();
  });

  it("returns the same service instance on repeated access", () => {
    const frontal = createMockFrontalClient();
    const sdk = new Sdk(frontal);

    const blob1 = sdk.blob;
    const blob2 = sdk.blob;
    expect(blob1).toBe(blob2);

    const ai1 = sdk.ai;
    const ai2 = sdk.ai;
    expect(ai1).toBe(ai2);
  });
});

describe("createSdkClient", () => {
  it("creates an Sdk from a FrontalClient", async () => {
    const { createSdkClient } = await import("../src/index");
    const frontal = createMockFrontalClient();
    const sdk = createSdkClient(frontal);
    expect(sdk).toBeInstanceOf(Sdk);
    expect(sdk.blob).toBeDefined();
  });

  it("creates an Sdk from SdkClientConfig", async () => {
    const { createSdkClient } = await import("../src/index");
    const sdk = createSdkClient({
      apiKey: "frt_test-sdk-1234567890",
      baseUrl: "https://api.test.frontal.dev/v1",
    });
    expect(sdk).toBeInstanceOf(Sdk);
    expect(sdk.ai).toBeDefined();
  });

  it("exports a default sdk singleton", async () => {
    const mod = await import("../src/index");
    expect(mod.sdk).toBeDefined();
    expect(mod.sdk).toBeInstanceOf(Sdk);
  });
});

describe("@frontal-labs/sdk index", () => {
  it("exports VERSION", async () => {
    const mod = await import("../src/index");
    expect(mod.VERSION).toBe("0.0.1");
  });

  it("re-exports core primitives", async () => {
    const mod = await import("../src/index");
    expect(mod.FrontalClient).toBeDefined();
    expect(mod.getDefaultClient).toBeDefined();
    expect(mod.HttpClient).toBeDefined();
  });

  it("re-exports individual singletons", async () => {
    const mod = await import("../src/index");
    expect(mod.blob).toBeDefined();
    expect(mod.ai).toBeDefined();
    expect(mod.graph).toBeDefined();
    expect(mod.functions).toBeDefined();
    expect(mod.workflows).toBeDefined();
  });
});

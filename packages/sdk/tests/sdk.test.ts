import { createTestClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { Frontal } from "../src/sdk";

describe("Frontal", () => {
  it("constructs without throwing", () => {
    const { client } = createTestClient();
    const sdk = new Frontal(client);
    expect(sdk).toBeInstanceOf(Frontal);
  });

  it("provides lazy access to all service getters", () => {
    const { client } = createTestClient();
    const sdk = new Frontal(client);

    expect(sdk.blob).toBeDefined();
    expect(sdk.ai).toBeDefined();
    expect(sdk.agents).toBeDefined();
    expect(sdk.graph).toBeDefined();
    expect(sdk.datasets).toBeDefined();
    expect(sdk.data).toBeDefined();
    expect(sdk.lineage).toBeDefined();
    expect(sdk.workers).toBeDefined();
    expect(sdk.pipelines).toBeDefined();
    expect(sdk.workflows).toBeDefined();
    expect(sdk.schedules).toBeDefined();
    expect(sdk.sandbox).toBeDefined();
    expect(sdk.auth).toBeDefined();
    expect(sdk.observability).toBeDefined();
    expect(sdk.events).toBeDefined();
    expect(sdk.audit).toBeDefined();
    expect(sdk.governance).toBeDefined();
    expect(sdk.billing).toBeDefined();
    expect(sdk.connectors).toBeDefined();
    expect(sdk.integrations).toBeDefined();
    expect(sdk.webhooks).toBeDefined();
    expect(sdk.ontology).toBeDefined();
  });

  it("caches service instances", () => {
    const { client } = createTestClient();
    const sdk = new Frontal(client);

    const blob1 = sdk.blob;
    const blob2 = sdk.blob;
    expect(blob1).toBe(blob2);
  });
});

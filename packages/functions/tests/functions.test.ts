import { describe, it, expect } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import { FunctionsSdk } from "../src/sdk";

describe("FunctionsSdk", () => {
  it("should be instantiable", () => {
    const { http } = createTestHttpClient();
    const functions = new FunctionsSdk(http);
    expect(functions).toBeInstanceOf(FunctionsSdk);
  });

  it("should have the expected namespaces", () => {
    const { http } = createTestHttpClient();
    const functions = new FunctionsSdk(http);
    expect(functions.functions).toBeDefined();
    expect(functions.versions).toBeDefined();
    expect(functions.deployments).toBeDefined();
    expect(functions.executions).toBeDefined();
  });
});

import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { ai, blob, data, kv, ontology, telemetry } from "../src/capabilities";
import { createFunctionsClient } from "../src/client";
import { FunctionsSdk } from "../src/sdk";

const { http, mock } = createTestHttpClient(catchAllRoutes());
const sdk = new FunctionsSdk(http);

const endpoints: [string, () => Promise<unknown>, string, RegExp][] = [
  [
    "functions.create",
    () =>
      sdk.functions.create({
        name: "task",
        runtime: "nodejs22",
        handler: "index.handler",
      }),
    "POST",
    /\/functions$/,
  ],
  ["functions.list", () => sdk.functions.list(), "GET", /\/functions$/],
  [
    "functions.get",
    () => sdk.functions.get("fn_1"),
    "GET",
    /\/functions\/fn_1$/,
  ],
  [
    "functions.update",
    () =>
      sdk.functions.update("fn_1", {
        name: "task",
        runtime: "nodejs22",
        handler: "index.handler",
      }),
    "PATCH",
    /\/functions\/fn_1$/,
  ],
  [
    "functions.delete",
    () => sdk.functions.delete("fn_1"),
    "DELETE",
    /\/functions\/fn_1$/,
  ],
  [
    "executions.invoke",
    () => sdk.executions.invoke({ functionId: "fn_1" }),
    "POST",
    /\/functions\/invoke$/,
  ],
  [
    "executions.invokeAsync",
    () => sdk.executions.invokeAsync({ functionId: "fn_1" }),
    "POST",
    /\/functions\/invoke-async$/,
  ],
  [
    "executions.getExecution",
    () => sdk.executions.getExecution("exec_1"),
    "GET",
    /\/functions\/executions\/exec_1$/,
  ],
  [
    "executions.getResult",
    () => sdk.executions.getResult("exec_1"),
    "GET",
    /\/functions\/executions\/exec_1\/result$/,
  ],
  [
    "executions.list",
    () => sdk.executions.listExecutions(),
    "GET",
    /\/functions\/executions$/,
  ],
  [
    "executions.cancel",
    () => sdk.executions.cancelExecution("exec_1"),
    "POST",
    /\/functions\/executions\/exec_1\/cancel$/,
  ],
];

describe("FunctionsSdk endpoints", () => {
  it.each(endpoints)("%s → %s", async (_label, call, method, path) => {
    mock.reset();
    await call();
    const request = mock.requests.at(-1);
    expect(request?.method).toBe(method);
    expect(request?.path).toMatch(path);
  });

  it("builds and creates a function definition with capabilities", async () => {
    const builder = sdk
      .define("process-payment")
      .description("Process payment function")
      .runtime("nodejs22")
      .handler("payment.handler")
      .secret("STRIPE_SECRET_KEY")
      .capabilities(
        kv({
          namespace: "payments",
          keyPrefix: "ledger/",
          operations: ["read", "write"],
          budget: { timeout: "5s", maxCostUsd: 0.1 },
        }),
        blob({
          bucket: "receipts",
          objectPrefix: "pdfs/",
          operations: ["write"],
          budget: { timeout: "10s" },
        }),
        ai({
          modelIds: "@cf/meta/llama-3-8b-instruct",
          operations: ["chat"],
          budget: { maxTokens: 2000, maxCostUsd: 0.5 },
        }),
        ontology({
          resourceIds: "customer-profile",
          operations: ["read", "search"],
        })
      )
      .memory(256)
      .timeout(30);

    const definition = builder.toDefinition();
    expect(definition).toMatchObject({
      name: "process-payment",
      description: "Process payment function",
      runtime: "nodejs22",
      handler: "payment.handler",
      secrets: ["STRIPE_SECRET_KEY"],
      memory: 256,
      timeout: 30,
    });

    // Verify capabilities structure
    expect(definition.capabilities).toHaveLength(4);
    expect(definition.capabilities?.[0].name).toBe("kv");
    expect(definition.capabilities?.[0].kind).toHaveProperty("kv");
    expect(definition.capabilities?.[1].name).toBe("blob");
    expect(definition.capabilities?.[1].kind).toHaveProperty("blob");
    expect(definition.capabilities?.[2].name).toBe("ai");
    expect(definition.capabilities?.[2].kind).toHaveProperty("ai");
    expect(definition.capabilities?.[3].name).toBe("ontology");
    expect(definition.capabilities?.[3].kind).toHaveProperty("ontology");

    mock.reset();
    await builder.create();
    expect(mock.requests.at(-1)?.method).toBe("POST");
    expect(mock.requests.at(-1)?.path).toMatch(/\/functions$/);
  });

  it("builds capability builders with correct wire format", () => {
    const kvCap = kv({
      namespace: "test-ns",
      keyPrefix: "prefix/",
      operations: ["read"],
    });
    expect(kvCap).toMatchObject({
      name: "kv",
      kind: {
        kv: {
          namespace: "test-ns",
          keyPrefix: "prefix/",
          operations: ["GET", "LIST"],
        },
      },
    });

    const blobCap = blob({
      bucket: "test-bucket",
      operations: ["write"],
    });
    expect(blobCap).toMatchObject({
      name: "blob",
      kind: {
        blob: {
          bucket: "test-bucket",
          objectPrefix: "",
          operations: ["PUT", "DELETE"],
        },
      },
    });

    const aiCap = ai({
      modelIds: ["model1", "model2"],
      operations: ["chat", "embeddings"],
    });
    expect(aiCap).toMatchObject({
      name: "ai",
      kind: {
        ai: {
          modelIds: ["model1", "model2"],
          operations: ["CHAT", "EMBEDDINGS"],
        },
      },
    });

    const ontologyCap = ontology({
      resourceIds: "resource1",
      operations: ["read", "search"],
    });
    expect(ontologyCap).toMatchObject({
      name: "ontology",
      kind: {
        ontology: {
          resourceIds: ["resource1"],
          operations: ["READ", "SEARCH"],
        },
      },
    });

    const dataCap = data({
      surface: "catalog",
      resourceIds: ["r1"],
      operations: ["read", "query"],
    });
    expect(dataCap).toMatchObject({
      name: "data",
      kind: {
        data: {
          surface: "CATALOG",
          resourceIds: ["r1"],
          operations: ["READ", "QUERY"],
        },
      },
    });

    const telemetryCap = telemetry({ budget: { timeout: "30s" } });
    expect(telemetryCap).toMatchObject({
      name: "telemetry",
      kind: { telemetry: { operations: ["EMIT"] } },
      budget: { timeout: "30s" },
    });
  });
});

describe("createFunctionsClient", () => {
  it("creates a standalone client with defaults", () => {
    expect(createFunctionsClient({ apiKey: "frt_test_key" })).toBeInstanceOf(
      FunctionsSdk
    );
  });

  it("accepts an existing HTTP client", () => {
    expect(createFunctionsClient(http)).toBeInstanceOf(FunctionsSdk);
  });
});

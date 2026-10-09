import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
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
        entrypoint: "index.handler",
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
        entrypoint: "index.handler",
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
    "versions.list",
    () => sdk.versions.list("fn_1"),
    "GET",
    /\/functions\/fn_1\/versions$/,
  ],
  [
    "versions.get",
    () => sdk.versions.get("fn_1", 2),
    "GET",
    /\/functions\/fn_1\/versions\/2$/,
  ],
  [
    "versions.publish",
    () => sdk.versions.publish("fn_1", 2),
    "POST",
    /\/functions\/fn_1\/versions\/2\/publish$/,
  ],
  [
    "deployments.deploy",
    () => sdk.deployments.deploy("fn_1", 2),
    "POST",
    /\/functions\/fn_1\/versions\/2\/deploy$/,
  ],
  [
    "deployments.status",
    () => sdk.deployments.status("fn_1", 2),
    "GET",
    /\/functions\/fn_1\/versions\/2\/deployment\/status$/,
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

  it("builds and creates a function definition", async () => {
    const builder = sdk
      .define("task")
      .description("A task")
      .runtime("nodejs22")
      .entrypoint("index.handler")
      .source("blob://functions/task")
      .inputSchema({ type: "object" })
      .outputSchema({ type: "object" })
      .dependencies(["zod"])
      .envVars({ MODE: "test" })
      .secrets(["TOKEN"])
      .memory(256)
      .timeout(30)
      .permissions({ actions: ["read"] });

    expect(builder.toDefinition()).toMatchObject({
      name: "task",
      description: "A task",
      runtime: "nodejs22",
      entrypoint: "index.handler",
      source: "blob://functions/task",
      dependencies: ["zod"],
      envVars: { MODE: "test" },
      secrets: ["TOKEN"],
      memory: 256,
      timeout: 30,
      permissions: { actions: ["read"] },
    });

    mock.reset();
    await builder.create();
    expect(mock.requests.at(-1)?.method).toBe("POST");
    expect(mock.requests.at(-1)?.path).toMatch(/\/functions$/);
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

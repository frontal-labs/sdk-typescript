import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { AgentsSdk } from "../src/sdk";

const { http, mock } = createTestHttpClient(catchAllRoutes());
const sdk = new AgentsSdk(http);
const agent = sdk.use("agt_1");

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  ["list", () => sdk.list({ limit: 1 }), "GET", /\/agents$/],
  ["health", () => sdk.health(), "GET", /\/agents\/health$/],
  ["use.get", () => agent.get(), "GET", /\/agents\/agt_1$/],
  [
    "use.update",
    () => agent.update({ description: "d" }),
    "PUT",
    /\/agents\/agt_1$/,
  ],
  ["use.delete", () => agent.delete(), "DELETE", /\/agents\/agt_1$/],
  [
    "use.rollback",
    () => agent.rollback({ toVersion: 1 }),
    "POST",
    /\/agents\/agt_1\/rollback$/,
  ],
  ["use.versions", () => agent.versions(), "GET", /\/agents\/agt_1\/versions$/],
  ["use.runs", () => agent.runs(), "GET", /\/agents\/agt_1\/runs$/],
  ["use.run", () => agent.run("run_1"), "GET", /\/agents\/runs\/run_1$/],
  [
    "use.conversation",
    () => agent.conversation("run_1"),
    "GET",
    /\/agents\/runs\/run_1\/conversation$/,
  ],
  [
    "use.message",
    () => agent.message("evt", { a: 1 }),
    "POST",
    /\/agents\/agt_1\/runs$/,
  ],
];

describe("AgentsSdk endpoints", () => {
  it.each(cases)("%s → %s", async (_label, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });

  it("builder chain sets every field", () => {
    const def = sdk
      .define("full")
      .description("d")
      .trigger("e", { status: "open" })
      .scope({ read: ["a"] })
      .canRead("x")
      .canWrite("y")
      .canInvoke("z")
      .escalatesOn("c")
      .confidence({ autoExecuteAbove: 0.9, escalateBelow: 0.1 })
      .autoExecuteAbove(0.95)
      .escalateBelow(0.2)
      .memory({ type: "persistent" })
      .retry({ maxAttempts: 2 })
      .timeout("10s")
      .rateLimit({ maxConcurrent: 1 })
      .tags("t")
      .toJSON();
    expect(def).toMatchObject({
      name: "full",
      description: "d",
      triggers: [{ event: "e", filter: { status: "open" } }],
      timeout: "10s",
      tags: ["t"],
      memory: { type: "persistent" },
      rateLimit: { maxConcurrent: 1 },
    });
    expect(def.scope).toMatchObject({
      read: ["a", "x"],
      write: ["y"],
      actions: ["z"],
      escalate: ["c"],
    });
    expect(def.confidence).toMatchObject({
      autoExecuteAbove: 0.95,
      escalateBelow: 0.2,
    });
  });

  it("waitForCompletion polls until terminal", async () => {
    let n = 0;
    const { http: h } = createTestHttpClient([
      {
        method: "GET",
        path: "/agents/runs/run_1",
        handler: () =>
          Response.json({
            id: "run_1",
            status: ++n < 2 ? "running" : "completed",
          }),
      },
    ]);
    const done = await new AgentsSdk(h)
      .use("agt_1")
      .waitForCompletion("run_1", { interval: 1 });
    expect(done.status).toBe("completed");
    expect(n).toBe(2);
  });
});

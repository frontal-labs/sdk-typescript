import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { WorkflowsSdk } from "../src/sdk";

const { http, mock } = createTestHttpClient(
  catchAllRoutes({ status: "completed", data: [] })
);
const workflows = new WorkflowsSdk(http);
const wf = workflows.use("wf_1");

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  ["use.get", () => wf.get(), "GET", /workflows$/],
  ["use.update", () => wf.update({ name: "n" }), "PUT", /workflows$/],
  ["use.delete", () => wf.delete(), "DELETE", /workflows$/],
  ["use.activate", () => wf.activate(), "PATCH", /workflows$/],
  ["use.pause", () => wf.pause(), "PATCH", /workflows$/],
  [
    "use.executions",
    () => wf.executions({ limit: 1 }),
    "POST",
    /workflows\/search$/,
  ],
  [
    "use.execution",
    () => wf.execution("ex_1"),
    "GET",
    /workflows\/wf_1\/ex_1$/,
  ],
  [
    "use.executionSummary",
    () => wf.executionSummary("ex_1"),
    "GET",
    /workflows\/wf_1\/ex_1\/summary$/,
  ],
  ["use.trigger", () => wf.trigger({ a: 1 }), "POST", /workflows\/batch$/],
  [
    "approvals.list",
    () => workflows.approvals.list({ status: "pending" }),
    "GET",
    /workflows$/,
  ],
  [
    "approvals.get",
    () => workflows.approvals.get("apr_1"),
    "GET",
    /workflows$/,
  ],
  [
    "approvals.approve",
    () => workflows.approvals.approve("apr_1", "ok"),
    "POST",
    /workflows\/batch$/,
  ],
  [
    "approvals.reject",
    () => workflows.approvals.reject("apr_1"),
    "POST",
    /workflows\/batch$/,
  ],
  ["steps.list", () => workflows.steps.list(), "GET", /./],
  ["steps.get", () => workflows.steps.get("s"), "GET", /./],
  [
    "steps.create",
    () => workflows.steps.create({ id: "s", type: "task", name: "n" } as never),
    "POST",
    /./,
  ],
  [
    "steps.update",
    () => workflows.steps.update("s", { name: "m" } as never),
    "PUT",
    /./,
  ],
  ["steps.delete", () => workflows.steps.delete("s"), "DELETE", /./],
  ["templates.list", () => workflows.templates.list(), "GET", /workflows$/],
  ["templates.get", () => workflows.templates.get("t"), "GET", /workflows$/],
  ["templates.use", () => workflows.templates.use("t", "name"), "POST", /./],
];

describe("WorkflowsSdk accessors", () => {
  it.each(cases)("%s → %s", async (_l, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });

  it("waitForCompletion resolves on a terminal status", async () => {
    const done = await wf.waitForCompletion("ex_1", { interval: 1 });
    expect(done.status).toBe("completed");
  });

  it("builder covers every step and trigger helper", async () => {
    mock.reset();
    const created = await workflows
      .define("full")
      .description("d")
      .version("1.0.0")
      .variables({ a: 1 })
      .tags("t")
      .manual()
      .schedule("0 * * * *")
      .event("order.created", { filter: {} })
      .webhook("https://h.test")
      .task("t1", { fn: "x" })
      .approval("a1", ["ops"], { dependsOn: ["t1"] })
      .condition("c1", "x > 1", { dependsOn: ["a1"] })
      .parallel("p1", ["t1"], {})
      .delay("d1", "5m")
      .notification("n1", "hi", ["email"])
      .create();
    expect(created).toBeTruthy();
    const body = mock.requests.at(-1)?.body as {
      steps: Array<{ type: string }>;
    };
    expect(body.steps.map((s) => s.type)).toEqual([
      "task",
      "approval",
      "condition",
      "parallel",
      "delay",
      "notification",
    ]);
  });
});

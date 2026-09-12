import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { Installation } from "../src/installation";

const { http, mock } = createTestHttpClient(
  catchAllRoutes({
    id: "inst_1",
    connector_slug: "postgres",
    tenant_id: "t",
    dataset_namespace: "ns",
    display_name: "d",
    status: "active",
    config: {},
    auth: { mode: "none" },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    installation_id: "inst_1",
    trigger: "manual",
    started_at: "2026-01-01T00:00:00Z",
    cursor: null,
    runs: [],
    connection_tests: [],
  })
);

const installation = new Installation(
  http,
  "inst_1",
  "postgres",
  "t",
  "ns",
  "d",
  "active",
  {},
  { mode: "none" }
);

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  ["reload", () => installation.reload(), "GET", /inst_1$/],
  [
    "update",
    () => installation.update({ displayName: "x" }),
    "PATCH",
    /inst_1$/,
  ],
  ["remove", () => installation.remove(), "DELETE", /inst_1$/],
  ["pause", () => installation.pause(), "POST", /inst_1\/pause/],
  ["resume", () => installation.resume(), "POST", /inst_1\/resume/],
  ["sync.create", () => installation.sync.create(), "POST", /inst_1\/sync/],
  ["sync.list", () => installation.sync.list(), "GET", /inst_1\/sync/],
  ["sync.get", () => installation.sync.get("run_1"), "GET", /run_1$/],
  [
    "test.create",
    () => installation.test.create(),
    "POST",
    /inst_1\/(connection-)?test/,
  ],
  [
    "test.list",
    () => installation.test.list(),
    "GET",
    /inst_1\/(connection-)?test/,
  ],
  ["test.get", () => installation.test.get("ct_1"), "GET", /ct_1$/],
  [
    "checkpoint.get",
    () => installation.checkpoint.get(),
    "GET",
    /inst_1\/checkpoint/,
  ],
  [
    "checkpoint.reset",
    () => installation.checkpoint.reset(),
    "POST",
    /inst_1\/checkpoint/,
  ],
];

describe("Installation resource", () => {
  it.each(cases)("%s → %s", async (_l, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });

  it("toJSON returns the plain resource", () => {
    expect(installation.toJSON()).toMatchObject({
      id: "inst_1",
      connectorSlug: "postgres",
    });
  });
});

describe("Installation wait/toJSON branches", () => {
  const run = (status: string) => ({
    id: "run_1",
    installation_id: "inst_1",
    trigger: "manual",
    status,
    started_at: "2026-01-01T00:00:00Z",
  });
  const ct = (status: string) => ({
    id: "ct_1",
    installation_id: "inst_1",
    status,
    created_at: "2026-01-01T00:00:00Z",
  });

  it("sync.wait and test.wait poll to terminal statuses", async () => {
    let runs = 0;
    let tests = 0;
    const { http: h } = createTestHttpClient([
      { method: "POST", path: /inst_1\/sync/, body: run("queued") },
      {
        method: "GET",
        path: /run_1$/,
        handler: () => Response.json(run(++runs < 2 ? "running" : "succeeded")),
      },
      {
        method: "POST",
        path: /inst_1\/(connection-)?test/,
        body: ct("pending"),
      },
      {
        method: "GET",
        path: /ct_1$/,
        handler: () => Response.json(ct(++tests < 2 ? "running" : "failed")),
      },
    ]);
    const full = new Installation(
      h,
      "inst_1",
      "postgres",
      "t",
      "ns",
      "d",
      "active",
      {},
      { mode: "none" },
      "env_1",
      "2026-01-01T00:00:00Z",
      "2026-01-01T00:00:00Z"
    );
    expect(
      (
        await full.sync.wait(
          { trigger: "manual" },
          { interval: 1, timeout: 1000 }
        )
      ).status
    ).toBe("succeeded");
    expect(
      (await full.test.wait("actor", { interval: 1, timeout: 1000 })).status
    ).toBe("failed");
    expect(full.toJSON()).toMatchObject({
      environmentId: "env_1",
      createdAt: "2026-01-01T00:00:00Z",
    });
  });
});

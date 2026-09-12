import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { Integration } from "../src/integration";

const { http, mock } = createTestHttpClient(
  catchAllRoutes({
    id: "int_1",
    provider: "slack",
    tenant_id: "t",
    display_name: "d",
    status: "active",
    config: {},
    auth: { scheme: "bearer", secret_ref: "s" },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    version: 1,
    key: "k",
    enabled: true,
    surface: "chat",
    integration_id: "int_1",
    runs: [],
    action_runs: [],
    connection_tests: [],
    capabilities: [],
    surfaces: [],
    total: 0,
  })
);

const integration = new Integration(
  http,
  "int_1",
  "slack",
  "t",
  "d",
  "active",
  {},
  { scheme: "bearer", secretRef: "s" },
  1
);

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  ["reload", () => integration.reload(), "GET", /\/integrations\/int_1$/],
  [
    "update",
    () => integration.update({ displayName: "x" }),
    "PATCH",
    /\/integrations\/int_1$/,
  ],
  ["remove", () => integration.remove(), "DELETE", /\/integrations\/int_1$/],
  [
    "validate",
    () => integration.validate(),
    "POST",
    /\/integrations\/int_1\/validate/,
  ],
  [
    "rotateSecret",
    () => integration.rotateSecret("s2"),
    "POST",
    /\/integrations\/int_1/,
  ],
  [
    "metrics",
    () => integration.metrics(),
    "GET",
    /\/integrations\/int_1\/metrics/,
  ],
  [
    "run.create",
    () => integration.run.create({ action: "a", input: {} }),
    "POST",
    /\/integrations\/int_1\/(action-)?runs/,
  ],
  [
    "run.list",
    () => integration.run.list(),
    "GET",
    /\/integrations\/int_1\/(action-)?runs/,
  ],
  ["run.get", () => integration.run.get("run_1"), "GET", /run_1$/],
  [
    "test.create",
    () => integration.test.create("actor"),
    "POST",
    /\/integrations\/int_1\/(connection-)?tests?/,
  ],
  [
    "test.list",
    () => integration.test.list(),
    "GET",
    /\/integrations\/int_1\/(connection-)?tests?/,
  ],
  ["test.get", () => integration.test.get("ct_1"), "GET", /ct_1$/],
  [
    "capabilities.list",
    () => integration.capabilities.list(),
    "GET",
    /\/integrations\/int_1\/capabilities/,
  ],
  [
    "capabilities.enable",
    () => integration.capabilities.enable("k"),
    "PUT",
    /capabilities/,
  ],
  [
    "capabilities.disable",
    () => integration.capabilities.disable("k"),
    "PUT",
    /capabilities/,
  ],
  [
    "capabilities.bulkSet",
    () => integration.capabilities.bulkSet([{ key: "k", enabled: true }]),
    "PUT",
    /capabilities/,
  ],
  ["surfaces.list", () => integration.surfaces.list(), "GET", /surfaces/],
  [
    "surfaces.enable",
    () => integration.surfaces.enable("chat"),
    "PUT",
    /surfaces/,
  ],
  [
    "surfaces.disable",
    () => integration.surfaces.disable("chat"),
    "PUT",
    /surfaces/,
  ],
];

describe("Integration resource", () => {
  it.each(cases)("%s → %s", async (_l, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });

  it("toJSON returns the plain resource", () => {
    expect(integration.toJSON()).toMatchObject({
      id: "int_1",
      provider: "slack",
    });
  });
});

describe("Integration option branches", () => {
  it("run.create forwards optional fields and wait() polls to a terminal status", async () => {
    let gets = 0;
    const { http: h, mock: m } = createTestHttpClient([
      {
        method: "POST",
        path: /\/integrations\/int_1\/.*runs$/,
        body: {
          id: "run_1",
          integration_id: "int_1",
          action: "a",
          status: "queued",
          created_at: "2026-01-01T00:00:00Z",
        },
      },
      {
        method: "GET",
        path: /run_1$/,
        handler: () =>
          Response.json({
            id: "run_1",
            integration_id: "int_1",
            action: "a",
            status: ++gets < 2 ? "running" : "succeeded",
            created_at: "2026-01-01T00:00:00Z",
          }),
      },
      {
        method: "GET",
        path: /\/integrations\/int_1\/.*runs$/,
        body: { runs: [], action_runs: [], total: 0, next_cursor: "n" },
      },
    ]);
    const full = new Integration(
      h,
      "int_1",
      "slack",
      "t",
      "d",
      "active",
      {},
      { scheme: "bearer", secretRef: "s" },
      1,
      "env_1",
      "2026-01-01T00:00:00Z",
      "2026-01-01T00:00:00Z"
    );
    const run = await full.run.wait(
      "a",
      { x: 1 },
      {
        actorId: "u",
        idempotencyKey: "k",
        timeoutMs: 5,
        interval: 1,
        timeout: 1000,
      }
    );
    expect(run.status).toBe("succeeded");
    const body = m.requests[0]?.body as Record<string, unknown>;
    expect(body).toMatchObject({
      actorId: "u",
      idempotencyKey: "k",
      timeoutMs: 5,
    });
    const page = await full.run.list({ limit: 1 });
    expect(page.pagination.hasMore).toBe(true);
    expect(full.toJSON()).toMatchObject({
      environmentId: "env_1",
      createdAt: "2026-01-01T00:00:00Z",
    });
  });

  it("test.wait polls to a terminal status", async () => {
    let gets = 0;
    const { http: h } = createTestHttpClient([
      {
        method: "POST",
        path: /tests?$/,
        body: {
          id: "ct_1",
          integration_id: "int_1",
          status: "pending",
          created_at: "2026-01-01T00:00:00Z",
        },
      },
      {
        method: "GET",
        path: /ct_1$/,
        handler: () =>
          Response.json({
            id: "ct_1",
            integration_id: "int_1",
            status: ++gets < 2 ? "running" : "failed",
            created_at: "2026-01-01T00:00:00Z",
          }),
      },
    ]);
    const i = new Integration(
      h,
      "int_1",
      "slack",
      "t",
      "d",
      "active",
      {},
      { scheme: "bearer", secretRef: "s" },
      1
    );
    expect(
      (await i.test.wait("actor", { interval: 1, timeout: 1000 })).status
    ).toBe("failed");
  });
});

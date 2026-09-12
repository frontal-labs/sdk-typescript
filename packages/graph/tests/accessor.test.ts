import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { GraphSdk } from "../src/sdk";

const entity = {
  id: "ent_1",
  type: "user",
  fields: {},
  version: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
const { http, mock } = createTestHttpClient(
  catchAllRoutes({ ...entity, data: [entity] })
);
const graph = new GraphSdk(http);
const users = graph.use("user");

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  [
    "batch",
    () => graph.batch([{ op: "create", entityType: "user", fields: {} }]),
    "POST",
    /graph\/build$/,
  ],
  [
    "bulkRead",
    () => graph.bulkRead({ ids: ["a"], entityType: "user" }),
    "POST",
    /graph\/bulk-read$/,
  ],
  [
    "getRelationship",
    () => graph.getRelationship("rel_1"),
    "GET",
    /relationships\/rel_1$/,
  ],
  [
    "updateRelationship",
    () => graph.updateRelationship("rel_1", { w: 1 }),
    "PUT",
    /relationships\/rel_1$/,
  ],
  [
    "naturalLanguageQuery",
    () => graph.naturalLanguageQuery("who?"),
    "POST",
    /graph/,
  ],
  ["run", () => graph.run("run_1"), "GET", /runs\/run_1$/],
  ["use.get", () => users.get("ent_1"), "GET", /entities\/ent_1$/],
  ["use.create", () => users.create({ name: "n" }), "POST", /entities$/],
  [
    "use.update",
    () => users.update("ent_1", { name: "m" }),
    "PUT",
    /entities\/ent_1$/,
  ],
  ["use.delete", () => users.delete("ent_1"), "DELETE", /entities\/ent_1$/],
  ["use.list", () => users.list({ limit: 1 }), "GET", /entities$/],
  [
    "use.relationships",
    () => users.relationships("ent_1"),
    "GET",
    /entities\/ent_1\/provenance$/,
  ],
  [
    "use.addRelationship",
    () => users.addRelationship("ent_1", "ent_2", "knows", { w: 1 }),
    "POST",
    /entities\/ent_1\/provenance$/,
  ],
  [
    "use.removeRelationship",
    () => users.removeRelationship("ent_1", "rel_1"),
    "DELETE",
    /relationships\/rel_1$/,
  ],
  [
    "history.get",
    () => graph.history.get("ent_1", "user"),
    "GET",
    /entities\/ent_1\/provenance$/,
  ],
  [
    "history.revert",
    () => graph.history.revert("ent_1", "user", 1),
    "POST",
    /./,
  ],
];

describe("GraphSdk accessors", () => {
  it.each(cases)("%s → %s", async (_l, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });

  it("query builder composes a request and exposes helpers", async () => {
    mock.reset();
    const q = users
      .query()
      .where({ status: "active" })
      .include("orders")
      .orderBy("createdAt", "desc")
      .limit(5)
      .fields("id")
      .at("2026-01-01T00:00:00Z");
    const page = await q.execute();
    expect(page.data).toHaveLength(1);
    expect(await q.first()).toMatchObject({ id: "ent_1" });
    expect(await q.count()).toBe(0); // pagination.total from the mock
    expect(await q.exists()).toBe(true);
    expect(await q.all()).toHaveLength(1);
    const body = mock.requests[0]?.body as Record<string, unknown>;
    expect(body.entityType).toBe("user");
    expect(body.limit).toBe(5);
  });
});

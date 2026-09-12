import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { GraphSdk } from "../src/sdk";

// Generated endpoint-contract table: every public method must issue the
// expected HTTP method + path. Regenerate with scratchpad/gen-endpoint-tests.py
// when the SDK surface changes.
const { http, mock } = createTestHttpClient(catchAllRoutes());
const sdk = new GraphSdk(http);

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  [
    "sdk.query",
    () => sdk.query({ entityType: "user" }),
    "POST",
    /\/ontology\/graph\/graph\/query$/,
  ],
  [
    "sdk.naturalLanguageQuery",
    () => sdk.naturalLanguageQuery("r_1", {}),
    "POST",
    /\/ontology\/graph\/graph\/analyze$/,
  ],
  [
    "sdk.semanticSearch",
    () => sdk.semanticSearch({ query: "q" }),
    "POST",
    /\/ontology\/graph\/graph\/neighborhood$/,
  ],
  [
    "sdk.traverse",
    () => sdk.traverse({ startEntity: { id: "e", type: "user" } }),
    "POST",
    /\/ontology\/graph\/graph\/neighborhood$/,
  ],
  [
    "sdk.findPath",
    () =>
      sdk.findPath({
        fromEntity: { id: "a", type: "user" },
        toEntity: { id: "b", type: "user" },
      }),
    "POST",
    /\/ontology\/graph\/graph\/path$/,
  ],
  [
    "sdk.batch",
    () => sdk.batch({}, {}),
    "POST",
    /\/ontology\/graph\/graph\/build$/,
  ],
  [
    "sdk.bulkRead",
    () => sdk.bulkRead(["a"], {}),
    "POST",
    /\/ontology\/graph\/graph\/bulk-read$/,
  ],
  [
    "sdk.getRelationship",
    () => sdk.getRelationship("r_1"),
    "GET",
    /\/ontology\/graph\/relationships\/[^/]+$/,
  ],
  [
    "sdk.updateRelationship",
    () => sdk.updateRelationship("r_1", "r_1", {}),
    "PUT",
    /\/ontology\/graph\/relationships\/[^/]+$/,
  ],
  ["sdk.run", () => sdk.run("r_1"), "GET", /\/ontology\/graph\/runs\/[^/]+$/],
  [
    "sdk.capabilities",
    () => sdk.capabilities(),
    "GET",
    /\/ontology\/graph\/capabilities$/,
  ],
  ["sdk.health", () => sdk.health(), "GET", /\/ontology\/graph\/health$/],
  ["sdk.info", () => sdk.info(), "GET", /\/ontology\/graph\/info$/],
  [
    "sdk.history.get",
    () => sdk.history.get("r_1", "r_1"),
    "GET",
    /\/ontology\/graph\/entities\/[^/]+\/provenance$/,
  ],
  [
    "sdk.history.revert",
    () => sdk.history.revert("r_1", "r_1", 1),
    "POST",
    /\/ontology\/graph\/runs$/,
  ],
];

describe("GraphSdk endpoints", () => {
  it.each(cases)("%s → %s", async (_label, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });
});

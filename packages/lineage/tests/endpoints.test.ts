import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { LineageSdk } from "../src/sdk";

// Generated endpoint-contract table: every public method must issue the
// expected HTTP method + path. Regenerate with scratchpad/gen-endpoint-tests.py
// when the SDK surface changes.
const { http, mock } = createTestHttpClient(catchAllRoutes());
const sdk = new LineageSdk(http);

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  ["sdk.graph.get", () => sdk.graph.get("r_1", {}), "GET", /\/lineage\/graph$/],
  ["sdk.nodes.list", () => sdk.nodes.list({}), "GET", /\/lineage\/nodes$/],
  [
    "sdk.nodes.get",
    () => sdk.nodes.get("r_1"),
    "GET",
    /\/lineage\/nodes\/[^/]+$/,
  ],
  [
    "sdk.nodes.trace",
    () => sdk.nodes.trace("r_1"),
    "GET",
    /\/lineage\/nodes\/[^/]+\/trace$/,
  ],
  ["sdk.edges.list", () => sdk.edges.list({}), "GET", /\/lineage\/edges$/],
  [
    "sdk.edges.get",
    () => sdk.edges.get("r_1"),
    "GET",
    /\/lineage\/edges\/[^/]+$/,
  ],
  [
    "sdk.impact.analyzeChange",
    () => sdk.impact.analyzeChange("r_1", {}),
    "POST",
    /\/lineage\/impact$/,
  ],
];

describe("LineageSdk endpoints", () => {
  it.each(cases)("%s → %s", async (_label, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });
});

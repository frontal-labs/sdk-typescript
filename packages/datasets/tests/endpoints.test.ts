import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { DatasetsSdk } from "../src/sdk";

// Generated endpoint-contract table: every public method must issue the
// expected HTTP method + path. Regenerate with scratchpad/gen-endpoint-tests.py
// when the SDK surface changes.
const { http, mock } = createTestHttpClient(catchAllRoutes());
const sdk = new DatasetsSdk(http);

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  ["sdk.list", () => sdk.list({}), "GET", /\/data\/ingest\/datasets$/],
  ["sdk.get", () => sdk.get("r_1"), "GET", /\/data\/ingest\/datasets\/[^/]+$/],
  [
    "sdk.getArtifactContent",
    () => sdk.getArtifactContent("r_1", "r_1"),
    "GET",
    /\/data\/ingest\/datasets\/[^/]+\/artifacts\/[^/]+\/content$/,
  ],
  [
    "sdk.ingest",
    () => sdk.ingest({}, "r_1"),
    "POST",
    /\/data\/ingest\/datasets\/ingest$/,
  ],
  [
    "sdk.schemas.list",
    () => sdk.schemas.list({}),
    "GET",
    /\/data\/ingest\/schemas$/,
  ],
  [
    "sdk.schemas.get",
    () => sdk.schemas.get("r_1"),
    "GET",
    /\/data\/ingest\/schemas\/[^/]+$/,
  ],
  [
    "sdk.catalog.datasets.list",
    () => sdk.catalog.datasets.list({}),
    "GET",
    /\/data\/catalog\/catalog\/datasets$/,
  ],
  [
    "sdk.catalog.datasets.get",
    () => sdk.catalog.datasets.get("r_1"),
    "GET",
    /\/data\/catalog\/catalog\/datasets\/[^/]+$/,
  ],
  [
    "sdk.catalog.datasets.getArtifactContent",
    () => sdk.catalog.datasets.getArtifactContent("r_1", "r_1"),
    "GET",
    /\/data\/catalog\/catalog\/datasets\/[^/]+\/artifacts\/[^/]+\/content$/,
  ],
  [
    "sdk.catalog.sources.list",
    () => sdk.catalog.sources.list({}),
    "GET",
    /\/data\/catalog\/catalog\/sources$/,
  ],
  [
    "sdk.catalog.sources.get",
    () => sdk.catalog.sources.get("r_1"),
    "GET",
    /\/data\/catalog\/catalog\/sources\/[^/]+$/,
  ],
];

describe("DatasetsSdk endpoints", () => {
  it.each(cases)("%s → %s", async (_label, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });
});

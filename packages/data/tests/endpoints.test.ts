import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { DataSdk } from "../src/sdk";

const { http, mock } = createTestHttpClient(catchAllRoutes());
const data = new DataSdk(http);

type Case = [string, () => Promise<unknown>, string, string];

const crud = (
  name: keyof DataSdk,
  base: string,
  resource: string,
  action = "executions"
): Case[] => {
  const ns = data[name] as unknown as {
    list: (o?: object) => Promise<unknown>;
    create: (b: object) => Promise<unknown>;
    get: (id: string) => Promise<unknown>;
    execute: (id: string, b?: object) => Promise<unknown>;
    capabilities: () => Promise<unknown>;
    health: () => Promise<unknown>;
    info: () => Promise<unknown>;
    runs: (o?: object) => Promise<unknown>;
    createRun: (b: object) => Promise<unknown>;
    run: (id: string) => Promise<unknown>;
  };
  return [
    [`${name}.list`, () => ns.list({ limit: 1 }), "GET", `${base}/${resource}`],
    [
      `${name}.create`,
      () => ns.create({ name: "x" }),
      "POST",
      `${base}/${resource}`,
    ],
    [`${name}.get`, () => ns.get("r_1"), "GET", `${base}/${resource}/r_1`],
    [
      `${name}.execute`,
      () => ns.execute("r_1"),
      "POST",
      `${base}/${resource}/r_1/${action}`,
    ],
    [
      `${name}.capabilities`,
      () => ns.capabilities(),
      "GET",
      `${base}/capabilities`,
    ],
    [`${name}.health`, () => ns.health(), "GET", `${base}/health`],
    [`${name}.info`, () => ns.info(), "GET", `${base}/info`],
    [`${name}.runs`, () => ns.runs(), "GET", `${base}/runs`],
    [`${name}.createRun`, () => ns.createRun({}), "POST", `${base}/runs`],
    [`${name}.run`, () => ns.run("run_1"), "GET", `${base}/runs/run_1`],
  ];
};

const cases: Case[] = [
  ...crud("aggregations", "/data/aggregations", "aggregations"),
  ...crud("archival", "/data/archival", "archival/policies"),
  ...crud("enrichment", "/data/enrichment", "enrichment/profiles"),
  ...crud("exports", "/data/exports", "exports"),
  ...crud("normalization", "/data/normalization", "normalization/profiles"),
  ...crud("quality", "/data/quality", "quality/rulesets", "evaluations"),
  ...crud("serving", "/data/serving", "serving/products", "refreshes"),
  ...crud("streams", "/data/streams", "streams", "deliveries"),
  ...crud("sync", "/data/sync", "sync/jobs"),
  ...crud("transformations", "/data/transformations", "transformations"),
  [
    "query.federated",
    () => data.query.federated({ sql: "select 1" }),
    "POST",
    "/data/query/query/federated",
  ],
  ["schemas.list", () => data.schemas.list(), "GET", "/data/schemas/schemas"],
  [
    "schemas.create",
    () => data.schemas.create({}),
    "POST",
    "/data/schemas/schemas",
  ],
  [
    "schemas.resolve",
    () => data.schemas.resolve({}),
    "POST",
    "/data/schemas/schemas/resolve",
  ],
  [
    "schemas.get",
    () => data.schemas.get("ref"),
    "GET",
    "/data/schemas/schemas/ref",
  ],
];

describe("DataSdk endpoints", () => {
  it.each(cases)("%s → %s %s", async (_name, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path.endsWith(path)).toBe(true);
  });
});

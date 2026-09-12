import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { ObservabilitySdk } from "../src/sdk";

// Generated endpoint-contract table: every public method must issue the
// expected HTTP method + path. Regenerate with scratchpad/gen-endpoint-tests.py
// when the SDK surface changes.
const { http, mock } = createTestHttpClient(catchAllRoutes());
const sdk = new ObservabilitySdk(http);

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  [
    "sdk.logs.query",
    () => sdk.logs.query({}),
    "POST",
    /\/observability\/logs\/query$/,
  ],
  [
    "sdk.logs.ingest",
    () => sdk.logs.ingest({}, {}),
    "POST",
    /\/observability\/logs\/ingest$/,
  ],
  [
    "sdk.metrics.query",
    () => sdk.metrics.query("r_1", {}),
    "GET",
    /\/observability\/metrics$/,
  ],
  [
    "sdk.metrics.listMetrics",
    () => sdk.metrics.listMetrics({}),
    "GET",
    /\/observability\/metrics\/list$/,
  ],
  [
    "sdk.metrics.ingest",
    () => sdk.metrics.ingest({}, {}),
    "POST",
    /\/observability\/metrics\/ingest$/,
  ],
  [
    "sdk.traces.get",
    () => sdk.traces.get("r_1"),
    "GET",
    /\/observability\/traces\/[^/]+$/,
  ],
  [
    "sdk.traces.list",
    () => sdk.traces.list({}),
    "GET",
    /\/observability\/traces$/,
  ],
  [
    "sdk.traces.query",
    () => sdk.traces.query({}),
    "POST",
    /\/observability\/traces\/query$/,
  ],
  [
    "sdk.alerts.list",
    () => sdk.alerts.list({}),
    "GET",
    /\/observability\/alerts$/,
  ],
  [
    "sdk.alerts.create",
    () => sdk.alerts.create({}, {}),
    "POST",
    /\/observability\/alerts$/,
  ],
  [
    "sdk.alerts.update",
    () => sdk.alerts.update("r_1", {}),
    "PUT",
    /\/observability\/alerts\/[^/]+$/,
  ],
  [
    "sdk.alerts.delete",
    () => sdk.alerts.delete("r_1"),
    "DELETE",
    /\/observability\/alerts\/[^/]+$/,
  ],
  [
    "sdk.alerts.enable",
    () => sdk.alerts.enable("r_1"),
    "POST",
    /\/observability\/alerts\/[^/]+\/enable$/,
  ],
  [
    "sdk.alerts.disable",
    () => sdk.alerts.disable("r_1"),
    "POST",
    /\/observability\/alerts\/[^/]+\/disable$/,
  ],
  [
    "sdk.alerts.listIncidents",
    () => sdk.alerts.listIncidents({}),
    "GET",
    /\/observability\/alerts\/incidents$/,
  ],
  [
    "sdk.dashboards.list",
    () => sdk.dashboards.list(),
    "GET",
    /\/observability\/dashboards$/,
  ],
  [
    "sdk.dashboards.get",
    () => sdk.dashboards.get("r_1"),
    "GET",
    /\/observability\/dashboards\/[^/]+$/,
  ],
  [
    "sdk.dashboards.create",
    () => sdk.dashboards.create({}, {}),
    "POST",
    /\/observability\/dashboards$/,
  ],
  [
    "sdk.dashboards.update",
    () => sdk.dashboards.update("r_1", {}),
    "PUT",
    /\/observability\/dashboards\/[^/]+$/,
  ],
  [
    "sdk.dashboards.delete",
    () => sdk.dashboards.delete("r_1"),
    "DELETE",
    /\/observability\/dashboards\/[^/]+$/,
  ],
  [
    "sdk.dashboards.share",
    () => sdk.dashboards.share("r_1", {}),
    "POST",
    /\/observability\/dashboards\/[^/]+\/share$/,
  ],
  [
    "sdk.events.report",
    () => sdk.events.report("r_1", {}),
    "POST",
    /\/observability\/events$/,
  ],
  [
    "sdk.events.reportBatch",
    () => sdk.events.reportBatch("r_1", {}),
    "POST",
    /\/observability\/events\/batch$/,
  ],
  [
    "sdk.events.stats",
    () => sdk.events.stats({}),
    "GET",
    /\/observability\/events\/stats$/,
  ],
  [
    "sdk.events.logs.query",
    () => sdk.events.logs.query({}),
    "POST",
    /\/observability\/logs\/query$/,
  ],
  [
    "sdk.events.logs.ingest",
    () => sdk.events.logs.ingest({}, {}),
    "POST",
    /\/observability\/logs\/ingest$/,
  ],
  [
    "sdk.events.metrics.query",
    () => sdk.events.metrics.query("r_1", {}),
    "GET",
    /\/observability\/metrics$/,
  ],
  [
    "sdk.events.metrics.listMetrics",
    () => sdk.events.metrics.listMetrics({}),
    "GET",
    /\/observability\/metrics\/list$/,
  ],
  [
    "sdk.events.metrics.ingest",
    () => sdk.events.metrics.ingest({}, {}),
    "POST",
    /\/observability\/metrics\/ingest$/,
  ],
  [
    "sdk.events.traces.get",
    () => sdk.events.traces.get("r_1"),
    "GET",
    /\/observability\/traces\/[^/]+$/,
  ],
  [
    "sdk.events.traces.list",
    () => sdk.events.traces.list({}),
    "GET",
    /\/observability\/traces$/,
  ],
  [
    "sdk.events.traces.query",
    () => sdk.events.traces.query({}),
    "POST",
    /\/observability\/traces\/query$/,
  ],
];

describe("ObservabilitySdk endpoints", () => {
  it.each(cases)("%s → %s", async (_label, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });
});

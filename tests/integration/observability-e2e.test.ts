/**
 * Integration: Ingest log → query → create dashboard → verify.
 * End-to-end observability workflow.
 */
import { describe, expect, it } from "vitest";
import {
  createIntegrationHarness,
  integrationPage,
} from "@frontal-labs/testing";
import { ObservabilityService } from "@frontal-labs/observability";

const mockLog = {
  id: "log_1", timestamp: "2025-01-01T00:00:00Z",
  level: "error", service: "api", message: "Connection timeout",
};

const mockDashboard = {
  id: "dash_1", name: "API Health", widgets: [],
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
};

describe("Observability end-to-end", () => {
  it("ingest log → query → create dashboard widget", async () => {
    const harness = createIntegrationHarness([
      { method: "POST", path: "/v1/observability/logs/ingest", body: { ingested: 1 } },
      {
        method: "POST", path: "/v1/observability/logs/query",
        body: integrationPage([mockLog]),
      },
      {
        method: "POST", path: "/v1/observability/dashboards",
        body: mockDashboard,
      },
      {
        method: "POST", path: "/v1/observability/dashboards/dash_1/share",
        body: { share_url: "https://frontal.dev/share/dash_1" },
      },
    ]);

    const { http } = harness.createHttp();
    const obs = new ObservabilityService(http);

    // Step 1: Ingest a log
    const ingested = await obs.logs.ingest([{
      timestamp: "2025-01-01T00:00:00Z",
      level: "error",
      service: "api",
      message: "Connection timeout",
    }]);
    expect(ingested.ingested).toBe(1);

    // Step 2: Query logs
    const logs = await obs.logs.query({
      query: "level:error",
      timeFrom: "2025-01-01T00:00:00Z",
      timeTo: "2025-01-02T00:00:00Z",
    });
    expect(logs.data.length).toBeGreaterThan(0);
    expect(logs.data[0].level).toBe("error");

    // Step 3: Create dashboard
    const dash = await obs.dashboards.create({
      name: "API Health",
      widgets: [{
        id: "w1", type: "line", title: "Error Rate",
        metric: "error_rate", width: 12, height: 3,
      }],
    });
    expect(dash.name).toBe("API Health");

    // Step 4: Share dashboard
    const shared = await obs.dashboards.share(dash.id);
    expect(shared.shareUrl).toContain("share");
  });
});

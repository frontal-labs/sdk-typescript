import { createTestHttpClient } from "frontal/testing";
import { describe, expect, it } from "vitest";
import {
  AlertRuleSchema,
  createObservabilityClient,
  DashboardSchema,
  LogEntrySchema,
  ObservabilitySdk,
  TraceSchema,
} from "../src/index";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  const service = new ObservabilitySdk(http);
  return { service, mock };
}

function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

const mockLog: Record<string, unknown> = {
  id: "log_1",
  timestamp: "2025-01-01T00:00:00Z",
  level: "info",
  service: "test",
  message: "test log",
};

const mockTrace: Record<string, unknown> = {
  id: "trace_1",
  traceId: "trace_abc",
  name: "test span",
  service: "api",
  duration: 150,
  status: "ok",
  spans: [],
  startTime: "2025-01-01T00:00:00Z",
  endTime: "2025-01-01T00:00:01Z",
};

const mockAlert: Record<string, unknown> = {
  id: "alert_1",
  name: "High Error Rate",
  metric: "error_rate",
  condition: ">",
  threshold: 0.05,
  severity: "critical",
  duration: "5m",
  channels: ["email"],
  enabled: true,
  createdAt: "2025-01-01T00:00:00Z",
};

const mockDashboard: Record<string, unknown> = {
  id: "dash_1",
  name: "Overview",
  widgets: [],
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("ObservabilitySdk", () => {
  describe("logs", () => {
    it("queries logs (paginated)", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/observability/logs/query",
          body: pageWrap([mockLog]),
        },
      ]);
      const result = await service.logs.query({
        query: "*",
        timeFrom: "2025-01-01T00:00:00Z",
        timeTo: "2025-01-02T00:00:00Z",
      });
      expect(result.data).toHaveLength(1);
    });

    it("ingests logs", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/observability/logs/ingest",
          body: { ingested: 5 },
        },
      ]);
      const result = await service.logs.ingest([
        { timestamp: "", level: "info", service: "test", message: "" },
      ]);
      expect(result.ingested).toBe(5);
    });
  });

  describe("metrics", () => {
    it("queries metric series", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/observability/metrics",
          body: { metric: "cpu", data: [] },
        },
      ]);
      const result = await service.metrics.query("cpu", {
        from: "2025-01-01T00:00:00Z",
        to: "2025-01-02T00:00:00Z",
      });
      expect(result.metric).toBe("cpu");
    });
  });

  describe("traces", () => {
    it("gets a trace", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/observability/traces/trace_1",
          body: mockTrace,
        },
      ]);
      const result = await service.traces.get("trace_1");
      expect(result.id).toBe("trace_1");
    });

    it("lists traces (paginated)", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/observability/traces",
          body: pageWrap([mockTrace]),
        },
      ]);
      const result = await service.traces.list();
      expect(result.data).toHaveLength(1);
    });
  });

  describe("alerts", () => {
    it("creates an alert rule", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/observability/alerts",
          body: mockAlert,
        },
      ]);
      const result = await service.alerts.create(mockAlert as never);
      expect(result.name).toBe("High Error Rate");
    });

    it("enables an alert", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/observability/alerts/alert_1/enable",
          body: mockAlert,
        },
      ]);
      const result = await service.alerts.enable("alert_1");
      expect(result.id).toBe("alert_1");
    });

    it("disables an alert", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/observability/alerts/alert_1/disable",
          body: mockAlert,
        },
      ]);
      const result = await service.alerts.disable("alert_1");
      expect(result.id).toBe("alert_1");
    });
  });

  describe("dashboards", () => {
    it("lists dashboards", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/observability/dashboards",
          body: { data: [mockDashboard] },
        },
      ]);
      const result = await service.dashboards.list();
      expect(result.data).toHaveLength(1);
    });

    it("shares a dashboard", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/observability/dashboards/dash_1/share",
          body: { share_url: "https://frontal.dev/dash/shared/dash_1" },
        },
      ]);
      const result = await service.dashboards.share("dash_1");
      expect(result.shareUrl).toBeDefined();
    });
  });
});

describe("Schemas validation", () => {
  it("validates LogEntry schema", () => {
    expect(LogEntrySchema.safeParse(mockLog).success).toBe(true);
  });

  it("validates Trace schema", () => {
    expect(TraceSchema.safeParse(mockTrace).success).toBe(true);
  });

  it("validates AlertRule schema", () => {
    expect(AlertRuleSchema.safeParse(mockAlert).success).toBe(true);
  });

  it("validates Dashboard schema", () => {
    expect(DashboardSchema.safeParse(mockDashboard).success).toBe(true);
  });
});

describe("events", () => {
  it("reports a single event, a batch, and reads stats", async () => {
    const { http, mock } = createTestHttpClient([
      { method: "POST", path: "/observability/events", body: { id: "ev_1" } },
      {
        method: "POST",
        path: "/observability/events/batch",
        body: { accepted: 2 },
      },
      {
        method: "GET",
        path: "/observability/events/stats",
        body: { count: 10 },
      },
    ]);
    const service = new ObservabilitySdk(http);
    await service.events.report({ type: "deploy" });
    await service.events.reportBatch([{ type: "a" }, { type: "b" }]);
    const stats = await service.events.stats();
    expect(stats.count).toBe(10);
    mock.expectCalled("POST", "/observability/events");
    mock.expectCalled("POST", "/observability/events/batch");
    mock.expectCalled("GET", "/observability/events/stats");
  });
});

describe("createObservabilityClient factory", () => {
  it("creates client from config", () => {
    const client = createObservabilityClient({
      apiKey: "frt_test-key-1234567890",
    });
    expect(client).toBeInstanceOf(ObservabilitySdk);
  });
});

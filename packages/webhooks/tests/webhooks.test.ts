import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  WebhooksService,
  createWebhooksClient,
  WebhookSchema,
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
  return { service: new WebhooksService(http), mock };
}

const mockWebhook = {
  id: "wh_1",
  url: "https://hooks.example.com",
  events: ["order.created"],
  status: "active",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

describe("WebhooksService", () => {
  it("lists endpoints (paginated)", async () => {
    const { service } = createService([
      { method: "GET", path: "/v1/webhooks", body: pageWrap([mockWebhook]) },
    ]);
    const result = await service.endpoints.list();
    expect(result.data).toHaveLength(1);
  });
  it("creates an endpoint", async () => {
    const { service } = createService([
      { method: "POST", path: "/v1/webhooks", body: mockWebhook },
    ]);
    const result = await service.endpoints.create({
      url: "https://hooks.example.com",
      events: ["order.created"],
    });
    expect(result.id).toBe("wh_1");
  });
  it("rotates secret", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/webhooks/wh_1/rotate-secret",
        body: { secret: "new_secret" },
      },
    ]);
    const result = await service.endpoints.rotateSecret("wh_1");
    expect(result.secret).toBe("new_secret");
  });
  it("retries a delivery", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/webhooks/deliveries/dlv_1/retry",
        body: { id: "dlv_1", status: "success" },
      },
    ]);
    const result = await service.deliveries.retry("dlv_1");
    expect(result.status).toBe("success");
  });
  it("gets stats", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/v1/webhooks/stats",
        body: {
          total_deliveries: 100,
          success_rate: 0.98,
          avg_latency_ms: 42,
          error_rate: 0.02,
        },
      },
    ]);
    const result = await service.stats.get();
    expect(result.successRate).toBe(0.98);
  });
});

describe("Schemas", () => {
  it("validates Webhook", () => {
    expect(WebhookSchema.safeParse(mockWebhook).success).toBe(true);
  });
});

describe("createWebhooksClient", () => {
  it("creates client", () => {
    expect(createWebhooksClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      WebhooksService
    );
  });
});

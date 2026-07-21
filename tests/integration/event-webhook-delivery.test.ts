/**
 * Integration: Create webhook endpoint → publish event → delivery recorded.
 * Verifies the event → webhook delivery pipeline.
 */
import { describe, expect, it } from "vitest";
import {
  createIntegrationHarness,
  integrationPage,
} from "@frontal-labs/testing";
import { EventsSdk as EventsService } from "@frontal-labs/events";
import { WebhooksSdk as WebhooksService } from "@frontal-labs/webhooks";

const mockTopic = {
  id: "tpc_1", name: "orders.created", event_count: 0,
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
};

const mockWebhook = {
  id: "wh_1", url: "https://hooks.example.com", events: ["order.created"],
  status: "active", created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const mockDelivery = {
  id: "dlv_1", webhook_id: "wh_1", event_id: "evt_1",
  status: "success", status_code: 200, duration_ms: 42,
  attempted_at: "2025-01-01T00:00:00Z",
};

describe("Events → Webhooks integration delivery", () => {
  it("publish event → webhook delivery recorded", async () => {
    const harness = createIntegrationHarness([
      { method: "POST", path: "/v1/events/topics", body: mockTopic },
      { method: "POST", path: "/v1/webhooks", body: mockWebhook },
      {
        method: "POST", path: "/v1/events/publish",
        body: { published: 1, event_ids: ["evt_1"] },
      },
      {
        method: "GET", path: "/v1/webhooks/deliveries",
        body: integrationPage([mockDelivery]),
      },
    ]);

    const { http: eventsHttp } = harness.createHttp();
    const { http: webhooksHttp } = harness.createHttp();

    const events = new EventsService(eventsHttp);
    const webhooks = new WebhooksService(webhooksHttp);

    // Step 1: Create topic and webhook endpoint
    const topic = await events.topics.create({ name: "orders.created" });
    const wh = await webhooks.endpoints.create({
      url: "https://hooks.example.com",
      events: ["order.created"],
    });
    expect(topic.name).toBe("orders.created");
    expect(wh.id).toBe("wh_1");

    // Step 2: Publish event
    const pub = await events.publish("orders.created", [{
      source: "orders", type: "order.created", data: { order_id: "ord_1" },
    }]);
    expect(pub.published).toBe(1);

    // Step 3: Verify delivery was recorded
    const deliveries = await webhooks.deliveries.list({ webhookId: "wh_1" });
    expect(deliveries.data.length).toBeGreaterThan(0);
    expect(deliveries.data[0].webhookId).toBe("wh_1");
  });
});

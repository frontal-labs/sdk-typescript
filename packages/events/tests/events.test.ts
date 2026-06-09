import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  EventsService,
  createEventsClient,
  EventSchema,
  TopicSchema,
  SubscriptionSchema,
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
  const service = new EventsService(http);
  return { service, mock };
}

function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

const mockTopic: Record<string, unknown> = {
  id: "tpc_1",
  name: "orders.created",
  eventCount: 42,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const mockSub: Record<string, unknown> = {
  id: "sub_1",
  topicId: "tpc_1",
  name: "Order Processor",
  endpoint: "https://hooks.example.com/orders",
  status: "active",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const mockEvent: Record<string, unknown> = {
  id: "evt_1",
  source: "frontal.orders",
  type: "order.created",
  data: { order_id: "ord_1" },
  metadata: { timestamp: "2025-01-01T00:00:00Z" },
};

describe("EventsService", () => {
  describe("publish / subscribe", () => {
    it("publishes events", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/events/topics/orders.created/publish",
          body: { published: 2, event_ids: ["evt_1", "evt_2"] },
        },
      ]);
      const result = await service.publish("orders.created", [
        { source: "test", type: "test.event", data: {} },
      ]);
      expect(result.published).toBe(2);
      mock.expectCalled("POST", "/events/topics/orders.created/publish");
    });

    it("subscribes to topic", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/events/topics/orders.created/subscribe",
          body: mockSub,
        },
      ]);
      const result = await service.subscribe("orders.created", {
        endpoint: "https://hooks.example.com/orders",
      });
      expect(result.id).toBe("sub_1");
    });

    it("unsubscribes", async () => {
      const { service, mock } = createService([
        {
          method: "DELETE",
          path: "/events/subscriptions/sub_1",
          status: 204,
        },
      ]);
      await service.unsubscribe("sub_1");
      mock.expectCalled("DELETE", "/events/subscriptions/sub_1");
    });
  });

  describe("topics", () => {
    it("lists topics (paginated)", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/events/topics",
          body: pageWrap([mockTopic]),
        },
      ]);
      const result = await service.topics.list();
      expect(result.data).toHaveLength(1);
    });

    it("creates a topic", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/events/topics",
          body: mockTopic,
        },
      ]);
      const result = await service.topics.create({
        name: "orders.created",
      });
      expect(result.name).toBe("orders.created");
    });
  });

  describe("subscriptions", () => {
    it("pauses a subscription", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/events/subscriptions/sub_1/pause",
          body: { ...mockSub, status: "paused" },
        },
      ]);
      const result = await service.subscriptions.pause("sub_1");
      expect(result.status).toBe("paused");
    });

    it("resumes a subscription", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/events/subscriptions/sub_1/resume",
          body: mockSub,
        },
      ]);
      const result = await service.subscriptions.resume("sub_1");
      expect(result.status).toBe("active");
    });
  });

  describe("dead letter", () => {
    it("replays a dead-letter event", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/events/dead-letter/evt_dlq_1/replay",
          status: 204,
        },
      ]);
      await service.deadLetter.replay("evt_dlq_1");
      mock.expectCalled("POST", "/events/dead-letter/evt_dlq_1/replay");
    });

    it("purges dead-letter queue", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/events/dead-letter/purge",
          status: 204,
        },
      ]);
      await service.deadLetter.purge();
      mock.expectCalled("POST", "/events/dead-letter/purge");
    });
  });
});

describe("Schemas validation", () => {
  it("validates Event schema", () => {
    expect(EventSchema.safeParse(mockEvent).success).toBe(true);
  });

  it("validates Topic schema", () => {
    expect(TopicSchema.safeParse(mockTopic).success).toBe(true);
  });

  it("validates Subscription schema", () => {
    expect(SubscriptionSchema.safeParse(mockSub).success).toBe(true);
  });
});

describe("createEventsClient factory", () => {
  it("creates client from config", () => {
    const client = createEventsClient({
      apiKey: "frt_test-key-1234567890",
    });
    expect(client).toBeInstanceOf(EventsService);
  });
});

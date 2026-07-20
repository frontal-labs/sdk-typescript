import { createTestHttpClient } from "frontal/testing";
import { describe, expect, it } from "vitest";
import {
  createEventsClient,
  EventSchema,
  EventsService,
  SubscriptionSchema,
  TopicSchema,
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
    it("publishes events to /events/publish with the topic in the body", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/events/publish",
          body: { published: 2, event_ids: ["evt_1", "evt_2"] },
        },
      ]);
      const result = await service.publish("orders.created", [
        { source: "test", type: "test.event", data: {} },
      ]);
      expect(result.published).toBe(2);
      mock.expectCalledWith("POST", "/events/publish", {
        topic: "orders.created",
      });
    });

    it("subscribes via POST /events/subscriptions", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/events/subscriptions",
          body: mockSub,
        },
      ]);
      const result = await service.subscribe("orders.created", {
        endpoint: "https://hooks.example.com/orders",
      });
      expect(result.id).toBe("sub_1");
      mock.expectCalledWith("POST", "/events/subscriptions", {
        topic: "orders.created",
        endpoint: "https://hooks.example.com/orders",
      });
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

  describe("replays", () => {
    it("creates a replay via /events/replays", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/events/replays",
          body: { id: "rep_1", status: "queued" },
        },
      ]);
      const replay = await service.replays.create({ topic: "orders.created" });
      expect(replay.id).toBe("rep_1");
      mock.expectCalled("POST", "/events/replays");
    });

    it("lists replays", async () => {
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/events/replays",
          body: {
            data: [{ id: "rep_1" }],
            pagination: { cursor: null, hasMore: false, total: 1 },
          },
        },
      ]);
      const res = await service.replays.list();
      expect(res.data).toHaveLength(1);
      mock.expectCalled("GET", "/events/replays");
    });
  });

  describe("consumers/routes/buses", () => {
    it("lists consumers, consumer-groups, and routes at their real paths", async () => {
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/events/consumers",
          body: { data: [], pagination: { cursor: null, hasMore: false } },
        },
        {
          method: "GET",
          path: "/events/consumer-groups",
          body: { data: [], pagination: { cursor: null, hasMore: false } },
        },
        {
          method: "GET",
          path: "/events/routes",
          body: { data: [], pagination: { cursor: null, hasMore: false } },
        },
      ]);
      await service.consumers.list();
      await service.consumerGroups.list();
      await service.routes.list();
      mock.expectCalled("GET", "/events/consumers");
      mock.expectCalled("GET", "/events/consumer-groups");
      mock.expectCalled("GET", "/events/routes");
    });
  });

  describe("schema validate", () => {
    it("validates against /events/schemas/validate with schemaId in the body", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/events/schemas/validate",
          body: { valid: true },
        },
      ]);
      const res = await service.schemas.validate("evt.type", { a: 1 });
      expect(res.valid).toBe(true);
      mock.expectCalledWith("POST", "/events/schemas/validate", {
        schemaId: "evt.type",
      });
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

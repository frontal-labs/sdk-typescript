import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type {
  DeadLetterEvent,
  EventType,
  PublishEvent,
  Subscription,
  Topic,
} from "./schemas";

// ── Topics ─────────────────────────────────────────────────────────

export class TopicsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Topic>> {
    const raw = await this.http.get("/events/topics", opts);
    return createPageResult(asPagePayload<Topic>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: { name: string; description?: string }): Promise<Topic> {
    return this.http.post("/events/topics", input);
  }

  async get(id: string): Promise<Topic> {
    return this.http.get(`/events/topics/${id}`);
  }

  async update(
    id: string,
    input: { name?: string; description?: string }
  ): Promise<Topic> {
    return this.http.put(`/events/topics/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/events/topics/${id}`);
  }
}

// ── Subscriptions ──────────────────────────────────────────────────

export class SubscriptionsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Subscription>> {
    const raw = await this.http.get("/events/subscriptions", opts);
    return createPageResult(asPagePayload<Subscription>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async get(id: string): Promise<Subscription> {
    return this.http.get(`/events/subscriptions/${id}`);
  }

  async update(id: string, input: { filter?: string }): Promise<Subscription> {
    return this.http.put(`/events/subscriptions/${id}`, input);
  }

  async pause(id: string): Promise<Subscription> {
    return this.http.post(`/events/subscriptions/${id}/pause`, {});
  }

  async resume(id: string): Promise<Subscription> {
    return this.http.post(`/events/subscriptions/${id}/resume`, {});
  }
}

// ── Dead Letter ────────────────────────────────────────────────────

export class DeadLetterNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<DeadLetterEvent>> {
    const raw = await this.http.get("/events/dead-letter", opts);
    return createPageResult(asPagePayload<DeadLetterEvent>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async get(id: string): Promise<DeadLetterEvent> {
    return this.http.get(`/events/dead-letter/${id}`);
  }

  async replay(id: string): Promise<void> {
    return this.http.post(`/events/dead-letter/${id}/replay`, {});
  }

  async purge(): Promise<void> {
    return this.http.post("/events/dead-letter/purge", {});
  }
}

// ── Event Schemas ──────────────────────────────────────────────────

export class EventSchemasNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<{ data: EventType[] }> {
    return this.http.get("/events/schemas");
  }

  async get(id: string): Promise<EventType> {
    return this.http.get(`/events/schemas/${id}`);
  }

  async create(input: {
    name: string;
    version: string;
    schema: Record<string, unknown>;
  }): Promise<EventType> {
    return this.http.post("/events/schemas", input);
  }

  async update(
    id: string,
    input: { schema?: Record<string, unknown>; description?: string }
  ): Promise<EventType> {
    return this.http.put(`/events/schemas/${id}`, input);
  }

  async validate(
    schemaId: string,
    data: Record<string, unknown>
  ): Promise<{
    valid: boolean;
    errors?: { field: string; message: string }[];
  }> {
    return this.http.post(`/events/schemas/${schemaId}/validate`, { data });
  }
}

// ── Service ────────────────────────────────────────────────────────

export class EventsService {
  readonly topics: TopicsNamespace;
  readonly subscriptions: SubscriptionsNamespace;
  readonly deadLetter: DeadLetterNamespace;
  readonly schemas: EventSchemasNamespace;

  constructor(private readonly http: HttpClient) {
    this.topics = new TopicsNamespace(http);
    this.subscriptions = new SubscriptionsNamespace(http);
    this.deadLetter = new DeadLetterNamespace(http);
    this.schemas = new EventSchemasNamespace(http);
  }

  async publish(
    topic: string,
    events: PublishEvent[]
  ): Promise<{ published: number; event_ids: string[] }> {
    return this.http.post(`/events/topics/${topic}/publish`, { events });
  }

  async subscribe(
    topic: string,
    config: { endpoint: string; filter?: string }
  ): Promise<Subscription> {
    return this.http.post(`/events/topics/${topic}/subscribe`, config);
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    return this.http.delete(`/events/subscriptions/${subscriptionId}`);
  }
}

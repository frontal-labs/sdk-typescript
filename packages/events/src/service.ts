import {
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

const asPagePayload = <T>(
  raw: unknown
): {
  data: T[];
  pagination: PaginationMeta;
  meta?: unknown;
} =>
  raw as {
    data: T[];
    pagination: PaginationMeta;
    meta?: unknown;
  };

// ── Topics ─────────────────────────────────────────────────────────

export class TopicsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Topic>> {
    const raw = await this.http.get("/v1/events/topics", opts);
    return createPageResult(asPagePayload<Topic>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: { name: string; description?: string }): Promise<Topic> {
    return this.http.post("/v1/events/topics", input);
  }

  async get(id: string): Promise<Topic> {
    return this.http.get(`/v1/events/topics/${id}`);
  }

  async update(
    id: string,
    input: { name?: string; description?: string }
  ): Promise<Topic> {
    return this.http.put(`/v1/events/topics/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/events/topics/${id}`);
  }
}

// ── Subscriptions ──────────────────────────────────────────────────

export class SubscriptionsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Subscription>> {
    const raw = await this.http.get("/v1/events/subscriptions", opts);
    return createPageResult(asPagePayload<Subscription>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async get(id: string): Promise<Subscription> {
    return this.http.get(`/v1/events/subscriptions/${id}`);
  }

  async update(id: string, input: { filter?: string }): Promise<Subscription> {
    return this.http.put(`/v1/events/subscriptions/${id}`, input);
  }

  async pause(id: string): Promise<Subscription> {
    return this.http.post(`/v1/events/subscriptions/${id}/pause`, {});
  }

  async resume(id: string): Promise<Subscription> {
    return this.http.post(`/v1/events/subscriptions/${id}/resume`, {});
  }
}

// ── Dead Letter ────────────────────────────────────────────────────

export class DeadLetterNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<DeadLetterEvent>> {
    const raw = await this.http.get("/v1/events/dead-letter", opts);
    return createPageResult(asPagePayload<DeadLetterEvent>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async get(id: string): Promise<DeadLetterEvent> {
    return this.http.get(`/v1/events/dead-letter/${id}`);
  }

  async replay(id: string): Promise<void> {
    return this.http.post(`/v1/events/dead-letter/${id}/replay`, {});
  }

  async purge(): Promise<void> {
    return this.http.post("/v1/events/dead-letter/purge", {});
  }
}

// ── Event Schemas ──────────────────────────────────────────────────

export class EventSchemasNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<{ data: EventType[] }> {
    return this.http.get("/v1/events/schemas");
  }

  async get(id: string): Promise<EventType> {
    return this.http.get(`/v1/events/schemas/${id}`);
  }

  async create(input: {
    name: string;
    version: string;
    schema: Record<string, unknown>;
  }): Promise<EventType> {
    return this.http.post("/v1/events/schemas", input);
  }

  async update(
    id: string,
    input: { schema?: Record<string, unknown>; description?: string }
  ): Promise<EventType> {
    return this.http.put(`/v1/events/schemas/${id}`, input);
  }

  async validate(
    schemaId: string,
    data: Record<string, unknown>
  ): Promise<{
    valid: boolean;
    errors?: Array<{ field: string; message: string }>;
  }> {
    return this.http.post(`/v1/events/schemas/${schemaId}/validate`, { data });
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
    return this.http.post(`/v1/events/topics/${topic}/publish`, { events });
  }

  async subscribe(
    topic: string,
    config: { endpoint: string; filter?: string }
  ): Promise<Subscription> {
    return this.http.post(`/v1/events/topics/${topic}/subscribe`, config);
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    return this.http.delete(`/v1/events/subscriptions/${subscriptionId}`);
  }
}

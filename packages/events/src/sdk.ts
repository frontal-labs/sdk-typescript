import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";
import type { EventType, PublishEvent, Subscription, Topic } from "./schemas";

type Obj = Record<string, unknown>;
interface ListOpts {
  limit?: number;
  cursor?: string;
  [key: string]: unknown;
}

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

  async create(input: {
    topic: string;
    endpoint: string;
    filter?: string;
  }): Promise<Subscription> {
    return this.http.post("/events/subscriptions", input);
  }

  async get(id: string): Promise<Subscription> {
    return this.http.get(`/events/subscriptions/${id}`);
  }

  async update(id: string, input: { filter?: string }): Promise<Subscription> {
    return this.http.put(`/events/subscriptions/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/events/subscriptions/${id}`);
  }

  async pause(id: string): Promise<Subscription> {
    return this.http.post(`/events/subscriptions/${id}/pause`, {});
  }

  async resume(id: string): Promise<Subscription> {
    return this.http.post(`/events/subscriptions/${id}/resume`, {});
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

  /**
   * Validate a payload against a registered schema. The backend exposes a
   * single validation endpoint (`/events/schemas/validate`); the schema is
   * selected via the request body.
   */
  async validate(
    schemaId: string,
    data: Record<string, unknown>
  ): Promise<{
    valid: boolean;
    errors?: { field: string; message: string }[];
  }> {
    return this.http.post("/events/schemas/validate", { schemaId, data });
  }
}

/**
 * Generic list/create/get namespace for the events platform's flat resource
 * collections (`/events/<resource>`).
 */
export class EventResourceNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly path: string
  ) {}

  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get(this.path, opts);
    return createPageResult(asPagePayload<Obj>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  create(input: Obj): Promise<Obj> {
    return this.http.post(this.path, input);
  }
  get(id: string): Promise<Obj> {
    return this.http.get(`${this.path}/${id}`);
  }
}

// ── Service ────────────────────────────────────────────────────────

export class EventsSdk {
  readonly topics: TopicsNamespace;
  readonly subscriptions: SubscriptionsNamespace;
  readonly schemas: EventSchemasNamespace;
  /** Replay previously-published (e.g. failed) events. */
  readonly replays: EventResourceNamespace;
  readonly consumers: EventResourceNamespace;
  readonly consumerGroups: EventResourceNamespace;
  readonly routes: EventResourceNamespace;
  readonly buses: EventResourceNamespace;
  readonly archives: EventResourceNamespace;
  readonly retentionPolicies: EventResourceNamespace;
  readonly policies: EventResourceNamespace;

  constructor(private readonly http: HttpClient) {
    this.topics = new TopicsNamespace(http);
    this.subscriptions = new SubscriptionsNamespace(http);
    this.schemas = new EventSchemasNamespace(http);
    this.replays = new EventResourceNamespace(http, "/events/replays");
    this.consumers = new EventResourceNamespace(http, "/events/consumers");
    this.consumerGroups = new EventResourceNamespace(
      http,
      "/events/consumer-groups"
    );
    this.routes = new EventResourceNamespace(http, "/events/routes");
    this.buses = new EventResourceNamespace(http, "/events/buses");
    this.archives = new EventResourceNamespace(http, "/events/archives");
    this.retentionPolicies = new EventResourceNamespace(
      http,
      "/events/retention-policies"
    );
    this.policies = new EventResourceNamespace(http, "/events/policies");
  }

  /**
   * Publish one or more events. The backend accepts a single publish endpoint
   * (`/events/publish`) with the target topic in the body.
   */
  async publish(
    topic: string,
    events: PublishEvent[]
  ): Promise<{ published: number; event_ids: string[] }> {
    return this.http.post("/events/publish", { topic, events });
  }

  /** Create a subscription for a topic. */
  async subscribe(
    topic: string,
    config: { endpoint: string; filter?: string }
  ): Promise<Subscription> {
    return this.http.post("/events/subscriptions", { topic, ...config });
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    return this.http.delete(`/events/subscriptions/${subscriptionId}`);
  }
}

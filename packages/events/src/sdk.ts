import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "frontal/core";
import type { EventType, PublishEvent, Subscription, Topic } from "./schemas";

type Obj = Record<string, unknown>;
interface ListOpts {
  limit?: number;
  cursor?: string;
  [key: string]: unknown;
}

// ── Topics ─────────────────────────────────────────────────────────

/** Namespace for event topic operations. */
export class TopicsNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * List all topics.
   * @param opts - Pagination options.
   * @returns A paginated list of topics.
   */
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Topic>> {
    const raw = await this.http.get("/events/topics", opts);
    return createPageResult(asPagePayload<Topic>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  /**
   * Create a new topic.
   * @param input - The topic name and optional description.
   * @returns The created topic.
   */
  async create(input: { name: string; description?: string }): Promise<Topic> {
    return this.http.post("/events/topics", input);
  }

  /**
   * Get a topic by ID.
   * @param id - The topic's unique identifier.
   * @returns The topic.
   */
  async get(id: string): Promise<Topic> {
    return this.http.get(`/events/topics/${id}`);
  }

  /**
   * Update a topic's name or description.
   * @param id - The topic's unique identifier.
   * @param input - The fields to update.
   * @returns The updated topic.
   */
  async update(
    id: string,
    input: { name?: string; description?: string }
  ): Promise<Topic> {
    return this.http.put(`/events/topics/${id}`, input);
  }

  /**
   * Delete a topic.
   * @param id - The topic's unique identifier.
   */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/events/topics/${id}`);
  }
}

// ── Subscriptions ──────────────────────────────────────────────────

/** Namespace for event subscription operations. */
export class SubscriptionsNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * List all subscriptions.
   * @param opts - Pagination options.
   * @returns A paginated list of subscriptions.
   */
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Subscription>> {
    const raw = await this.http.get("/events/subscriptions", opts);
    return createPageResult(asPagePayload<Subscription>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  /**
   * Create a new subscription.
   * @param input - The topic, endpoint URL, and optional filter.
   * @returns The created subscription.
   */
  async create(input: {
    topic: string;
    endpoint: string;
    filter?: string;
  }): Promise<Subscription> {
    return this.http.post("/events/subscriptions", input);
  }

  /**
   * Get a subscription by ID.
   * @param id - The subscription's unique identifier.
   * @returns The subscription.
   */
  async get(id: string): Promise<Subscription> {
    return this.http.get(`/events/subscriptions/${id}`);
  }

  /**
   * Update a subscription's filter.
   * @param id - The subscription's unique identifier.
   * @param input - The filter to update.
   * @returns The updated subscription.
   */
  async update(id: string, input: { filter?: string }): Promise<Subscription> {
    return this.http.put(`/events/subscriptions/${id}`, input);
  }

  /**
   * Delete a subscription.
   * @param id - The subscription's unique identifier.
   */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/events/subscriptions/${id}`);
  }

  /**
   * Pause a subscription, stopping event delivery.
   * @param id - The subscription's unique identifier.
   * @returns The updated subscription.
   */
  async pause(id: string): Promise<Subscription> {
    return this.http.post(`/events/subscriptions/${id}/pause`, {});
  }

  /**
   * Resume a paused subscription.
   * @param id - The subscription's unique identifier.
   * @returns The updated subscription.
   */
  async resume(id: string): Promise<Subscription> {
    return this.http.post(`/events/subscriptions/${id}/resume`, {});
  }
}

// ── Event Schemas ──────────────────────────────────────────────────

/** Namespace for event schema registry operations. */
export class EventSchemasNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /** List all registered event types/schemas. */
  async list(): Promise<{ data: EventType[] }> {
    return this.http.get("/events/schemas");
  }

  /**
   * Get an event type/schema by ID.
   * @param id - The event type's unique identifier.
   * @returns The event type.
   */
  async get(id: string): Promise<EventType> {
    return this.http.get(`/events/schemas/${id}`);
  }

  /**
   * Register a new event type/schema.
   * @param input - The event type name, version, and schema definition.
   * @returns The created event type.
   */
  async create(input: {
    name: string;
    version: string;
    schema: Record<string, unknown>;
  }): Promise<EventType> {
    return this.http.post("/events/schemas", input);
  }

  /**
   * Update an event type's schema or description.
   * @param id - The event type's unique identifier.
   * @param input - The fields to update.
   * @returns The updated event type.
   */
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
/** Generic namespace for flat event resource collections. */
export class EventResourceNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   * @param path - The API path for this resource.
   */
  constructor(
    private readonly http: HttpClient,
    private readonly path: string
  ) {}

  /**
   * List resources with pagination.
   * @param opts - Pagination options.
   * @returns A paginated list of resources.
   */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get(this.path, opts);
    return createPageResult(asPagePayload<Obj>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  /**
   * Create a resource.
   * @param input - The resource data.
   * @returns The created resource.
   */
  create(input: Obj): Promise<Obj> {
    return this.http.post(this.path, input);
  }
  /**
   * Get a resource by ID.
   * @param id - The resource's unique identifier.
   * @returns The resource.
   */
  get(id: string): Promise<Obj> {
    return this.http.get(`${this.path}/${id}`);
  }
}

// ── Service ────────────────────────────────────────────────────────

/** Client for the Frontal Events API. Manages topics, subscriptions, schemas, replays, consumers, and more. */
export class EventsSdk {
  /** Namespace for topic operations. */
  readonly topics: TopicsNamespace;
  /** Namespace for subscription operations. */
  readonly subscriptions: SubscriptionsNamespace;
  /** Namespace for event schema operations. */
  readonly schemas: EventSchemasNamespace;
  /** Namespace for replay operations. */
  readonly replays: EventResourceNamespace;
  /** Namespace for consumer operations. */
  readonly consumers: EventResourceNamespace;
  /** Namespace for consumer group operations. */
  readonly consumerGroups: EventResourceNamespace;
  /** Namespace for route operations. */
  readonly routes: EventResourceNamespace;
  /** Namespace for bus operations. */
  readonly buses: EventResourceNamespace;
  /** Namespace for archive operations. */
  readonly archives: EventResourceNamespace;
  /** Namespace for retention policy operations. */
  readonly retentionPolicies: EventResourceNamespace;
  /** Namespace for policy operations. */
  readonly policies: EventResourceNamespace;

  /**
   * @param http - The HTTP client used for API requests.
   */
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
   * Publish one or more events to a topic.
   * @param topic - The target topic name.
   * @param events - The events to publish.
   * @returns An object with the count of published events and their IDs.
   */
  async publish(
    topic: string,
    events: PublishEvent[]
  ): Promise<{ published: number; event_ids: string[] }> {
    return this.http.post("/events/publish", { topic, events });
  }

  /**
   * Create a subscription for a topic.
   * @param topic - The topic to subscribe to.
   * @param config - The endpoint URL and optional filter.
   * @returns The created subscription.
   */
  async subscribe(
    topic: string,
    config: { endpoint: string; filter?: string }
  ): Promise<Subscription> {
    return this.http.post("/events/subscriptions", { topic, ...config });
  }

  /**
   * Delete a subscription.
   * @param subscriptionId - The subscription's unique identifier.
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    return this.http.delete(`/events/subscriptions/${subscriptionId}`);
  }
}

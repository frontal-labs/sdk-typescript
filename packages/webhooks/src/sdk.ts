import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";
import type { DeliveryAttempt, Webhook, WebhookStats } from "./schemas";

/**
 * Client for the Frontal Webhooks API (`/v1/webhooks`).
 * Manages webhook endpoints, deliveries, and statistics.
 */
export class WebhooksSdk {
  /** Webhook endpoint operations. */
  readonly endpoints: EndpointsNamespace;
  /** Delivery attempt operations. */
  readonly deliveries: DeliveriesNamespace;
  /** Webhook statistics operations. */
  readonly stats: StatsNamespace;

  constructor(private readonly http: HttpClient) {
    this.endpoints = new EndpointsNamespace(http);
    this.deliveries = new DeliveriesNamespace(http);
    this.stats = new StatsNamespace(http);
  }
}

/** Namespace for webhook endpoint management. */
export class EndpointsNamespace {
  constructor(private readonly http: HttpClient) {}
  /** List webhook endpoints with pagination. */
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Webhook>> {
    const raw = await this.http.get("/webhooks", opts);
    return createPageResult(asPagePayload<Webhook>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  /** Create a new webhook endpoint. */
  async create(input: { url: string; events: string[] }): Promise<Webhook> {
    return this.http.post("/webhooks", input);
  }
  /** Get a webhook endpoint by ID. */
  async get(id: string): Promise<Webhook> {
    return this.http.get(`/webhooks/${id}`);
  }
  /** Update a webhook endpoint's URL or subscribed events. */
  async update(
    id: string,
    input: { url?: string; events?: string[] }
  ): Promise<Webhook> {
    return this.http.put(`/webhooks/${id}`, input);
  }
  /** Delete a webhook endpoint. */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/webhooks/${id}`);
  }
  /** Rotate the signing secret for a webhook endpoint. */
  async rotateSecret(id: string): Promise<{ secret: string }> {
    return this.http.post(`/webhooks/${id}/rotate-secret`, {});
  }
}

/** Namespace for webhook delivery operations. */
export class DeliveriesNamespace {
  constructor(private readonly http: HttpClient) {}
  /** List delivery attempts with optional filtering and pagination. */
  async list(
    opts: {
      webhookId?: string;
      status?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PageResult<DeliveryAttempt>> {
    const raw = await this.http.get("/webhooks/deliveries", opts);
    return createPageResult(asPagePayload<DeliveryAttempt>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  /** Get a single delivery attempt by ID. */
  async get(id: string): Promise<DeliveryAttempt> {
    return this.http.get(`/webhooks/deliveries/${id}`);
  }
  /** Retry a failed delivery attempt. */
  async retry(id: string): Promise<DeliveryAttempt> {
    return this.http.post(`/webhooks/deliveries/${id}/retry`, {});
  }
}

/** Namespace for webhook statistics operations. */
export class StatsNamespace {
  constructor(private readonly http: HttpClient) {}
  /** Get delivery statistics, optionally filtered by webhook or time range. */
  async get(
    opts: { webhookId?: string; from?: string; to?: string } = {}
  ): Promise<WebhookStats> {
    return this.http.get("/webhooks/stats", opts);
  }
}

import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";
import type { Webhook, DeliveryAttempt, WebhookStats } from "./schemas";

export class WebhooksService {
  readonly endpoints: EndpointsNamespace;
  readonly deliveries: DeliveriesNamespace;
  readonly stats: StatsNamespace;

  constructor(private readonly http: HttpClient) {
    this.endpoints = new EndpointsNamespace(http);
    this.deliveries = new DeliveriesNamespace(http);
    this.stats = new StatsNamespace(http);
  }
}

export class EndpointsNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Webhook>> {
    const raw = await this.http.get("/webhooks", opts);
    return createPageResult(asPagePayload<Webhook>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async create(input: { url: string; events: string[] }): Promise<Webhook> {
    return this.http.post("/webhooks", input);
  }
  async get(id: string): Promise<Webhook> {
    return this.http.get(`/v1/webhooks/${id}`);
  }
  async update(
    id: string,
    input: { url?: string; events?: string[] }
  ): Promise<Webhook> {
    return this.http.put(`/v1/webhooks/${id}`, input);
  }
  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/webhooks/${id}`);
  }
  async rotateSecret(id: string): Promise<{ secret: string }> {
    return this.http.post(`/v1/webhooks/${id}/rotate-secret`, {});
  }
}

export class DeliveriesNamespace {
  constructor(private readonly http: HttpClient) {}
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
  async get(id: string): Promise<DeliveryAttempt> {
    return this.http.get(`/v1/webhooks/deliveries/${id}`);
  }
  async retry(id: string): Promise<DeliveryAttempt> {
    return this.http.post(`/v1/webhooks/deliveries/${id}/retry`, {});
  }
}

export class StatsNamespace {
  constructor(private readonly http: HttpClient) {}
  async get(
    opts: { webhookId?: string; from?: string; to?: string } = {}
  ): Promise<WebhookStats> {
    return this.http.get("/webhooks/stats", opts);
  }
}

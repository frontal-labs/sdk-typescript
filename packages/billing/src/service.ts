import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type {
  Plan,
  Subscription,
  Invoice,
  PaymentMethod,
  UsageRecord,
} from "./schemas";

const asPagePayload = <T>(
  raw: unknown
): { data: T[]; pagination: PaginationMeta; meta?: unknown } =>
  raw as { data: T[]; pagination: PaginationMeta; meta?: unknown };

export class BillingService {
  readonly plans: PlansNamespace;
  readonly subscriptions: SubscriptionsNamespace;
  readonly invoices: InvoicesNamespace;
  readonly usage: UsageNamespace;
  readonly paymentMethods: PaymentMethodsNamespace;

  constructor(private readonly http: HttpClient) {
    this.plans = new PlansNamespace(http);
    this.subscriptions = new SubscriptionsNamespace(http);
    this.invoices = new InvoicesNamespace(http);
    this.usage = new UsageNamespace(http);
    this.paymentMethods = new PaymentMethodsNamespace(http);
  }
}

export class PlansNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(): Promise<{ data: Plan[] }> {
    return this.http.get("/v1/billing/plans");
  }
  async get(id: string): Promise<Plan> {
    return this.http.get(`/v1/billing/plans/${id}`);
  }
}

export class SubscriptionsNamespace {
  constructor(private readonly http: HttpClient) {}
  async get(): Promise<Subscription> {
    return this.http.get("/v1/billing/subscription");
  }
  async create(input: {
    planId: string;
    tenantId?: string;
  }): Promise<Subscription> {
    return this.http.post("/v1/billing/subscription", input);
  }
  async update(input: {
    planId?: string;
    cancelAtPeriodEnd?: boolean;
  }): Promise<Subscription> {
    return this.http.put("/v1/billing/subscription", input);
  }
  async cancel(): Promise<Subscription> {
    return this.http.post("/v1/billing/subscription/cancel", {});
  }
}

export class InvoicesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Invoice>> {
    const raw = await this.http.get("/v1/billing/invoices", opts);
    return createPageResult(asPagePayload<Invoice>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async get(id: string): Promise<Invoice> {
    return this.http.get(`/v1/billing/invoices/${id}`);
  }
  async pay(id: string): Promise<Invoice> {
    return this.http.post(`/v1/billing/invoices/${id}/pay`, {});
  }
}

export class UsageNamespace {
  constructor(private readonly http: HttpClient) {}
  async report(
    records: { metric: string; quantity: number }[]
  ): Promise<{ ingested: number }> {
    return this.http.post("/v1/billing/usage", { records });
  }
  async query(
    opts: { metric?: string; from?: string; to?: string } = {}
  ): Promise<PageResult<UsageRecord>> {
    const raw = await this.http.get("/v1/billing/usage", opts);
    return createPageResult(asPagePayload<UsageRecord>(raw), (cursor) =>
      this.query({ ...opts, cursor } as typeof opts)
    );
  }
}

export class PaymentMethodsNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(): Promise<{ data: PaymentMethod[] }> {
    return this.http.get("/v1/billing/payment-methods");
  }
  /** @deprecated Use {@link create} instead. */
  async add(input: { type: string; token: string }): Promise<PaymentMethod> {
    return this.create(input);
  }
  async create(input: { type: string; token: string }): Promise<PaymentMethod> {
    return this.http.post("/v1/billing/payment-methods", input);
  }
  /** @deprecated Use {@link delete} instead. */
  async remove(id: string): Promise<void> {
    return this.delete(id);
  }
  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/billing/payment-methods/${id}`);
  }
  async setDefault(id: string): Promise<PaymentMethod> {
    return this.http.post(`/v1/billing/payment-methods/${id}/default`, {});
  }
}

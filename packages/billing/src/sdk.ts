import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";
import type { Invoice, Plan, Subscription } from "./schemas";

type Obj = Record<string, unknown>;
interface ListOpts {
  limit?: number;
  cursor?: string;
  [key: string]: unknown;
}

/**
 * Client for the Frontal BillingSdk API. BillingSdk resources are served at the top
 * level (`/v1/customers`, `/v1/subscriptions`, …); the public gateway exposes
 * them under a `/v1/billing` namespace and strips the `billing` segment, so the
 * SDK writes `/billing/<resource>` (base URL already includes `/v1`).
 */
export class BillingSdk {
  readonly customers: CustomersNamespace;
  readonly plans: PlansNamespace;
  readonly subscriptions: SubscriptionsNamespace;
  readonly invoices: InvoicesNamespace;
  readonly wallets: WalletsNamespace;
  readonly meters: MetersNamespace;
  readonly prices: PricesNamespace;
  readonly addons: AddonsNamespace;

  constructor(http: HttpClient) {
    this.customers = new CustomersNamespace(http);
    this.plans = new PlansNamespace(http);
    this.subscriptions = new SubscriptionsNamespace(http);
    this.invoices = new InvoicesNamespace(http);
    this.wallets = new WalletsNamespace(http);
    this.meters = new MetersNamespace(http);
    this.prices = new PricesNamespace(http);
    this.addons = new AddonsNamespace(http);
  }
}

/** Generic list/create/get/update/delete/search for a billing resource. */
abstract class ResourceNamespace<T = Obj> {
  protected constructor(
    protected readonly http: HttpClient,
    protected readonly base: string
  ) {}

  async list(opts: ListOpts = {}): Promise<PageResult<T>> {
    const raw = await this.http.get(this.base, opts);
    return createPageResult(asPagePayload<T>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  create(input: Obj): Promise<T> {
    return this.http.post(this.base, input);
  }
  get(id: string): Promise<T> {
    return this.http.get(`${this.base}/${id}`);
  }
  update(id: string, input: Obj): Promise<T> {
    return this.http.put(`${this.base}/${id}`, input);
  }
  delete(id: string): Promise<void> {
    return this.http.delete(`${this.base}/${id}`);
  }
  /** Query resources (`POST <base>/search`). */
  search(query: Obj): Promise<PageResult<T> | { data: T[] }> {
    return this.http.post(`${this.base}/search`, query);
  }
}

export class CustomersNamespace extends ResourceNamespace {
  constructor(http: HttpClient) {
    super(http, "/billing/customers");
  }
  entitlements(id: string): Promise<Obj> {
    return this.http.get(`/billing/customers/${id}/entitlements`);
  }
  usage(id: string): Promise<Obj> {
    return this.http.get(`/billing/customers/${id}/usage`);
  }
  wallets(id: string): Promise<Obj> {
    return this.http.get(`/billing/customers/${id}/wallets`);
  }
  invoiceSummary(id: string): Promise<Obj> {
    return this.http.get(`/billing/customers/${id}/invoices/summary`);
  }
  /** Create a customer portal session. */
  portalSession(externalId: string): Promise<Obj> {
    return this.http.get(`/billing/customers/portal/${externalId}`);
  }
}

export class PlansNamespace extends ResourceNamespace<Plan> {
  constructor(http: HttpClient) {
    super(http, "/billing/plans");
  }
  clone(id: string, input: Obj = {}): Promise<Plan> {
    return this.http.post(`/billing/plans/${id}/clone`, input);
  }
  entitlements(id: string): Promise<Obj> {
    return this.http.get(`/billing/plans/${id}/entitlements`);
  }
}

export class SubscriptionsNamespace extends ResourceNamespace<Subscription> {
  constructor(http: HttpClient) {
    super(http, "/billing/subscriptions");
  }
  activate(id: string): Promise<Subscription> {
    return this.http.post(`/billing/subscriptions/${id}/activate`, {});
  }
  cancel(id: string, input: Obj = {}): Promise<Subscription> {
    return this.http.post(`/billing/subscriptions/${id}/cancel`, input);
  }
  pause(id: string, input: Obj = {}): Promise<Subscription> {
    return this.http.post(`/billing/subscriptions/${id}/pause`, input);
  }
  resume(id: string, input: Obj = {}): Promise<Subscription> {
    return this.http.post(`/billing/subscriptions/${id}/resume`, input);
  }
  entitlements(id: string): Promise<Obj> {
    return this.http.get(`/billing/subscriptions/${id}/entitlements`);
  }
}

export class InvoicesNamespace extends ResourceNamespace<Invoice> {
  constructor(http: HttpClient) {
    super(http, "/billing/invoices");
  }
  finalize(id: string): Promise<Invoice> {
    return this.http.post(`/billing/invoices/${id}/finalize`, {});
  }
  void(id: string): Promise<Invoice> {
    return this.http.post(`/billing/invoices/${id}/void`, {});
  }
  preview(input: Obj): Promise<Invoice> {
    return this.http.post("/billing/invoices/preview", input);
  }
  /** Fetch the invoice PDF as a raw {@link Response}. */
  pdf(id: string): Promise<Response> {
    return this.http.getRaw(`/billing/invoices/${id}/pdf`);
  }
}

export class WalletsNamespace extends ResourceNamespace {
  constructor(http: HttpClient) {
    super(http, "/billing/wallets");
  }
  transactions(id: string, opts: ListOpts = {}): Promise<Obj> {
    return this.http.get(`/billing/wallets/${id}/transactions`, opts);
  }
  topUp(id: string, input: Obj): Promise<Obj> {
    return this.http.post(`/billing/wallets/${id}/top-up`, input);
  }
  terminate(id: string): Promise<Obj> {
    return this.http.post(`/billing/wallets/${id}/terminate`, {});
  }
  realTimeBalance(id: string): Promise<Obj> {
    return this.http.get(`/billing/wallets/${id}/balance/real-time`);
  }
}

export class MetersNamespace extends ResourceNamespace {
  constructor(http: HttpClient) {
    super(http, "/billing/meters");
  }
  disable(id: string): Promise<Obj> {
    return this.http.post(`/billing/meters/${id}/disable`, {});
  }
}

export class PricesNamespace extends ResourceNamespace {
  constructor(http: HttpClient) {
    super(http, "/billing/prices");
  }
  lookup(lookupKey: string): Promise<Obj> {
    return this.http.get(`/billing/prices/lookup/${lookupKey}`);
  }
}

export class AddonsNamespace extends ResourceNamespace {
  constructor(http: HttpClient) {
    super(http, "/billing/addons");
  }
  entitlements(id: string): Promise<Obj> {
    return this.http.get(`/billing/addons/${id}/entitlements`);
  }
}

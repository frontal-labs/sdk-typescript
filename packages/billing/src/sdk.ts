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
/** Client for the Frontal Billing API. Manages customers, plans, subscriptions, invoices, wallets, meters, prices, and add-ons. */
export class BillingSdk {
  /** Namespace for customer operations. */
  readonly customers: CustomersNamespace;
  /** Namespace for plan operations. */
  readonly plans: PlansNamespace;
  /** Namespace for subscription operations. */
  readonly subscriptions: SubscriptionsNamespace;
  /** Namespace for invoice operations. */
  readonly invoices: InvoicesNamespace;
  /** Namespace for wallet operations. */
  readonly wallets: WalletsNamespace;
  /** Namespace for meter operations. */
  readonly meters: MetersNamespace;
  /** Namespace for price operations. */
  readonly prices: PricesNamespace;
  /** Namespace for add-on operations. */
  readonly addons: AddonsNamespace;

  /**
   * @param http - The HTTP client used for API requests.
   */
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

/** Namespace for customer operations. */
export class CustomersNamespace extends ResourceNamespace {
  constructor(http: HttpClient) {
    super(http, "/billing/customers");
  }
  /** Get entitlements for a customer. */
  entitlements(id: string): Promise<Obj> {
    return this.http.get(`/billing/customers/${id}/entitlements`);
  }
  /** Get usage data for a customer. */
  usage(id: string): Promise<Obj> {
    return this.http.get(`/billing/customers/${id}/usage`);
  }
  /** Get wallets for a customer. */
  wallets(id: string): Promise<Obj> {
    return this.http.get(`/billing/customers/${id}/wallets`);
  }
  /** Get invoice summary for a customer. */
  invoiceSummary(id: string): Promise<Obj> {
    return this.http.get(`/billing/customers/${id}/invoices/summary`);
  }
  /** Create a customer portal session. */
  portalSession(externalId: string): Promise<Obj> {
    return this.http.get(`/billing/customers/portal/${externalId}`);
  }
}

/** Namespace for plan operations. */
export class PlansNamespace extends ResourceNamespace<Plan> {
  constructor(http: HttpClient) {
    super(http, "/billing/plans");
  }
  /** Clone a plan with optional overrides. */
  clone(id: string, input: Obj = {}): Promise<Plan> {
    return this.http.post(`/billing/plans/${id}/clone`, input);
  }
  /** Get entitlements for a plan. */
  entitlements(id: string): Promise<Obj> {
    return this.http.get(`/billing/plans/${id}/entitlements`);
  }
}

/** Namespace for subscription operations. */
export class SubscriptionsNamespace extends ResourceNamespace<Subscription> {
  constructor(http: HttpClient) {
    super(http, "/billing/subscriptions");
  }
  /** Activate a subscription. */
  activate(id: string): Promise<Subscription> {
    return this.http.post(`/billing/subscriptions/${id}/activate`, {});
  }
  /** Cancel a subscription with optional parameters. */
  cancel(id: string, input: Obj = {}): Promise<Subscription> {
    return this.http.post(`/billing/subscriptions/${id}/cancel`, input);
  }
  /** Pause a subscription. */
  pause(id: string, input: Obj = {}): Promise<Subscription> {
    return this.http.post(`/billing/subscriptions/${id}/pause`, input);
  }
  /** Resume a paused subscription. */
  resume(id: string, input: Obj = {}): Promise<Subscription> {
    return this.http.post(`/billing/subscriptions/${id}/resume`, input);
  }
  /** Get entitlements for a subscription. */
  entitlements(id: string): Promise<Obj> {
    return this.http.get(`/billing/subscriptions/${id}/entitlements`);
  }
}

/** Namespace for invoice operations. */
export class InvoicesNamespace extends ResourceNamespace<Invoice> {
  constructor(http: HttpClient) {
    super(http, "/billing/invoices");
  }
  /** Finalize a draft invoice. */
  finalize(id: string): Promise<Invoice> {
    return this.http.post(`/billing/invoices/${id}/finalize`, {});
  }
  /** Void an open invoice. */
  void(id: string): Promise<Invoice> {
    return this.http.post(`/billing/invoices/${id}/void`, {});
  }
  /** Generate a preview invoice. */
  preview(input: Obj): Promise<Invoice> {
    return this.http.post("/billing/invoices/preview", input);
  }
  /** Fetch the invoice PDF as a raw {@link Response}. */
  pdf(id: string): Promise<Response> {
    return this.http.getRaw(`/billing/invoices/${id}/pdf`);
  }
}

/** Namespace for wallet operations. */
export class WalletsNamespace extends ResourceNamespace {
  constructor(http: HttpClient) {
    super(http, "/billing/wallets");
  }
  /** List transactions for a wallet. */
  transactions(id: string, opts: ListOpts = {}): Promise<Obj> {
    return this.http.get(`/billing/wallets/${id}/transactions`, opts);
  }
  /** Top up a wallet balance. */
  topUp(id: string, input: Obj): Promise<Obj> {
    return this.http.post(`/billing/wallets/${id}/top-up`, input);
  }
  /** Terminate a wallet. */
  terminate(id: string): Promise<Obj> {
    return this.http.post(`/billing/wallets/${id}/terminate`, {});
  }
  /** Get the real-time balance of a wallet. */
  realTimeBalance(id: string): Promise<Obj> {
    return this.http.get(`/billing/wallets/${id}/balance/real-time`);
  }
}

/** Namespace for meter operations. */
export class MetersNamespace extends ResourceNamespace {
  constructor(http: HttpClient) {
    super(http, "/billing/meters");
  }
  /** Disable a meter. */
  disable(id: string): Promise<Obj> {
    return this.http.post(`/billing/meters/${id}/disable`, {});
  }
}

/** Namespace for price operations. */
export class PricesNamespace extends ResourceNamespace {
  constructor(http: HttpClient) {
    super(http, "/billing/prices");
  }
  /** Look up a price by its lookup key. */
  lookup(lookupKey: string): Promise<Obj> {
    return this.http.get(`/billing/prices/lookup/${lookupKey}`);
  }
}

/** Namespace for add-on operations. */
export class AddonsNamespace extends ResourceNamespace {
  constructor(http: HttpClient) {
    super(http, "/billing/addons");
  }
  /** Get entitlements for an add-on. */
  entitlements(id: string): Promise<Obj> {
    return this.http.get(`/billing/addons/${id}/entitlements`);
  }
}

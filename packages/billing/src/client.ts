import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_BILLING_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { BillingSdk } from "./sdk";
import { env } from "@frontal-labs/core";

/** Configuration options for creating a Billing API client. */
export interface BillingClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Billing API. Defaults to `DEFAULT_BILLING_BASE_URL`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests. */
  maxRetries?: number;
}

/**
 * Create a Billing SDK client.
 * @param config - Either a `FrontalClient` instance or a `BillingClientConfig` object.
 * @returns A configured `BillingSdk` instance.
 */
export function createBillingClient(
  config: BillingClientConfig | FrontalClient
): BillingSdk;

/**
 * Create a Billing SDK client.
 * @param clientOrConfig - Either a `FrontalClient` instance or a `BillingClientConfig` object.
 * @returns A configured `BillingSdk` instance.
 */
export function createBillingClient(
  clientOrConfig: FrontalClient | BillingClientConfig
): BillingSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new BillingSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_BILLING_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new BillingSdk(http);
}

let _billingCache: BillingSdk | undefined;

/**
 * Default singleton Billing SDK instance backed by the default {@link FrontalClient}.
 * Lazily initialized on first access.
 */
export const billing = new Proxy<BillingSdk>({} as BillingSdk, {
  get(_t, prop) {
    if (!_billingCache) {
      _billingCache = createBillingClient(getDefaultClient());
    }
    const inst = _billingCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

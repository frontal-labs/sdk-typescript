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

export interface BillingClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createBillingClient(
  config: BillingClientConfig | FrontalClient
): BillingSdk;

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

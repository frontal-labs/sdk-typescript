import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_BILLING_BASE_URL } from "./constants";
import { BillingService } from "./service";

export interface BillingClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
export function createBillingClient(
  config: BillingClientConfig | FrontalClient
): BillingService;
export function createBillingClient(
  clientOrConfig: FrontalClient | BillingClientConfig
): BillingService {
  if (clientOrConfig instanceof FrontalClient) {
    return new BillingService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_BILLING_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_BILLING_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new BillingService(http);
}

let _billingCache: BillingService | undefined;
export const billing = new Proxy<BillingService>({} as BillingService, {
  get(_t, prop) {
    if (!_billingCache) {
      _billingCache = new BillingService(getDefaultClient().httpClient);
    }
    const inst = _billingCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_BILLING_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { BillingService } from "./service";

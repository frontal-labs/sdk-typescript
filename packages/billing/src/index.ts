import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_BILLING_BASE_URL, VERSION } from "./constants";
import { BillingService } from "./service";

export interface BillingClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createBillingClient(client: FrontalClient): BillingService;
export function createBillingClient(
  config: BillingClientConfig
): BillingService;
export function createBillingClient(
  clientOrConfig: FrontalClient | BillingClientConfig
): BillingService {
  if (clientOrConfig instanceof FrontalClient) {
    return new BillingService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_BILLING_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_BILLING_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new BillingService(http);
}

export const billing = new BillingService(getDefaultClient()._http);

export { DEFAULT_BILLING_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { BillingService } from "./service";

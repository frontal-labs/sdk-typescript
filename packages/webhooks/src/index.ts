import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_WEBHOOKS_BASE_URL } from "./constants";
import { WebhooksService } from "./service";

export interface WebhooksClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
export function createWebhooksClient(
  config: WebhooksClientConfig | FrontalClient
): WebhooksService;
export function createWebhooksClient(
  clientOrConfig: FrontalClient | WebhooksClientConfig
): WebhooksService {
  if (clientOrConfig instanceof FrontalClient) {
    return new WebhooksService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_WEBHOOKS_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_WEBHOOKS_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new WebhooksService(http);
}

let _webhooksCache: WebhooksService | undefined;
export const webhooks = new Proxy<WebhooksService>({} as WebhooksService, {
  get(_t, prop) {
    if (!_webhooksCache) {
      _webhooksCache = new WebhooksService(getDefaultClient().httpClient);
    }
    const inst = _webhooksCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_WEBHOOKS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { verifyWebhookSignature, extractWebhookEvent } from "./verify";
export { WebhooksService } from "./service";

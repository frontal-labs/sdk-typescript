import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/_core";
import {
  DEFAULT_WEBHOOKS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { WebhooksSdk } from "./sdk";
import { env } from "@frontal-labs/_core";

/**
 * Configuration for creating a standalone Frontal Webhooks client.
 */
export interface WebhooksClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Webhooks API. Defaults to {@link DEFAULT_WEBHOOKS_BASE_URL}. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT}. */
  timeout?: number;
  /** Maximum number of retries for failed requests. Defaults to {@link DEFAULT_MAX_RETRIES}. */
  maxRetries?: number;
}

/**
 * Creates a {@link WebhooksSdk} client from a {@link FrontalClient} instance or
 * a {@link WebhooksClientConfig} configuration object.
 *
 * @param config - An existing `FrontalClient` or a config object with `apiKey`.
 * @returns A configured `WebhooksSdk` instance.
 */
export function createWebhooksClient(
  config: WebhooksClientConfig | FrontalClient
): WebhooksSdk;

export function createWebhooksClient(
  clientOrConfig: FrontalClient | WebhooksClientConfig
): WebhooksSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new WebhooksSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_WEBHOOKS_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new WebhooksSdk(http);
}

let _webhooksCache: WebhooksSdk | undefined;

/**
 * Convenience singleton proxy for the Frontal Webhooks SDK.
 * Lazily initialises from environment variables on first property access.
 */
export const webhooks = new Proxy<WebhooksSdk>({} as WebhooksSdk, {
  get(_t, prop) {
    if (!_webhooksCache) {
      _webhooksCache = new WebhooksSdk(getDefaultClient().httpClient);
    }
    const inst = _webhooksCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

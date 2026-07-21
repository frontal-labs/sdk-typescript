import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_INTEGRATIONS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { IntegrationsSdk } from "./sdk";
import { env } from "@frontal-labs/core";

/**
 * Configuration for creating a standalone Frontal Integrations client.
 */
export interface IntegrationsClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Integrations API. Defaults to {@link DEFAULT_INTEGRATIONS_BASE_URL}. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT}. */
  timeout?: number;
  /** Maximum number of retries for failed requests. Defaults to {@link DEFAULT_MAX_RETRIES}. */
  maxRetries?: number;
}

/**
 * Creates an {@link IntegrationsSdk} client from a {@link FrontalClient}
 * instance or an {@link IntegrationsClientConfig} configuration object.
 *
 * @param clientOrConfig - An existing `FrontalClient` or a config object with `apiKey`.
 * @returns A configured `IntegrationsSdk` instance.
 */
export function createIntegrationsClient(
  clientOrConfig: FrontalClient | IntegrationsClientConfig
): IntegrationsSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new IntegrationsSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_INTEGRATIONS_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new IntegrationsSdk(http);
}

let _integrationsCache: IntegrationsSdk | undefined;

/**
 * Convenience singleton proxy for the Frontal Integrations SDK.
 * Lazily initialises from environment variables on first property access.
 */
export const integrations = new Proxy<IntegrationsSdk>({} as IntegrationsSdk, {
  get(_t, prop) {
    if (!_integrationsCache) {
      _integrationsCache = createIntegrationsClient(getDefaultClient());
    }
    const inst = _integrationsCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

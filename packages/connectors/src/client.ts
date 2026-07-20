import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_CONNECTORS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { ConnectorsSdk } from "./sdk";
import { env } from "@frontal-labs/core";

/** Configuration options for creating a Connectors API client. */
export interface ConnectorsClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Connectors API. Defaults to `DEFAULT_CONNECTORS_BASE_URL`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests. */
  maxRetries?: number;
}

/**
 * Create a Connectors SDK client.
 * @param clientOrConfig - Either a `FrontalClient` instance or a `ConnectorsClientConfig` object.
 * @returns A configured `ConnectorsSdk` instance.
 */
export function createConnectorsClient(
  clientOrConfig: FrontalClient | ConnectorsClientConfig
): ConnectorsSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new ConnectorsSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_CONNECTORS_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new ConnectorsSdk(http);
}

let _connectorsCache: ConnectorsSdk | undefined;

/**
 * Default singleton Connectors SDK instance backed by the default {@link FrontalClient}.
 * Lazily initialized on first access.
 */
export const connectors = new Proxy<ConnectorsSdk>({} as ConnectorsSdk, {
  get(_t, prop) {
    if (!_connectorsCache) {
      _connectorsCache = createConnectorsClient(getDefaultClient());
    }
    const inst = _connectorsCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

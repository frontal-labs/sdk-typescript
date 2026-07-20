import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/_core";
import {
  DEFAULT_GOVERNANCE_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { GovernanceSdk } from "./sdk";
import { env } from "@frontal-labs/_core";

/** Configuration options for creating a Governance API client. */
export interface GovernanceClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Governance API. Defaults to `DEFAULT_GOVERNANCE_BASE_URL`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests. */
  maxRetries?: number;
}

/**
 * Create a Governance SDK client.
 * @param config - Either a `FrontalClient` instance or a `GovernanceClientConfig` object.
 * @returns A configured `GovernanceSdk` instance.
 */
export function createGovernanceClient(
  config: GovernanceClientConfig | FrontalClient
): GovernanceSdk;

/**
 * Create a Governance SDK client.
 * @param clientOrConfig - Either a `FrontalClient` instance or a `GovernanceClientConfig` object.
 * @returns A configured `GovernanceSdk` instance.
 */
export function createGovernanceClient(
  clientOrConfig: FrontalClient | GovernanceClientConfig
): GovernanceSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new GovernanceSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_GOVERNANCE_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new GovernanceSdk(http);
}

let _governanceCache: GovernanceSdk | undefined;

/**
 * Default singleton Governance SDK instance backed by the default {@link FrontalClient}.
 * Lazily initialized on first access.
 */
export const governance = new Proxy<GovernanceSdk>({} as GovernanceSdk, {
  get(_t, prop) {
    if (!_governanceCache) {
      _governanceCache = new GovernanceSdk(getDefaultClient().httpClient);
    }
    const inst = _governanceCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

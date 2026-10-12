import {
  env,
  FrontalClient,
  getDefaultClient,
  HttpClient,
  type Interceptor,
} from "@frontal-labs/core";
import {
  DEFAULT_GOVERNANCE_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { GovernanceSdk } from "./sdk";
import {
  governanceInterceptor,
  type GovernanceInterceptorConfig,
} from "./interceptor";

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
  /** Optional governance policies to enforce locally on all requests. */
  policies?: GovernanceInterceptorConfig["policies"];
  /** Whether to fail closed on policy evaluation errors. */
  failClosed?: boolean;
  /** Optional callback when a policy violation occurs. */
  onViolation?: GovernanceInterceptorConfig["onViolation"];
  /** Optional interceptor(s) applied to the HTTP client (e.g. governance policy enforcement). */
  interceptors?: Interceptor[];
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

  const { policies, failClosed, onViolation, interceptors, ...httpConfig } =
    clientOrConfig;

  const http = new HttpClient({
    apiKey: httpConfig.apiKey,
    baseUrl:
      httpConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_GOVERNANCE_BASE_URL,
    timeout: httpConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: httpConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
    interceptors: [
      ...(interceptors ?? []),
      ...(policies
        ? [governanceInterceptor({ policies, failClosed, onViolation })]
        : []),
    ],
  });

  return new GovernanceSdk(http.intercepted);
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

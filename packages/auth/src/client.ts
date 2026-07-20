import { FrontalClient, getDefaultClient, HttpClient } from "frontal/core";
import {
  DEFAULT_AUTH_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { AuthSdk } from "./sdk";
import { env } from "frontal/core";

/** Configuration options for creating an Auth API client. */
export interface AuthClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Auth API. Defaults to `DEFAULT_AUTH_BASE_URL`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests. */
  maxRetries?: number;
}

/**
 * Create an Auth SDK client.
 * @param config - Either a `FrontalClient` instance or an `AuthClientConfig` object.
 * @returns A configured `AuthSdk` instance.
 */
export function createAuthClient(
  config: AuthClientConfig | FrontalClient
): AuthSdk;

/**
 * Create an Auth SDK client.
 * @param clientOrConfig - Either a `FrontalClient` instance or an `AuthClientConfig` object.
 * @returns A configured `AuthSdk` instance.
 */
export function createAuthClient(
  clientOrConfig: FrontalClient | AuthClientConfig
): AuthSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new AuthSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_AUTH_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new AuthSdk(http);
}

let _authCache: AuthSdk | undefined;

/**
 * Default singleton Auth SDK instance backed by the default {@link FrontalClient}.
 * Lazily initialized on first access.
 */
export const auth = new Proxy<AuthSdk>({} as AuthSdk, {
  get(_t, prop) {
    if (!_authCache) {
      _authCache = createAuthClient(getDefaultClient());
    }
    const inst = _authCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

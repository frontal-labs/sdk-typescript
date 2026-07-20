import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_AUTH_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { AuthSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface AuthClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createAuthClient(
  config: AuthClientConfig | FrontalClient
): AuthSdk;

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

import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_SANDBOX_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { SandboxSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface SandboxClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createSandboxClient(
  config: SandboxClientConfig | FrontalClient
): SandboxSdk;

export function createSandboxClient(
  clientOrConfig: FrontalClient | SandboxClientConfig
): SandboxSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new SandboxSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_SANDBOX_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new SandboxSdk(http);
}

let _sandboxCache: SandboxSdk | undefined;

export const sandbox = new Proxy<SandboxSdk>({} as SandboxSdk, {
  get(_t, prop) {
    if (!_sandboxCache) {
      _sandboxCache = createSandboxClient(getDefaultClient());
    }
    const inst = _sandboxCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

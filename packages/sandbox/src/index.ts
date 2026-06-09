import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_SANDBOX_BASE_URL } from "./constants";
import { SandboxService } from "./service";

export interface SandboxClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
export function createSandboxClient(
  config: SandboxClientConfig | FrontalClient
): SandboxService;
export function createSandboxClient(
  clientOrConfig: FrontalClient | SandboxClientConfig
): SandboxService {
  if (clientOrConfig instanceof FrontalClient) {
    return new SandboxService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_SANDBOX_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_SANDBOX_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new SandboxService(http);
}

let _sandboxCache: SandboxService | undefined;
export const sandbox = new Proxy<SandboxService>({} as SandboxService, {
  get(_t, prop) {
    if (!_sandboxCache) {
      _sandboxCache = new SandboxService(getDefaultClient().httpClient);
    }
    const inst = _sandboxCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_SANDBOX_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { SandboxService } from "./service";

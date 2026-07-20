import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_LINEAGE_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { LineageSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface LineageClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createLineageClient(
  config: LineageClientConfig | FrontalClient
): LineageSdk;

export function createLineageClient(
  clientOrConfig: FrontalClient | LineageClientConfig
): LineageSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new LineageSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_LINEAGE_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new LineageSdk(http);
}

let _lineageCache: LineageSdk | undefined;

export const lineage = new Proxy<LineageSdk>({} as LineageSdk, {
  get(_t, prop) {
    if (!_lineageCache) {
      _lineageCache = createLineageClient(getDefaultClient());
    }
    const inst = _lineageCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

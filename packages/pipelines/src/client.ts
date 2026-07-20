import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_PIPELINES_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { PipelinesSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface PipelinesClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createPipelinesClient(
  config: PipelinesClientConfig | FrontalClient
): PipelinesSdk;

export function createPipelinesClient(
  clientOrConfig: FrontalClient | PipelinesClientConfig
): PipelinesSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new PipelinesSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_PIPELINES_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new PipelinesSdk(http);
}

let _pipelinesCache: PipelinesSdk | undefined;

export const pipelines = new Proxy<PipelinesSdk>({} as PipelinesSdk, {
  get(_t, prop) {
    if (!_pipelinesCache) {
      _pipelinesCache = createPipelinesClient(getDefaultClient());
    }
    const inst = _pipelinesCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

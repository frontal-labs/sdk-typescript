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

/**
 * Configuration for creating a {@link PipelinesSdk} client standalone.
 *
 * @property apiKey - Frontal API key.
 * @property baseUrl - Override the default pipelines API base URL.
 * @property timeout - Request timeout in milliseconds (default 30_000).
 * @property maxRetries - Maximum number of retry attempts (default 3).
 */
export interface PipelinesClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Creates a {@link PipelinesSdk} from either an existing {@link FrontalClient}
 * or a plain configuration object.
 *
 * @param config - A pre-configured FrontalClient or config options.
 * @returns A fully-initialized PipelinesSdk.
 */
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

/**
 * Convenience singleton that lazily creates a {@link PipelinesSdk} using the
 * default environment configuration.
 *
 * @example
 * ```ts
 * import { pipelines } from "@frontal-labs/pipelines";
 * const list = await pipelines.list();
 * ```
 */
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

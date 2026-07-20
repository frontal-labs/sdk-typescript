/**
 * Config for standalone usage without @frontal-labs/_core
 */

import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/_core";
import {
  DEFAULT_WORKFLOWS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { WorkflowsSdk } from "./sdk";
import { env } from "@frontal-labs/_core";

/**
 * Configuration for creating a {@link WorkflowsSdk} client standalone.
 *
 * @property apiKey - Frontal API key.
 * @property baseUrl - Override the default workflows API base URL.
 * @property timeout - Request timeout in milliseconds (default 30_000).
 * @property maxRetries - Maximum number of retry attempts (default 3).
 */
export interface WorkflowsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Creates a {@link WorkflowsSdk} from either an existing {@link FrontalClient}
 * or a plain configuration object.
 *
 * @param clientOrConfig - A pre-configured FrontalClient or config options.
 * @returns A fully-initialized WorkflowsSdk.
 */
export function createWorkflowsClient(
  config: WorkflowsClientConfig | FrontalClient
): WorkflowsSdk;

export function createWorkflowsClient(
  clientOrConfig: FrontalClient | WorkflowsClientConfig
): WorkflowsSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new WorkflowsSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_WORKFLOWS_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new WorkflowsSdk(http);
}

let _workflowsCache: WorkflowsSdk | undefined;

/**
 * Convenience singleton that lazily creates a {@link WorkflowsSdk} using the
 * default environment configuration.
 *
 * @example
 * ```ts
 * import { workflows } from "@frontal-labs/workflows";
 * const list = await workflows.list();
 * ```
 */
export const workflows = new Proxy<WorkflowsSdk>({} as WorkflowsSdk, {
  get(_t, prop) {
    if (!_workflowsCache) {
      _workflowsCache = new WorkflowsSdk(getDefaultClient().httpClient);
    }
    const inst = _workflowsCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

/**
 * Config for standalone usage without @frontal-labs/core
 */

import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_WORKFLOWS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { WorkflowsSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface WorkflowsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/** Create from a FrontalClient instance */
/** Create standalone with just config */
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
    environment: env.NODE_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new WorkflowsSdk(http);
}

// Default instance that works automatically with environment variables
let _workflowsCache: WorkflowsSdk | undefined;

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

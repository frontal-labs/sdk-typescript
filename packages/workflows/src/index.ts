import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { WorkflowsService } from "./service";

/** Config for standalone usage without @frontal-labs/core */
export interface WorkflowsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/** Create from a FrontalClient instance */
export function createWorkflowsClient(client: FrontalClient): WorkflowsService;
/** Create standalone with just config */
export function createWorkflowsClient(
  config: WorkflowsClientConfig
): WorkflowsService;
export function createWorkflowsClient(
  clientOrConfig: FrontalClient | WorkflowsClientConfig
): WorkflowsService {
  if (clientOrConfig instanceof FrontalClient) {
    return new WorkflowsService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_WORKFLOWS_API_URL ??
      process.env.FRONTAL_API_URL ??
      "https://api.frontal.dev/v1",
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new WorkflowsService(http);
}

// Default instance that works automatically with environment variables
export const workflows = new WorkflowsService(getDefaultClient()._http);

export * from "./schemas";
export { WorkflowsService } from "./service";

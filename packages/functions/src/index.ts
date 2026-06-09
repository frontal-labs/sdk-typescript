/**
 * @frontal-labs/functions
 *
 * Deploy and manage serverless functions on Frontal.
 */

import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { FunctionsService } from "./service";

/** Config for standalone usage without @frontal-labs/core */
export interface FunctionsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/** Create from a FrontalClient instance */
export function createFunctionsClient(client: FrontalClient): FunctionsService;
/** Create standalone with just config */
export function createFunctionsClient(
  config: FunctionsClientConfig
): FunctionsService;
export function createFunctionsClient(
  clientOrConfig: FrontalClient | FunctionsClientConfig
): FunctionsService {
  if (clientOrConfig instanceof FrontalClient) {
    return new FunctionsService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_FUNCTIONS_API_URL ??
      process.env.FRONTAL_API_URL ??
      "https://api.frontal.dev/v1",
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new FunctionsService(http);
}

// Default instance that works automatically with environment variables
let _functionsCache: FunctionsService | undefined;
export const functions = new Proxy<FunctionsService>({} as FunctionsService, {
  get(_t, prop) {
    const inst = (_functionsCache ??= createFunctionsClient(
      getDefaultClient()
    ));
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

// New Pattern B exports
export { FunctionsService } from "./service";

export { DEFAULT_FUNCTIONS_BASE_URL, VERSION } from "./constants";
export type {
  APIResponse,
  ErrorResponse,
  FunctionConfig,
  FunctionEntry,
  FunctionsConfig,
  InvocationStats,
  InvokeOptions,
} from "./schemas";

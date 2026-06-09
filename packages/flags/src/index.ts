import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_FLAGS_BASE_URL, VERSION } from "./constants";
import { FlagsService } from "./service";

export interface FlagsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createFlagsClient(client: FrontalClient): FlagsService;
export function createFlagsClient(config: FlagsClientConfig): FlagsService;
export function createFlagsClient(
  clientOrConfig: FrontalClient | FlagsClientConfig
): FlagsService {
  if (clientOrConfig instanceof FrontalClient) {
    return new FlagsService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_FLAGS_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_FLAGS_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new FlagsService(http);
}

let _flagsCache: FlagsService | undefined;
export const flags = new Proxy<FlagsService>({} as FlagsService, {
  get(_t, prop) {
    const inst = (_flagsCache ??= new FlagsService(
      getDefaultClient().httpClient
    ));
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_FLAGS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export {
  evaluateFlag,
  evaluateFlagWithRollout,
  hashContext,
  matchesRule,
} from "./evaluator";
export { FlagCache } from "./cache";
export type { FlagCacheConfig } from "./cache";
export { FlagsService } from "./service";
export {
  TargetingNamespace,
  RolloutsNamespace,
  ExperimentsNamespace,
} from "./service";

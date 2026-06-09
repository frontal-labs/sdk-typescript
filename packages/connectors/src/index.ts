import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_CONNECTORS_BASE_URL } from "./constants";
import { ConnectorsService } from "./service";

export interface ConnectorsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createConnectorsClient(
  clientOrConfig: FrontalClient | ConnectorsClientConfig
): ConnectorsService {
  if (clientOrConfig instanceof FrontalClient) {
    return new ConnectorsService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_CONNECTORS_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_CONNECTORS_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new ConnectorsService(http);
}

let _connectorsCache: ConnectorsService | undefined;
export const connectors = new Proxy<ConnectorsService>(
  {} as ConnectorsService,
  {
    get(_t, prop) {
      if (!_connectorsCache) {
        _connectorsCache = new ConnectorsService(getDefaultClient().httpClient);
      }
      const inst = _connectorsCache;
      const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
      return typeof val === "function"
        ? (val as (...args: unknown[]) => unknown).bind(inst)
        : val;
    },
  }
);

export { DEFAULT_CONNECTORS_BASE_URL, VERSION } from "./constants";
export { Installation } from "./installation";
export * from "./schemas";
export {
  ConnectorsService,
  InstallationsNamespace,
} from "./service";

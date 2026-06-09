import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_CONNECTORS_BASE_URL, VERSION } from "./constants";
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
    return new ConnectorsService(clientOrConfig._http);
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

export const connectors = new ConnectorsService(getDefaultClient()._http);

export { DEFAULT_CONNECTORS_BASE_URL, VERSION } from "./constants";
export { Installation } from "./installation";
export * from "./schemas";
export {
  ConnectorsService,
  InstallationsNamespace,
} from "./service";

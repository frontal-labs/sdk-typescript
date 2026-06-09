import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_INTEGRATIONS_BASE_URL, VERSION } from "./constants";
import { IntegrationsService } from "./service";

export interface IntegrationsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createIntegrationsClient(
  clientOrConfig: FrontalClient | IntegrationsClientConfig
): IntegrationsService {
  if (clientOrConfig instanceof FrontalClient) {
    return new IntegrationsService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_INTEGRATIONS_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_INTEGRATIONS_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new IntegrationsService(http);
}

let _integrationsCache: IntegrationsService | undefined;
export const integrations = new Proxy<IntegrationsService>(
  {} as IntegrationsService,
  {
    get(_t, prop) {
      const inst = (_integrationsCache ??= new IntegrationsService(
        getDefaultClient().httpClient
      ));
      const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
      return typeof val === "function"
        ? (val as (...args: unknown[]) => unknown).bind(inst)
        : val;
    },
  }
);

export { DEFAULT_INTEGRATIONS_BASE_URL, VERSION } from "./constants";
export { Integration } from "./integration";
export * from "./schemas";
export {
  IntegrationsService,
  ProvidersNamespace,
  PolicyNamespace,
} from "./service";

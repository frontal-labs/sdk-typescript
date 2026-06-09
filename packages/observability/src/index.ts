import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_OBSERVABILITY_BASE_URL, VERSION } from "./constants";
import { ObservabilityService } from "./service";

export interface ObservabilityClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createObservabilityClient(
  client: FrontalClient
): ObservabilityService;
export function createObservabilityClient(
  config: ObservabilityClientConfig
): ObservabilityService;
export function createObservabilityClient(
  clientOrConfig: FrontalClient | ObservabilityClientConfig
): ObservabilityService {
  if (clientOrConfig instanceof FrontalClient) {
    return new ObservabilityService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_OBSERVABILITY_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_OBSERVABILITY_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new ObservabilityService(http);
}

let _observabilityCache: ObservabilityService | undefined;
export const observability = new Proxy<ObservabilityService>(
  {} as ObservabilityService,
  {
    get(_t, prop) {
      const inst = (_observabilityCache ??= new ObservabilityService(
        getDefaultClient().httpClient
      ));
      const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
      return typeof val === "function"
        ? (val as (...args: unknown[]) => unknown).bind(inst)
        : val;
    },
  }
);

export { DEFAULT_OBSERVABILITY_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { ObservabilityService } from "./service";
export {
  LogsNamespace,
  MetricsNamespace,
  TracesNamespace,
  AlertsNamespace,
  DashboardsNamespace,
} from "./service";

export { createOtlpExporter, createConsoleExporter } from "./exporters";
export type {
  ExporterConfig,
  OtlpExporterConfig,
  ConsoleExporterConfig,
} from "./exporters";

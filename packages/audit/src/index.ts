import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_AUDIT_BASE_URL, VERSION } from "./constants";
import { AuditService } from "./service";

export interface AuditClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createAuditClient(client: FrontalClient): AuditService;
export function createAuditClient(config: AuditClientConfig): AuditService;
export function createAuditClient(
  clientOrConfig: FrontalClient | AuditClientConfig
): AuditService {
  if (clientOrConfig instanceof FrontalClient) {
    return new AuditService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_AUDIT_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_AUDIT_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new AuditService(http);
}

export const audit = new AuditService(getDefaultClient()._http);

export { DEFAULT_AUDIT_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { AuditService } from "./service";

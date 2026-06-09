import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_AUDIT_BASE_URL } from "./constants";
import { AuditService } from "./service";

export interface AuditClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
export function createAuditClient(
  config: AuditClientConfig | FrontalClient
): AuditService;
export function createAuditClient(
  clientOrConfig: FrontalClient | AuditClientConfig
): AuditService {
  if (clientOrConfig instanceof FrontalClient) {
    return new AuditService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_AUDIT_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_AUDIT_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new AuditService(http);
}

let _auditCache: AuditService | undefined;
export const audit = new Proxy<AuditService>({} as AuditService, {
  get(_t, prop) {
    if (!_auditCache) {
      _auditCache = new AuditService(getDefaultClient().httpClient);
    }
    const inst = _auditCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_AUDIT_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { AuditService, EventsNamespace } from "./service";

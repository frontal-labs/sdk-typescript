import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_AUDIT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { AuditSdk } from "./sdk";
import { env } from "@frontal-labs/core";

/** Configuration options for creating an Audit API client. */
export interface AuditClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Audit API. Defaults to `DEFAULT_AUDIT_BASE_URL`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests. */
  maxRetries?: number;
}

/**
 * Create an Audit SDK client.
 * @param config - Either a `FrontalClient` instance or an `AuditClientConfig` object.
 * @returns A configured `AuditSdk` instance.
 */
export function createAuditClient(
  config: AuditClientConfig | FrontalClient
): AuditSdk;

/**
 * Create an Audit SDK client.
 * @param clientOrConfig - Either a `FrontalClient` instance or an `AuditClientConfig` object.
 * @returns A configured `AuditSdk` instance.
 */
export function createAuditClient(
  clientOrConfig: FrontalClient | AuditClientConfig
): AuditSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new AuditSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_AUDIT_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new AuditSdk(http);
}

let _auditCache: AuditSdk | undefined;

/**
 * Default singleton Audit SDK instance backed by the default {@link FrontalClient}.
 * Lazily initialized on first access.
 */
export const audit = new Proxy<AuditSdk>({} as AuditSdk, {
  get(_t, prop) {
    if (!_auditCache) {
      _auditCache = createAuditClient(getDefaultClient());
    }
    const inst = _auditCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

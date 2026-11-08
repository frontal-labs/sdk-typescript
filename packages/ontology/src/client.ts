import {
  env,
  FrontalClient,
  getDefaultClient,
  HttpClient,
  type Interceptor,
} from "@frontal-labs/core";
import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_ONTOLOGY_BASE_URL,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { lazySingleton } from "./lazy-singleton";
import { OntologySdk } from "./sdk";

/**
 * Configuration for creating an {@link OntologySdk} client standalone.
 *
 * @property apiKey - Frontal API key.
 * @property baseUrl - Override the default ontology API base URL.
 * @property timeout - Request timeout in milliseconds (default 30_000).
 * @property maxRetries - Maximum number of retry attempts (default 3).
 */
export interface OntologyClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  /** Optional interceptor(s) applied to the HTTP client (e.g. governance policy enforcement). */
  interceptors?: Interceptor[];
}

/**
 * Creates an {@link OntologySdk} from either an existing {@link FrontalClient}
 * or a plain configuration object.
 *
 * @param config - A pre-configured FrontalClient or config options.
 * @returns A fully-initialized OntologySdk.
 */
export function createOntologyClient(
  config: OntologyClientConfig | FrontalClient
): OntologySdk;

export function createOntologyClient(
  clientOrConfig: FrontalClient | OntologyClientConfig
): OntologySdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new OntologySdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    serviceName: "ontology",
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_ONTOLOGY_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
    ...(clientOrConfig.interceptors === undefined
      ? {}
      : { interceptors: clientOrConfig.interceptors }),
  });
  return new OntologySdk(http.intercepted);
}

/**
 * Convenience singleton that lazily creates an {@link OntologySdk} using the
 * default environment configuration.
 *
 * @example
 * ```ts
 * import { ontology } from "@frontal-labs/ontology";
 * const models = await ontology.schemas.list();
 * ```
 */
export const ontology: OntologySdk = lazySingleton(() =>
  createOntologyClient(getDefaultClient())
);

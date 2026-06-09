import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { OntologyService } from "./service";

/** Config for standalone usage without @frontal-labs/core */
export interface OntologyClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/** Create from a FrontalClient instance */
export function createOntologyClient(client: FrontalClient): OntologyService;
/** Create standalone with just config */
export function createOntologyClient(
  config: OntologyClientConfig
): OntologyService;
export function createOntologyClient(
  clientOrConfig: FrontalClient | OntologyClientConfig
): OntologyService {
  if (clientOrConfig instanceof FrontalClient) {
    return new OntologyService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_ONTOLOGY_API_URL ??
      process.env.FRONTAL_API_URL ??
      "https://api.frontal.dev/v1",
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new OntologyService(http);
}

// Default instance that works automatically with environment variables
let _ontologyCache: OntologyService | undefined;
export const ontology = new Proxy<OntologyService>({} as OntologyService, {
  get(_t, prop) {
    const inst = (_ontologyCache ??= new OntologyService(
      getDefaultClient().httpClient
    ));
    const val = (inst as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export * from "./schemas";
export { OntologyService } from "./service";

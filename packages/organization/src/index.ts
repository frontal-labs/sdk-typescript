import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_ORG_BASE_URL, VERSION } from "./constants";
import { OrganizationService } from "./service";

export interface OrganizationClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createOrganizationClient(
  client: FrontalClient
): OrganizationService;
export function createOrganizationClient(
  config: OrganizationClientConfig
): OrganizationService;
export function createOrganizationClient(
  clientOrConfig: FrontalClient | OrganizationClientConfig
): OrganizationService {
  if (clientOrConfig instanceof FrontalClient) {
    return new OrganizationService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_ORG_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_ORG_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new OrganizationService(http);
}

let _organizationCache: OrganizationService | undefined;
export const organization = new Proxy<OrganizationService>(
  {} as OrganizationService,
  {
    get(_t, prop) {
      const inst = (_organizationCache ??= new OrganizationService(
        getDefaultClient().httpClient
      ));
      const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
      return typeof val === "function"
        ? (val as (...args: unknown[]) => unknown).bind(inst)
        : val;
    },
  }
);

export { DEFAULT_ORG_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { OrganizationService } from "./service";
export {
  TenantsNamespace,
  TeamsNamespace,
  MembersNamespace,
  RolesNamespace,
  InvitationsNamespace,
} from "./service";

import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_AUTH_BASE_URL, VERSION } from "./constants";
import { AuthService } from "./service";

export interface AuthClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createAuthClient(client: FrontalClient): AuthService;
export function createAuthClient(config: AuthClientConfig): AuthService;
export function createAuthClient(
  clientOrConfig: FrontalClient | AuthClientConfig
): AuthService {
  if (clientOrConfig instanceof FrontalClient) {
    return new AuthService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_AUTH_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_AUTH_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new AuthService(http);
}

export const auth = new AuthService(getDefaultClient()._http);

export { DEFAULT_AUTH_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export {
  AuthAdminService,
  AuthService,
  InviteNamespace,
  MfaNamespace,
  SessionNamespace,
  UsersNamespace,
} from "./service";

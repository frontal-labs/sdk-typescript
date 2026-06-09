import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_AUTH_BASE_URL } from "./constants";
import { AuthService } from "./service";

export interface AuthClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
export function createAuthClient(
  config: AuthClientConfig | FrontalClient
): AuthService;
export function createAuthClient(
  clientOrConfig: FrontalClient | AuthClientConfig
): AuthService {
  if (clientOrConfig instanceof FrontalClient) {
    return new AuthService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_AUTH_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_AUTH_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new AuthService(http);
}

let _authCache: AuthService | undefined;
export const auth = new Proxy<AuthService>({} as AuthService, {
  get(_t, prop) {
    if (!_authCache) {
      _authCache = new AuthService(getDefaultClient().httpClient);
    }
    const inst = _authCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

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

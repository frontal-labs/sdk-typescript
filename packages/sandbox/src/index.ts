import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_SANDBOX_BASE_URL, VERSION } from "./constants";
import { SandboxService } from "./service";

export interface SandboxClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createSandboxClient(client: FrontalClient): SandboxService;
export function createSandboxClient(
  config: SandboxClientConfig
): SandboxService;
export function createSandboxClient(
  clientOrConfig: FrontalClient | SandboxClientConfig
): SandboxService {
  if (clientOrConfig instanceof FrontalClient) {
    return new SandboxService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_SANDBOX_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_SANDBOX_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new SandboxService(http);
}

export const sandbox = new SandboxService(getDefaultClient()._http);

export { DEFAULT_SANDBOX_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { SandboxService } from "./service";

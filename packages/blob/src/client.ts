import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_BLOB_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { BlobSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface BlobClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createBlobClient(
  config: BlobClientConfig | FrontalClient
): BlobSdk;

export function createBlobClient(
  clientOrConfig: FrontalClient | BlobClientConfig
): BlobSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new BlobSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_BLOB_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new BlobSdk(http);
}

let _blobCache: BlobSdk | undefined;

export const blob = new Proxy<BlobSdk>({} as BlobSdk, {
  get(_t, prop) {
    if (!_blobCache) {
      _blobCache = createBlobClient(getDefaultClient());
    }
    const inst = _blobCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

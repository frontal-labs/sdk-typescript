import { FrontalClient, getDefaultClient, HttpClient } from "frontal/core";
import {
  DEFAULT_BLOB_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { BlobSdk } from "./sdk";
import { env } from "frontal/core";

/**
 * Configuration for creating a {@link BlobSdk} client standalone.
 *
 * @property apiKey - Frontal API key.
 * @property baseUrl - Override the default blob API base URL.
 * @property timeout - Request timeout in milliseconds (default 30_000).
 * @property maxRetries - Maximum number of retry attempts (default 3).
 */
export interface BlobClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Creates a {@link BlobSdk} from either an existing {@link FrontalClient}
 * or a plain configuration object.
 *
 * @param config - A pre-configured FrontalClient or config options.
 * @returns A fully-initialized BlobSdk.
 */
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

/**
 * Convenience singleton that lazily creates a {@link BlobSdk} using the
 * default environment configuration.
 *
 * @example
 * ```ts
 * import { blob } from "@frontal-labs/blob";
 * const objects = await blob.list({ bucket: "my-bucket" });
 * ```
 */
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

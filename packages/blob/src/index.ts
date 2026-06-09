/**
 * @frontal-labs/blob
 *
 * Simple, scalable object storage for Frontal.
 * Fully compatible with Blob and S3 standard patterns.
 */

import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { BlobService } from "./service";

/** Config for standalone usage without @frontal-labs/core */
export interface BlobClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/** Create from a FrontalClient instance */
export function createBlobClient(client: FrontalClient): BlobService;
/** Create standalone with just config */
export function createBlobClient(config: BlobClientConfig): BlobService;
export function createBlobClient(
  clientOrConfig: FrontalClient | BlobClientConfig
): BlobService {
  if (clientOrConfig instanceof FrontalClient) {
    return new BlobService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_BLOB_API_URL ??
      process.env.FRONTAL_API_URL ??
      "https://api.frontal.dev/v1",
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new BlobService(http);
}

// Default instance
export const blob = createBlobClient(getDefaultClient());

// New Pattern B exports
export { BlobService } from "./service";

export { VERSION } from "./constants";
export type {
  BlobObject,
  BucketConfig,
  ListObjectsResult,
  SignedUrlOptions,
} from "./schemas";

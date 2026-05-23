/**
 * @frontal/blob
 *
 * Simple, scalable object storage for Frontal.
 * Fully compatible with Blob and S3 standard patterns.
 */

import { FrontalClient, getDefaultClient, HttpClient } from "@frontal/core";
import { BlobService } from "./client";

/** Config for standalone usage without @frontal/core */
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
    return new BlobService(clientOrConfig._http);
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
export { BlobService } from "./client";

// Deprecated Pattern A compat
export { Storage } from "./compat";

// Backward compatibility
export const storage = blob;

export {
  DEFAULT_BLOB_BASE_URL as DEFAULT_STORAGE_BASE_URL,
  VERSION,
} from "./constants";
export type {
  APIResponse,
  BlobObject,
  BucketConfig,
  ErrorResponse,
  ListObjectsResult,
  SignedUrlOptions,
  StorageConfig,
  StorageObject,
} from "./types";

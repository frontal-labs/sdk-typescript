/**
 * @frontal-labs/blob
 *
 * Simple, scalable object storage for Frontal.
 * Fully compatible with Blob and S3 standard patterns.
 */

export { createBlobClient, blob, type BlobClientConfig } from "./client";
export { DEFAULT_BLOB_BASE_URL, VERSION } from "./constants";
export { BlobSdk } from "./sdk";
export * from "./schemas";

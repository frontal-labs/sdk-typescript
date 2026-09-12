/**
 * @frontal-labs/blob
 *
 * Simple, scalable object storage for Frontal.
 * Fully compatible with Blob and S3 standard patterns.
 */

export { type BlobClientConfig, blob, createBlobClient } from "./client";
export { DEFAULT_BLOB_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { BlobSdk } from "./sdk";

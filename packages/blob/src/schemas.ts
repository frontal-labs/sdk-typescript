import { z } from "zod";

export type { APIResponse, ErrorResponse } from "@frontal-labs/core";

/**
 * Zod schema for bucket configuration.
 */
export const bucketConfigSchema = z.object({
  name: z.string().min(1),
  public: z.boolean().optional(),
});

/**
 * Bucket configuration.
 */
export type BucketConfig = z.infer<typeof bucketConfigSchema>;

/**
 * Zod schema for a blob object.
 */
export const blobObjectSchema = z.object({
  key: z.string(),
  size: z.number().int().min(0),
  contentType: z.string(),
  lastModified: z.iso.datetime(),
  etag: z.string(),
  metadata: z.record(z.string(), z.string()).optional(),
});

/**
 * A blob object.
 */
export type BlobObject = z.infer<typeof blobObjectSchema>;

// Backward compatibility exports
export const storageObjectSchema = blobObjectSchema;
export type StorageObject = BlobObject;

/**
 * Result of listing objects in a bucket.
 */
export const listObjectsResultSchema = z.object({
  objects: z.array(blobObjectSchema),
  prefix: z.string().optional(),
  continuationToken: z.string().optional(),
});

/**
 * List objects result.
 */
export type ListObjectsResult = z.infer<typeof listObjectsResultSchema>;

/**
 * Options for generating a signed URL.
 */
export const signedUrlOptionsSchema = z.object({
  key: z.string(),
  expiresIn: z.number().int().positive().default(3600), // seconds
  /**
   * @deprecated Has no effect. The service does not accept an operation, so
   * the SDK validates the value and does not send it. Omit it.
   */
  operation: z.enum(["read", "write", "delete"]).optional(),
});

/**
 * Signed URL options.
 */
export type SignedUrlOptions = z.input<typeof signedUrlOptionsSchema>;

/**
 * Configuration for Blob client.
 */
export const blobConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.url().optional(),
});

/**
 * Blob configuration.
 */
export type BlobConfig = z.infer<typeof blobConfigSchema>;

// Backward compatibility exports
export const storageConfigSchema = blobConfigSchema;
export type StorageConfig = BlobConfig;

/**
 * Interface for Blob client. Methods return their results directly and
 * throw on failure, matching {@link BlobSdk}.
 */
export interface IBlobClient {
  /**
   * Uploads data to a bucket.
   */
  upload(params: {
    bucket: string;
    key: string;
    data: Blob | Buffer | ReadableStream | ArrayBuffer | Uint8Array;
    contentType?: string;
  }): Promise<void>;
  /**
   * Downloads data from a bucket as a Blob.
   */
  download(params: { bucket: string; key: string }): Promise<Blob>;
  /**
   * Downloads data from a bucket as a stream.
   */
  downloadStream(params: {
    bucket: string;
    key: string;
  }): Promise<ReadableStream<Uint8Array>>;
  /**
   * Deletes an object from a bucket.
   */
  delete(params: { bucket: string; key: string }): Promise<void>;
  /**
   * Lists objects in a bucket with optional prefix, limit, and offset.
   */
  list(params: {
    bucket: string;
    prefix?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListObjectsResult>;
  /**
   * Generates a signed URL for temporary access.
   */
  getSignedUrl(params: {
    bucket: string;
    options: SignedUrlOptions;
  }): Promise<string>;
  /**
   * Copies an object within or across buckets.
   */
  copyObject(params: {
    sourceBucket: string;
    sourceKey: string;
    destBucket: string;
    destKey: string;
  }): Promise<void>;
  /**
   * Moves (renames) an object.
   */
  moveObject(params: {
    sourceBucket: string;
    sourceKey: string;
    destBucket: string;
    destKey: string;
  }): Promise<void>;
  /**
   * Retrieves metadata for a specific object.
   */
  getMetadata(params: { bucket: string; key: string }): Promise<BlobObject>;
}

// Backward compatibility exports
export interface IStorageClient extends IBlobClient {}

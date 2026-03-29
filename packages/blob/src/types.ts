import { z } from "zod";

/**
 * Standard error response structure.
 */
export interface ErrorResponse {
	message: string;
	statusCode: number;
	name: string;
}

/**
 * Standard API response structure.
 */
export interface APIResponse<T> {
	data: T | null;
	error: ErrorResponse | null;
	headers: Record<string, string> | null;
}

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
	size: z.number().int().nonnegative(),
	contentType: z.string(),
	lastModified: z.string().datetime(),
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
	operation: z.enum(["read", "write", "delete"]),
});

/**
 * Signed URL options.
 */
export type SignedUrlOptions = z.infer<typeof signedUrlOptionsSchema>;

/**
 * Configuration for Blob client.
 */
export const blobConfigSchema = z.object({
	apiKey: z.string().optional(),
	baseUrl: z.string().url().optional(),
});

/**
 * Blob configuration.
 */
export type BlobConfig = z.infer<typeof blobConfigSchema>;

// Backward compatibility exports
export const storageConfigSchema = blobConfigSchema;
export type StorageConfig = BlobConfig;

/**
 * Interface for Blob client.
 */
export interface IBlobClient {
	/**
	 * Uploads data to a bucket.
	 */
	upload(
		bucket: string,
		key: string,
		data: BodyInit,
		contentType?: string,
	): Promise<APIResponse<void>>;
	/**
	 * Downloads data from a bucket as a Blob.
	 */
	download(bucket: string, key: string): Promise<APIResponse<Blob>>;
	/**
	 * Downloads data from a bucket as a stream.
	 */
	downloadStream(
		bucket: string,
		key: string,
	): Promise<APIResponse<ReadableStream<Uint8Array>>>;
	/**
	 * Deletes an object from a bucket.
	 */
	delete(bucket: string, key: string): Promise<APIResponse<void>>;
	/**
	 * Lists objects in a bucket with optional prefix.
	 */
	list(
		bucket: string,
		prefix?: string,
	): Promise<APIResponse<ListObjectsResult>>;
	/**
	 * Generates a signed URL for temporary access.
	 */
	getSignedUrl(
		bucket: string,
		options: SignedUrlOptions,
	): Promise<APIResponse<string>>;
	/**
	 * Copies an object within or across buckets.
	 */
	copyObject(
		sourceBucket: string,
		sourceKey: string,
		destBucket: string,
		destKey: string,
	): Promise<APIResponse<void>>;
	/**
	 * Moves (renames) an object.
	 */
	moveObject(
		sourceBucket: string,
		sourceKey: string,
		destBucket: string,
		destKey: string,
	): Promise<APIResponse<void>>;
	/**
	 * Retrieves metadata for a specific object.
	 */
	getMetadata(bucket: string, key: string): Promise<APIResponse<BlobObject>>;
}

// Backward compatibility exports
export interface IStorageClient extends IBlobClient {}

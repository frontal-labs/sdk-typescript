import type { HttpClient } from "@frontal-labs/core";
import {
  type BlobObject,
  blobObjectSchema,
  type ListObjectsResult,
  listObjectsResultSchema,
  type SignedUrlOptions,
  signedUrlOptionsSchema,
} from "./schemas";

/**
 * Service for interacting with Frontal Blob storage.
 *
 * **Note:** This service currently routes through the Storage Lake backend
 * (`/storage/lake/lake/tables`). There is no dedicated `/blob` API service
 * in the gateway. The blob storage abstraction is provided by the Storage
 * Lake infrastructure.
 *
 * @example
 * ```typescript
 * import { createBlobClient } from '@frontal-labs/blob'
 * import { FrontalClient } from '@frontal-labs/core'
 *
 * const client = new FrontalClient({ apiKey: 'frt_...' })
 * const blob = createBlobClient(client)
 * await blob.upload({ bucket: 'my-bucket', key: 'file.pdf', data, contentType: 'application/pdf' })
 * ```
 */
export class BlobService {
  private static readonly BASE_PATH = "/storage/lake/lake/tables";

  constructor(private readonly http: HttpClient) {}

  private command(operation: string, payload: Record<string, unknown> = {}) {
    return { operation, ...payload };
  }

  /**
   * Uploads data to a bucket.
   * @param params - The upload parameters.
   * @param params.bucket - The bucket name.
   * @param params.key - The object key.
   * @param params.data - The data to upload.
   * @param params.contentType - The content type of the data.
   */
  async upload(params: {
    bucket: string;
    key: string;
    data: Buffer | ReadableStream;
    contentType?: string;
  }): Promise<void> {
    const {
      bucket,
      key,
      data,
      contentType = "application/octet-stream",
    } = params;
    await this.http.post(
      BlobService.BASE_PATH,
      this.command("blob.upload", { bucket, key, contentType, data })
    );
  }

  /**
   * Downloads data from a bucket as a Blob.
   * @param params - The download parameters.
   * @param params.bucket - The bucket name.
   * @param params.key - The object key.
   */
  async download(params: { bucket: string; key: string }): Promise<Blob> {
    const { bucket, key } = params;
    const response = await this.http.getRaw(
      `/storage/lake/lake/tables/${key}`,
      {
        operation: "blob.download",
        bucket,
      }
    );
    return response.blob();
  }

  /**
   * Downloads data from a bucket as a readable stream.
   * @param params - The download stream parameters.
   * @param params.bucket - The bucket name.
   * @param params.key - The object key.
   * @throws Error if the response has no body stream.
   */
  async downloadStream(params: {
    bucket: string;
    key: string;
  }): Promise<ReadableStream<Uint8Array>> {
    const { bucket, key } = params;
    const response = await this.http.getRaw(
      `/storage/lake/lake/tables/${key}`,
      {
        operation: "blob.download.stream",
        bucket,
      }
    );
    if (!response.body) {
      throw new Error("Response has no body stream");
    }
    return response.body as ReadableStream<Uint8Array>;
  }

  /**
   * Deletes an object from a bucket.
   * @param params - The delete parameters.
   * @param params.bucket - The bucket name.
   * @param params.key - The object key.
   */
  async delete(params: { bucket: string; key: string }): Promise<void> {
    const { bucket, key } = params;
    return this.http.post(
      `/storage/lake/lake/tables/${key}/materializations`,
      this.command("blob.delete", { bucket })
    );
  }

  /**
   * Lists objects in a bucket with optional prefix.
   * @param params - The list parameters.
   * @param params.bucket - The bucket name.
   * @param params.prefix - Optional prefix to filter objects.
   */
  async list(params: {
    bucket: string;
    prefix?: string;
  }): Promise<ListObjectsResult> {
    const { bucket, prefix } = params;
    const queryParams = this.command("blob.list", {
      bucket,
      ...(prefix ? { prefix } : {}),
    });
    return this.http.get<ListObjectsResult>(
      BlobService.BASE_PATH,
      queryParams,
      listObjectsResultSchema
    );
  }

  /**
   * Generates a signed URL for temporary access.
   * @param params - The signed URL parameters.
   * @param params.bucket - The bucket name.
   * @param params.options - Signed URL options.
   */
  async getSignedUrl(params: {
    bucket: string;
    options: SignedUrlOptions;
  }): Promise<string> {
    const { bucket, options } = params;
    const validated = signedUrlOptionsSchema.parse(options);
    return this.http.post<string>(
      `/storage/lake/lake/tables/${bucket}/materializations`,
      this.command("blob.sign", validated)
    );
  }

  /**
   * Copies an object within or across buckets.
   * @param params - The copy parameters.
   * @param params.sourceBucket - The source bucket name.
   * @param params.sourceKey - The source object key.
   * @param params.destBucket - The destination bucket name.
   * @param params.destKey - The destination object key.
   */
  async copyObject(params: {
    sourceBucket: string;
    sourceKey: string;
    destBucket: string;
    destKey: string;
  }): Promise<void> {
    const { sourceBucket, sourceKey, destBucket, destKey } = params;
    return this.http.post(
      `/storage/lake/lake/tables/${sourceKey}/materializations`,
      this.command("blob.copy", {
        sourceBucket,
        destBucket,
        destKey,
      })
    );
  }

  /**
   * Moves (renames) an object.
   * @param params - The move parameters.
   * @param params.sourceBucket - The source bucket name.
   * @param params.sourceKey - The source object key.
   * @param params.destBucket - The destination bucket name.
   * @param params.destKey - The destination object key.
   */
  async moveObject(params: {
    sourceBucket: string;
    sourceKey: string;
    destBucket: string;
    destKey: string;
  }): Promise<void> {
    const { sourceBucket, sourceKey, destBucket, destKey } = params;
    return this.http.post(
      `/storage/lake/lake/tables/${sourceKey}/materializations`,
      this.command("blob.move", {
        sourceBucket,
        destBucket,
        destKey,
      })
    );
  }

  /**
   * Retrieves metadata for a specific object.
   * @param params - The metadata parameters.
   * @param params.bucket - The bucket name.
   * @param params.key - The object key.
   */
  async getMetadata(params: {
    bucket: string;
    key: string;
  }): Promise<BlobObject> {
    const { bucket, key } = params;
    return this.http.get<BlobObject>(
      `/storage/lake/lake/tables/${key}`,
      { operation: "blob.metadata", bucket },
      blobObjectSchema
    );
  }
}

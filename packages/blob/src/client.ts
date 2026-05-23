import type { HttpClient } from "@frontal/core";
import {
  type BlobObject,
  blobObjectSchema,
  type ListObjectsResult,
  listObjectsResultSchema,
  type SignedUrlOptions,
  signedUrlOptionsSchema,
} from "./types";

/**
 * Service for interacting with Frontal Blob storage.
 * Takes an HttpClient and returns data directly, throwing typed errors.
 *
 * @example
 * ```typescript
 * import { createBlobClient } from '@frontal/blob'
 * import { FrontalClient } from '@frontal/core'
 *
 * const client = new FrontalClient({ apiKey: 'frt_...' })
 * const blob = createBlobClient(client)
 * await blob.upload('my-bucket', 'file.pdf', data, 'application/pdf')
 * ```
 */
export class BlobService {
  constructor(private readonly http: HttpClient) {}

  private command(operation: string, payload: Record<string, unknown> = {}) {
    return { operation, ...payload };
  }

  /**
   * Uploads data to a bucket.
   * @param bucket - The bucket name.
   * @param key - The object key.
   * @param data - The data to upload.
   * @param contentType - The content type of the data.
   */
  async upload(
    bucket: string,
    key: string,
    data: Buffer | ReadableStream,
    contentType = "application/octet-stream"
  ): Promise<void> {
    await this.http.post(
      "/storage/lake/lake/tables",
      this.command("blob.upload", { bucket, key, contentType, data })
    );
  }

  /**
   * Downloads data from a bucket as a Blob.
   * @param bucket - The bucket name.
   * @param key - The object key.
   */
  async download(bucket: string, key: string): Promise<Blob> {
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
   * @param bucket - The bucket name.
   * @param key - The object key.
   * @throws Error if the response has no body stream.
   */
  async downloadStream(
    bucket: string,
    key: string
  ): Promise<ReadableStream<Uint8Array>> {
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
   * @param bucket - The bucket name.
   * @param key - The object key.
   */
  async delete(bucket: string, key: string): Promise<void> {
    return this.http.post(
      `/storage/lake/lake/tables/${key}/materializations`,
      this.command("blob.delete", { bucket })
    );
  }

  /**
   * Lists objects in a bucket with optional prefix.
   * @param bucket - The bucket name.
   * @param prefix - Optional prefix to filter objects.
   */
  async list(bucket: string, prefix?: string): Promise<ListObjectsResult> {
    const params = this.command("blob.list", {
      bucket,
      ...(prefix ? { prefix } : {}),
    });
    return this.http.get<ListObjectsResult>(
      "/storage/lake/lake/tables",
      params,
      listObjectsResultSchema
    );
  }

  /**
   * Generates a signed URL for temporary access.
   * @param bucket - The bucket name.
   * @param options - Signed URL options.
   */
  async getSignedUrl(
    bucket: string,
    options: SignedUrlOptions
  ): Promise<string> {
    const validated = signedUrlOptionsSchema.parse(options);
    return this.http.post<string>(
      `/storage/lake/lake/tables/${bucket}/materializations`,
      this.command("blob.sign", validated)
    );
  }

  /**
   * Copies an object within or across buckets.
   */
  async copyObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<void> {
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
   */
  async moveObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<void> {
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
   * @param bucket - The bucket name.
   * @param key - The object key.
   */
  async getMetadata(bucket: string, key: string): Promise<BlobObject> {
    return this.http.get<BlobObject>(
      `/storage/lake/lake/tables/${key}`,
      { operation: "blob.metadata", bucket },
      blobObjectSchema
    );
  }
}

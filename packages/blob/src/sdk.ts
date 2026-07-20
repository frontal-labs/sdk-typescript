import type { HttpClient } from "@frontal-labs/_core";
import {
  type BlobObject,
  blobObjectSchema,
  type ListObjectsResult,
  type SignedUrlOptions,
  signedUrlOptionsSchema,
} from "./schemas";

/**
 * Service for interacting with Frontal Blob storage.
 *
 * Routes map to the Blob object-store backend under the versioned base URL:
 * objects live at `/v1/blob/object/{bucket}/{key}` and buckets at
 * `/v1/blob/bucket/{bucket}`. Paths are written without the leading `/v1`
 * because the client base URL already includes it.
 *
 * @example
 * ```typescript
 * import { createBlobClient } from '@frontal-labs/blob'
 * import { FrontalClient } from '@frontal-labs/_core'
 *
 * const client = new FrontalClient({ apiKey: 'frt_...' })
 * const blob = createBlobClient(client)
 * await blob.upload({ bucket: 'my-bucket', key: 'file.pdf', data, contentType: 'application/pdf' })
 * ```
 */
export class BlobSdk {
  private static readonly OBJECT_PATH = "/blob/object";

  /**
   * @param http - The HTTP client used to make API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * Uploads data to a bucket.
   * @param params - The upload parameters.
   * @param params.bucket - The bucket name.
   * @param params.key - The object key (may contain `/` for folders).
   * @param params.data - The data to upload.
   * @param params.contentType - The content type of the data.
   */
  async upload(params: {
    bucket: string;
    key: string;
    data: Blob | Buffer | ReadableStream | ArrayBuffer | Uint8Array;
    contentType?: string;
  }): Promise<void> {
    const {
      bucket,
      key,
      data,
      contentType = "application/octet-stream",
    } = params;
    const form = new FormData();
    const blob =
      data instanceof Blob
        ? data
        : new Blob([data as BlobPart], {
            type: contentType,
          });
    form.append("file", blob, key.split("/").pop() ?? key);
    form.append("cacheControl", "3600");
    await this.http.postFormData(
      `${BlobSdk.OBJECT_PATH}/${bucket}/${key}`,
      form
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
      `${BlobSdk.OBJECT_PATH}/${bucket}/${key}`
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
      `${BlobSdk.OBJECT_PATH}/${bucket}/${key}`
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
    return this.http.delete(`${BlobSdk.OBJECT_PATH}/${bucket}/${key}`);
  }

  /**
   * Lists objects in a bucket under an optional prefix.
   * @param params - The list parameters.
   * @param params.bucket - The bucket name.
   * @param params.prefix - Optional prefix to filter objects.
   * @param params.limit - Optional page size.
   * @param params.offset - Optional offset.
   */
  async list(params: {
    bucket: string;
    prefix?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListObjectsResult> {
    const { bucket, prefix = "", limit, offset } = params;
    return this.http.post<ListObjectsResult>(
      `${BlobSdk.OBJECT_PATH}/list/${bucket}`,
      { prefix, limit, offset }
    );
  }

  /**
   * Generates a signed URL for temporary access to an object.
   * @param params - The signed URL parameters.
   * @param params.bucket - The bucket name.
   * @param params.options - Signed URL options (`key`, `expiresIn`).
   * @returns The signed URL.
   */
  async getSignedUrl(params: {
    bucket: string;
    options: SignedUrlOptions;
  }): Promise<string> {
    const { bucket, options } = params;
    const validated = signedUrlOptionsSchema.parse(options);
    const res = await this.http.post<{ signedURL: string }>(
      `${BlobSdk.OBJECT_PATH}/sign/${bucket}/${validated.key}`,
      { expiresIn: validated.expiresIn }
    );
    return res.signedURL;
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
    return this.http.post(`${BlobSdk.OBJECT_PATH}/copy`, {
      bucketId: sourceBucket,
      sourceKey,
      destinationBucket: destBucket,
      destinationKey: destKey,
    });
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
    return this.http.post(`${BlobSdk.OBJECT_PATH}/move`, {
      bucketId: sourceBucket,
      sourceKey,
      destinationBucket: destBucket,
      destinationKey: destKey,
    });
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
      `${BlobSdk.OBJECT_PATH}/info/${bucket}/${key}`,
      undefined,
      blobObjectSchema
    );
  }
}

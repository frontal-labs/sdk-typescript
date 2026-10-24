# API Reference

`@frontal-labs/blob` exposes a `BlobSdk` class and a set of helpers that create
or reuse one. Every method returns its result directly and throws on failure.
There is no `{ data, error }` envelope.

## Creating a client

### blob (default singleton)

A lazily created `BlobSdk` that reads its configuration from environment
variables (`FRONTAL_API_KEY`, optional `FRONTAL_API_URL`, `FRONTAL_ENV`,
`FRONTAL_DEBUG`).

```typescript
import { blob } from "@frontal-labs/blob";

const result = await blob.list({ bucket: "my-bucket" });
```

### createBlobClient

Creates a `BlobSdk` from an existing `FrontalClient` or from a configuration
object.

```typescript
createBlobClient(config: BlobClientConfig | FrontalClient): BlobSdk
```

**Parameters:**
- `config`: Either a `FrontalClient` instance, or a `BlobClientConfig`:
  - `apiKey` (string, required): Frontal API key
  - `baseUrl` (string, optional): Override the blob API base URL
  - `timeout` (number, optional): Request timeout in milliseconds (default `30000`)
  - `maxRetries` (number, optional): Maximum retry attempts (default `3`)
  - `interceptors` (optional): HTTP interceptors, e.g. governance policy enforcement

**Example:**
```typescript
import { createBlobClient } from "@frontal-labs/blob";
import { FrontalClient } from "@frontal-labs/core";

// From a configuration object
const blob = createBlobClient({ apiKey: process.env.FRONTAL_API_KEY! });

// From a shared FrontalClient
const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const shared = createBlobClient(client);
```

### BlobSdk

```typescript
class BlobSdk {
  constructor(http: HttpClient);
}
```

Usually obtained through `createBlobClient` or `blob` rather than constructed
directly.

## Methods

All methods are `async`. Object identity is given by `bucket` and `key`, and
keys may contain `/` to represent folders.

### upload

```typescript
upload(params: {
  bucket: string;
  key: string;
  data: Blob | Buffer | ReadableStream | ArrayBuffer | Uint8Array;
  contentType?: string;
}): Promise<void>
```

Uploads data to a bucket. Overwrites an existing object with the same key.

**Parameters:**
- `bucket`: The bucket name
- `key`: The object key
- `data`: The data to upload. `Blob`, `Buffer`, `ArrayBuffer`, and `Uint8Array` are supported. Strings must be encoded to bytes first (for example with `TextEncoder`).
- `contentType` (optional): MIME type. Defaults to `application/octet-stream`.

**Returns:** `Promise<void>`. Resolves when the upload succeeds; throws `FrontalError` otherwise.

**Example:**
```typescript
import { blob } from "@frontal-labs/blob";

await blob.upload({
  bucket: "my-bucket",
  key: "greetings/hello.txt",
  data: new TextEncoder().encode("Hello, World!"),
  contentType: "text/plain",
});
```

### download

```typescript
download(params: { bucket: string; key: string }): Promise<Blob>
```

Downloads an object fully into memory as a `Blob`.

**Returns:** `Promise<Blob>`

**Example:**
```typescript
const file = await blob.download({ bucket: "my-bucket", key: "documents/report.pdf" });

const url = URL.createObjectURL(file);
const a = document.createElement("a");
a.href = url;
a.download = "report.pdf";
a.click();
```

### downloadStream

```typescript
downloadStream(params: { bucket: string; key: string }): Promise<ReadableStream<Uint8Array>>
```

Downloads an object as a stream of bytes, without buffering the whole object.

**Returns:** `Promise<ReadableStream<Uint8Array>>`. Throws `Error` ("Response has no body stream") if the response has no body.

**Example:**
```typescript
const stream = await blob.downloadStream({ bucket: "my-bucket", key: "large-dataset.csv" });
const reader = stream.getReader();

try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    processChunk(value);
  }
} finally {
  reader.releaseLock();
}
```

### delete

```typescript
delete(params: { bucket: string; key: string }): Promise<void>
```

Deletes an object.

**Returns:** `Promise<void>`

**Example:**
```typescript
await blob.delete({ bucket: "my-bucket", key: "temp/old-file.txt" });
```

### list

```typescript
list(params: {
  bucket: string;
  prefix?: string;
  limit?: number;
  offset?: number;
}): Promise<ListObjectsResult>
```

Lists objects in a bucket, optionally filtered by key prefix and paginated with
`limit` and `offset`.

**Parameters:**
- `bucket`: The bucket name
- `prefix` (optional): Only return keys starting with this prefix
- `limit` (optional): Page size
- `offset` (optional): Number of objects to skip

**Returns:** `Promise<ListObjectsResult>`, where `objects` is an array of `BlobObject`.

**Example:**
```typescript
const page = await blob.list({ bucket: "my-bucket", prefix: "uploads/", limit: 50 });

for (const obj of page.objects) {
  console.log(`${obj.key} (${obj.size} bytes)`);
}
```

### getSignedUrl

```typescript
getSignedUrl(params: { bucket: string; options: SignedUrlOptions }): Promise<string>
```

Generates a signed URL for temporary access to an object.

**Parameters:**
- `bucket`: The bucket name
- `options`: A `SignedUrlOptions` object. `key` is the object key. `expiresIn` is the lifetime in seconds (default `3600`). Only `key` and `expiresIn` are sent to the service. `operation` is deprecated: it is accepted for compatibility, validated if present, and has no effect.

**Returns:** `Promise<string>`, the signed URL.

**Example:**
```typescript
const url = await blob.getSignedUrl({
  bucket: "private-bucket",
  options: {
    key: "sensitive-document.pdf",
    expiresIn: 3600, // 1 hour
  },
});

console.log("Signed URL:", url);
```

### copyObject

```typescript
copyObject(params: {
  sourceBucket: string;
  sourceKey: string;
  destBucket: string;
  destKey: string;
}): Promise<void>
```

Copies an object within or across buckets.

**Example:**
```typescript
await blob.copyObject({
  sourceBucket: "source-bucket",
  sourceKey: "documents/report.pdf",
  destBucket: "archive-bucket",
  destKey: "reports/2024/report.pdf",
});
```

### moveObject

```typescript
moveObject(params: {
  sourceBucket: string;
  sourceKey: string;
  destBucket: string;
  destKey: string;
}): Promise<void>
```

Moves (renames) an object within or across buckets.

**Example:**
```typescript
await blob.moveObject({
  sourceBucket: "temp-bucket",
  sourceKey: "processing/data.json",
  destBucket: "final-bucket",
  destKey: "processed/data.json",
});
```

### getMetadata

```typescript
getMetadata(params: { bucket: string; key: string }): Promise<BlobObject>
```

Retrieves metadata for one object.

**Returns:** `Promise<BlobObject>`

**Example:**
```typescript
const meta = await blob.getMetadata({ bucket: "my-bucket", key: "documents/report.pdf" });

console.log("File size:", meta.size);
console.log("Content type:", meta.contentType);
console.log("Last modified:", meta.lastModified);
console.log("ETag:", meta.etag);
console.log("Custom metadata:", meta.metadata ?? {});
```

## Types

Types are exported from `@frontal-labs/blob`.

### BlobObject

```typescript
type BlobObject = {
  key: string;                          // Object key
  size: number;                         // Size in bytes (integer, >= 0)
  contentType: string;                  // MIME content type
  lastModified: string;                 // ISO 8601 timestamp
  etag: string;                         // Entity tag
  metadata?: Record<string, string>;    // Custom key/value metadata, when present
};
```

`StorageObject` is a backward-compatibility alias of `BlobObject`.

### ListObjectsResult

```typescript
type ListObjectsResult = {
  objects: BlobObject[];
  prefix?: string;
  continuationToken?: string;
};
```

### SignedUrlOptions

```typescript
type SignedUrlOptions = {
  key: string;
  /** @deprecated Has no effect; omit it. */
  operation?: "read" | "write" | "delete";
  expiresIn?: number;   // seconds; defaults to 3600
};
```

`SignedUrlOptions` is the input type (`z.input`), so `expiresIn` is optional for callers.

### BlobConfig

```typescript
type BlobConfig = {
  apiKey?: string;
  baseUrl?: string;     // must be a valid URL when set
};
```

`StorageConfig` is a backward-compatibility alias of `BlobConfig`.

### BucketConfig

```typescript
type BucketConfig = {
  name: string;         // non-empty
  public?: boolean;
};
```

### IBlobClient

The interface implemented by `BlobSdk`. Each method has the signature shown in
[Methods](#methods). `IStorageClient` is a backward-compatibility alias that
extends `IBlobClient` with no additional members.

### ErrorResponse

The shape of the error body returned by the service, re-exported from
`@frontal-labs/core`.

## Errors

Failures are thrown, not returned. The SDK throws `FrontalError` (exported from
`@frontal-labs/core`) for HTTP and API errors. Use `FrontalError.isInstance` to
narrow an unknown error.

| Property     | Type      | Description                                                                 |
|--------------|-----------|-----------------------------------------------------------------------------|
| `code`       | `string`  | Stable error identifier from the API                                        |
| `statusCode` | `number`  | HTTP status code                                                            |
| `requestId`  | `string`  | Request identifier, useful when reporting issues                            |
| `retryable`  | `boolean` | Whether retrying the same request may succeed (rate limits, transient 5xx, network) |
| `fix`        | `string?` | Human-readable next step, when the SDK knows one                            |
| `docs`       | `string?` | Link to documentation for the error, when available                         |
| `rateLimit`  | `object?` | Rate-limit information from response headers, when present                  |

```typescript
import { blob } from "@frontal-labs/blob";
import { FrontalError } from "@frontal-labs/core";

try {
  await blob.delete({ bucket: "my-bucket", key: "file.txt" });
} catch (error) {
  if (FrontalError.isInstance(error)) {
    console.error("Delete failed:", error.code, error.statusCode, error.requestId);
    if (error.retryable) {
      // Retry with backoff
    }
    if (error.fix) {
      console.error("Next step:", error.fix);
    }
  } else {
    throw error;
  }
}
```

Non-HTTP failures, such as `downloadStream` receiving a response without a body,
are thrown as plain `Error` objects.

## Constants

### DEFAULT_BLOB_BASE_URL

```typescript
const DEFAULT_BLOB_BASE_URL = "https://api.frontal.dev/v1";
```

### VERSION

```typescript
const VERSION = "0.0.1";
```

## Best Practices

### Error handling

Wrap calls in `try`/`catch` and branch on `FrontalError` fields:

```typescript
import { FrontalError } from "@frontal-labs/core";

try {
  await blob.upload({ bucket: "my-bucket", key: "file.txt", data: bytes });
} catch (error) {
  if (FrontalError.isInstance(error) && error.retryable) {
    await retryWithBackoff();
  } else {
    throw error;
  }
}
```

### Large objects

Use `downloadStream` instead of `download` to avoid buffering a large object in
memory:

```typescript
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const stream = await blob.downloadStream({ bucket: "my-bucket", key: "archives/large-file.zip" });
await pipeline(Readable.fromWeb(stream), createWriteStream("downloaded-file.zip"));
```

### Signed URL lifetimes

Use short lifetimes for sensitive objects:

```typescript
const sensitiveUrl = await blob.getSignedUrl({
  bucket: "private-bucket",
  options: { key: "sensitive-data.json", expiresIn: 300 }, // 5 minutes
});
```

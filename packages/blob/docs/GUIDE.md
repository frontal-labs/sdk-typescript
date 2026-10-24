# Developer Guide

This guide covers everyday use of `@frontal-labs/blob`: the operations, the
error model, and a few common patterns. For signatures, see the
[API Reference](./API-REFERENCE.md).

## Table of Contents

- [Setup](#setup)
- [Working with objects](#working-with-objects)
- [Streaming downloads](#streaming-downloads)
- [Signed URLs](#signed-urls)
- [Metadata](#metadata)
- [Error handling](#error-handling)
- [Common patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Setup

Set an API key in the environment and use the default `blob` client:

```bash
export FRONTAL_API_KEY=frt_...
```

```typescript
import { blob } from "@frontal-labs/blob";

await blob.list({ bucket: "my-bucket" });
```

If `FRONTAL_API_KEY` is missing, the first call on `blob` throws an `Error`
that names the variable.

To configure a client explicitly, pass options to `createBlobClient`:

```typescript
import { createBlobClient } from "@frontal-labs/blob";

const blob = createBlobClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  timeout: 60_000,   // ms
  maxRetries: 5,
});
```

To share one connection setup with other Frontal services, pass a `FrontalClient`:

```typescript
import { createBlobClient } from "@frontal-labs/blob";
import { FrontalClient } from "@frontal-labs/core";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const blob = createBlobClient(client);
```

## Working with objects

Each method takes an object of named parameters and returns its result
directly.

```typescript
import { blob } from "@frontal-labs/blob";

// Upload. Strings must be encoded to bytes first.
await blob.upload({
  bucket: "reports",
  key: "2024/summary.txt",
  data: new TextEncoder().encode("Quarterly summary"),
  contentType: "text/plain",
});

// Download as a Blob
const file = await blob.download({ bucket: "reports", key: "2024/summary.txt" });
const text = await file.text();

// List with a prefix and page size
const page = await blob.list({ bucket: "reports", prefix: "2024/", limit: 50 });
for (const obj of page.objects) {
  console.log(obj.key, obj.size);
}

// Copy, then move
await blob.copyObject({
  sourceBucket: "reports",
  sourceKey: "2024/summary.txt",
  destBucket: "archive",
  destKey: "2024/summary.txt",
});
await blob.moveObject({
  sourceBucket: "reports",
  sourceKey: "2024/summary.txt",
  destBucket: "reports",
  destKey: "2024/final.txt",
});

// Delete
await blob.delete({ bucket: "reports", key: "2024/final.txt" });
```

`upload` overwrites an existing object with the same key. Keys may contain `/`
to represent folders.

Upload data can be a `Blob`, `File`, `ArrayBuffer`, `Uint8Array`, or `Buffer`.
When `contentType` is omitted, the object is stored as `application/octet-stream`.

## Streaming downloads

Use `downloadStream` for objects too large to hold in memory. It returns a
`ReadableStream<Uint8Array>`.

```typescript
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { blob } from "@frontal-labs/blob";

const stream = await blob.downloadStream({ bucket: "backups", key: "db.dump" });
await pipeline(Readable.fromWeb(stream), createWriteStream("db.dump"));
```

To process chunks yourself, read the stream with a reader and always release the lock:

```typescript
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

## Signed URLs

`getSignedUrl` returns a URL that grants temporary access to one object.

```typescript
const url = await blob.getSignedUrl({
  bucket: "private",
  options: {
    key: "contracts/acme.pdf",
    expiresIn: 900, // seconds; default 3600
  },
});
```

Only `key` and `expiresIn` are sent to the service. Use a short `expiresIn` for
anything sensitive.

## Metadata

`getMetadata` returns a `BlobObject` without downloading the content.

```typescript
const meta = await blob.getMetadata({ bucket: "reports", key: "2024/summary.txt" });

console.log(meta.size, meta.contentType, meta.lastModified, meta.etag);
console.log(meta.metadata ?? {});
```

The `metadata` field is optional and is present only when the service returns
custom key/value pairs for the object.

## Error handling

Every failure is thrown. Use `try`/`catch` around calls, and
`FrontalError.isInstance` to read the API details.

```typescript
import { blob } from "@frontal-labs/blob";
import { FrontalError } from "@frontal-labs/core";

try {
  const file = await blob.download({ bucket: "reports", key: "missing.txt" });
  console.log(await file.text());
} catch (error) {
  if (FrontalError.isInstance(error)) {
    switch (error.statusCode) {
      case 404:
        console.error("Object not found");
        break;
      case 403:
        console.error("Access denied. Check the API key's permissions.");
        break;
      default:
        console.error(`Blob error ${error.statusCode} (${error.code}), request ${error.requestId}`);
    }
    if (error.fix) console.error("Next step:", error.fix);
  } else {
    throw error; // not an API error
  }
}
```

### Retries

The core HTTP client retries `GET` requests (`download`, `downloadStream`,
`getMetadata`) on 429 and 5xx responses, with backoff. Other operations are not
retried automatically. To retry them, check `error.retryable`:

```typescript
import { FrontalError } from "@frontal-labs/core";

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const retryable = FrontalError.isInstance(error) && error.retryable;
      if (!retryable || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
    }
  }
}

await withRetry(() =>
  blob.upload({ bucket: "reports", key: "2024/summary.txt", data: bytes }),
);
```

## Common patterns

### Check that an object exists

`getMetadata` throws when the object is missing, so wrap it:

```typescript
async function exists(bucket: string, key: string): Promise<boolean> {
  try {
    await blob.getMetadata({ bucket, key });
    return true;
  } catch (error) {
    if (FrontalError.isInstance(error) && error.statusCode === 404) return false;
    throw error;
  }
}
```

### Fall back to a second key

```typescript
async function downloadWithFallback(bucket: string, keys: string[]): Promise<Blob> {
  let lastError: unknown;
  for (const key of keys) {
    try {
      return await blob.download({ bucket, key });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
```

### Process a page of objects

```typescript
let offset = 0;
const limit = 100;

while (true) {
  const page = await blob.list({ bucket: "reports", limit, offset });
  for (const obj of page.objects) {
    console.log(obj.key);
  }
  if (page.objects.length < limit) break;
  offset += limit;
}
```

## Troubleshooting

| Symptom | Likely cause and fix |
|---------|----------------------|
| `FRONTAL_API_KEY environment variable is required` | The key is not set in the environment. Export it, or pass `apiKey` to `createBlobClient`. |
| `FrontalError` with `statusCode` 401 or 403 | The key is invalid or lacks access to the bucket. Check the key. |
| `FrontalError` with `statusCode` 404 | The bucket or key does not exist. Check spelling; `list` the prefix to confirm. |
| `FrontalError` with `retryable: true` | Transient failure or rate limit. Retry with backoff. |
| `downloadStream` throws `Response has no body stream` | The response had no body. Fall back to `download`. |
| Stored object content is wrong (for example `[object ReadableStream]`) | A `ReadableStream` was passed as `data`, which `upload` does not stream. Pass a `Blob`, `ArrayBuffer`, `Uint8Array`, or `Buffer`, and encode strings with `TextEncoder`. |

For request-level debugging, set `FRONTAL_DEBUG=true` and include the
`requestId` from the `FrontalError` when contacting support.

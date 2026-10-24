# @frontal-labs/blob

The **Frontal Blob SDK** is a client for Frontal object storage. You store objects
under a `bucket` and `key`, read them back as a `Blob` or a stream, list them,
copy or move them, read their metadata, and issue time-limited signed URLs.

## Key Features

- **Simple object operations**: `upload`, `download`, `downloadStream`, `delete`, `list`, `copyObject`, `moveObject`, `getMetadata`
- **Signed URLs**: `getSignedUrl` for temporary access to private objects
- **Streaming reads**: `downloadStream` returns a `ReadableStream` for large objects
- **Type safety**: TypeScript types and Zod-validated inputs
- **Typed errors**: failures are thrown as `FrontalError`, with `code`, `statusCode`, `requestId`, and `retryable`

## Installation

```bash
bun add @frontal-labs/blob
```

## Quick Start

Methods return their results directly and throw on failure. There is no
`{ data, error }` envelope to check.

```typescript
import { blob } from "@frontal-labs/blob";

// Upload
await blob.upload({
  bucket: "my-bucket",
  key: "greetings/hello.txt",
  data: new TextEncoder().encode("Hello, World!"),
  contentType: "text/plain",
});

// Download
const file = await blob.download({ bucket: "my-bucket", key: "greetings/hello.txt" });
console.log("File content:", await file.text());
```

The `blob` export is a lazily created client that reads `FRONTAL_API_KEY` from the
environment. To configure the client explicitly, use `createBlobClient`:

```typescript
import { createBlobClient } from "@frontal-labs/blob";

const blob = createBlobClient({
  apiKey: "your-api-key",
  baseUrl: "https://custom-api.example.com",
});
```

## Core Operations

### Listing objects

```typescript
const page = await blob.list({ bucket: "my-bucket", prefix: "data/", limit: 100 });

for (const obj of page.objects) {
  console.log(obj.key, obj.size, obj.contentType);
}
```

### Copying and moving

```typescript
await blob.copyObject({
  sourceBucket: "source-bucket",
  sourceKey: "source/file.txt",
  destBucket: "dest-bucket",
  destKey: "dest/file.txt",
});

await blob.moveObject({
  sourceBucket: "temp-bucket",
  sourceKey: "processing/data.json",
  destBucket: "final-bucket",
  destKey: "archive/data.json",
});
```

### Reading metadata

```typescript
const meta = await blob.getMetadata({ bucket: "my-bucket", key: "documents/report.pdf" });

console.log("File size:", meta.size);
console.log("Last modified:", meta.lastModified);
console.log("Custom metadata:", meta.metadata ?? {});
```

## Core Concepts

### Objects

`getMetadata` and `list` return `BlobObject` values:

```typescript
interface BlobObject {
  key: string;                        // Object key
  size: number;                       // Size in bytes
  contentType: string;                // MIME type
  lastModified: string;               // ISO 8601 timestamp
  etag: string;                       // Entity tag
  metadata?: Record<string, string>;  // Custom metadata, when present
}
```

### Signed URLs

`getSignedUrl` returns a URL string. `expiresIn` is in seconds and defaults to 3600.
Only `key` and `expiresIn` are sent to the service. The optional `operation` field
is deprecated and has no effect.

```typescript
const readUrl = await blob.getSignedUrl({
  bucket: "private-bucket",
  options: { key: "sensitive-data.json", expiresIn: 1800 },
});

const writeUrl = await blob.getSignedUrl({
  bucket: "private-bucket",
  options: { key: "uploads/new-file.txt", expiresIn: 900 },
});
```

### Streaming

Use `downloadStream` to read a large object without buffering it in memory:

```typescript
const stream = await blob.downloadStream({ bucket: "my-bucket", key: "large-datasets/data.csv" });
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

## Configuration

The default `blob` client reads its configuration from environment variables:

```bash
FRONTAL_API_KEY=your_api_key
FRONTAL_API_URL=https://api.frontal.dev/v1   # optional
```

Pass `apiKey`, `baseUrl`, `timeout`, `maxRetries`, or `interceptors` to
`createBlobClient` for explicit configuration. See [API Reference](./API-REFERENCE.md).

## Error Handling

Failures are thrown as `FrontalError`, exported from `@frontal-labs/core`:

```typescript
import { blob } from "@frontal-labs/blob";
import { FrontalError } from "@frontal-labs/core";

try {
  await blob.upload({ bucket: "my-bucket", key: "file.txt", data: bytes });
} catch (error) {
  if (FrontalError.isInstance(error)) {
    console.error(`Upload failed (${error.statusCode}, ${error.code}):`, error.message);
    if (error.retryable) {
      // Retry with backoff
    }
  } else {
    throw error;
  }
}
```

## Use Cases

### File upload service

```typescript
import { blob } from "@frontal-labs/blob";

async function uploadUserFile(userId: string, file: File): Promise<string> {
  const key = `users/${userId}/uploads/${Date.now()}-${file.name}`;

  await blob.upload({
    bucket: "user-files",
    key,
    data: file,
    contentType: file.type,
  });

  // Signed URL for immediate access
  return blob.getSignedUrl({
    bucket: "user-files",
    options: { key, expiresIn: 3600 },
  });
}
```

### Backup and restore

```typescript
import { blob } from "@frontal-labs/blob";

async function createBackup(dataSource: string, backupData: unknown): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `backups/${dataSource}/${timestamp}/backup.json`;

  await blob.upload({
    bucket: "backups",
    key,
    data: new TextEncoder().encode(JSON.stringify(backupData)),
    contentType: "application/json",
  });

  return key;
}

async function restoreBackup(backupKey: string): Promise<unknown> {
  const file = await blob.download({ bucket: "backups", key: backupKey });
  return JSON.parse(await file.text());
}

async function listBackups(dataSource: string) {
  const page = await blob.list({ bucket: "backups", prefix: `backups/${dataSource}/` });
  return page.objects;
}
```

## Performance Considerations

- **Stream large objects**: use `downloadStream` instead of `download` for large files
- **Retry transient failures**: check `FrontalError.retryable` and back off before retrying
- **Choose signed URL lifetimes deliberately**: keep them as short as the use case allows

## Next Steps

- Read the [Architecture Guide](./ARCHITECTURE.md) to understand system design
- Check the [API Reference](./API-REFERENCE.md) for detailed method documentation
- Follow the [Developer Guide](./GUIDE.md) for advanced usage patterns and best practices

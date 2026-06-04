# @frontal-labs/blob

Object storage SDK — upload, download, streaming, metadata, signed URLs,
and copy/move operations.

## Installation

```bash
npm install @frontal-labs/blob
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts
import { blob } from "@frontal-labs/blob";

await blob.upload("assets", "logo.png", file, "image/png");

const url = await blob.getSignedUrl("assets", {
  key: "logo.png",
  operation: "read",
  expiresIn: 3_600,
});
```

The `blob` singleton reads `FRONTAL_API_KEY` and `FRONTAL_BLOB_API_URL` from
the environment.

## Usage

### Explicit config

```ts
import { createBlobClient } from "@frontal-labs/blob";

const blob = createBlobClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

await blob.upload("bucket", "path/file.pdf", buffer, "application/pdf");
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createBlobClient } from "@frontal-labs/blob";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const blob = createBlobClient(client);
```

### Download and stream

```ts
const data = await blob.download("bucket", "path/file.pdf");

const stream = await blob.downloadStream("bucket", "large-file.bin");
for await (const chunk of stream) {
  // process chunk
}
```

### Metadata

```ts
const meta = await blob.getMetadata("bucket", "path/file.pdf");
console.log(meta.size, meta.contentType, meta.lastModified);
```

## Configuration

| Variable | Default |
|:---|:---|
| `FRONTAL_API_KEY` | — |
| `FRONTAL_BLOB_API_URL` | `https://api.frontal.dev/v1` |

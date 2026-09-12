# @frontal-labs/blob

Object storage SDK — upload, download, streaming, metadata, signed URLs,
and copy/move operations.

## Installation

```bash
npm install @frontal-labs/blob
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
const blob = f.blob;
const file = new Uint8Array([137, 80, 78, 71]);

await blob.upload({
  bucket: "assets",
  key: "logo.png",
  data: file,
  contentType: "image/png",
});

const url = await blob.getSignedUrl({
  bucket: "assets",
  options: { key: "logo.png", operation: "read", expiresIn: 3_600 },
});
```


## Usage

### Explicit config

```ts
import { createBlobClient } from "@frontal-labs/blob";

const blob = createBlobClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

await blob.upload({
  bucket: "bucket",
  key: "path/file.pdf",
  data: Buffer.from("%PDF-1.4"),
  contentType: "application/pdf",
});
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
const data = await blob.download({ bucket: "bucket", key: "path/file.pdf" });

const stream = await blob.downloadStream({
  bucket: "bucket",
  key: "large-file.bin",
});
for await (const chunk of stream) {
  // process chunk
}
```

### Metadata

```ts
const meta = await blob.getMetadata({ bucket: "bucket", key: "path/file.pdf" });
console.log(meta.size, meta.contentType, meta.lastModified);
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |

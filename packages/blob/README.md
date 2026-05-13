# @frontal/blob

Blob storage SDK for object upload, download, metadata, and signed URLs.

## Installation

```bash
bun add @frontal/blob @frontal/core
```

## Usage

```ts
import { FrontalClient } from "@frontal/core";
import { createBlobClient } from "@frontal/blob";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const blob = createBlobClient(client);

await blob.upload("assets", "logo.png", file, "image/png");
const url = await blob.getSignedUrl("assets", {
  key: "logo.png",
  operation: "read",
  expiresIn: 3600,
});
```

## Configuration

- `FRONTAL_API_KEY`
- `FRONTAL_BLOB_API_URL` (optional)
- `FRONTAL_API_URL` (fallback)

# @frontal-labs/sdk

Unified SDK client for all Frontal services.

## Installation

```bash
bun add @frontal-labs/sdk
```

## Usage

```ts
import { Sdk } from "@frontal-labs/sdk";

const sdk = new Sdk({
  apiKey: process.env.FRONTAL_API_KEY!,
});

await sdk.ai.generateText({
  model: "claude-sonnet-4-6",
  messages: [{ role: "user", content: "Hello" }],
});

await sdk.graph.entities.list({ type: "customer" });
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_API_URL` — Custom API base URL (default: `https://api.frontal.dev/v1`)

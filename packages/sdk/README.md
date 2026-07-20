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

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |

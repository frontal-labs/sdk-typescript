# @frontal-labs/integrations

Execute actions in third-party applications.

## Installation

```bash
bun add @frontal-labs/integrations @frontal-labs/_core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/_core";
import { createIntegrationsClient } from "@frontal-labs/integrations";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const integrations = createIntegrationsClient(client);

const providers = await integrations.providers.list();
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |

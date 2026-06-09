# @frontal-labs/integrations

Execute actions in third-party applications.

## Installation

```bash
bun add @frontal-labs/integrations @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createIntegrationsClient } from "@frontal-labs/integrations";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const integrations = createIntegrationsClient(client);

const providers = await integrations.providers.list();
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_INTEGRATIONS_API_URL` — Custom integrations API base URL

# @frontal-labs/connectors

Data ingestion connectors for enterprise data sources.

## Installation

```bash
bun add @frontal-labs/connectors @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createConnectorsClient } from "@frontal-labs/connectors";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const connectors = createConnectorsClient(client);

const installations = await connectors.installations.list();
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_CONNECTORS_API_URL` — Custom connectors API base URL

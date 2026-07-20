# @frontal-labs/connectors

Data ingestion connectors for enterprise data sources.

## Installation

```bash
bun add @frontal-labs/connectors frontal/core
```

## Usage

```ts
import { FrontalClient } from "frontal/core";
import { createConnectorsClient } from "@frontal-labs/connectors";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const connectors = createConnectorsClient(client);

const installations = await connectors.installations.list();
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |

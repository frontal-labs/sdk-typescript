# @frontal-labs/audit

Audit trail SDK for event logging, querying, compliance checks, and export.

## Installation

```bash
bun add @frontal-labs/audit @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createAuditClient } from "@frontal-labs/audit";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const audit = createAuditClient(client);

await audit.log({
  action: "pipeline.triggered",
  resource: { type: "pipeline", id: "ppl_abc" },
  status: "success",
});

const results = await audit.query({
  action: "pipeline.triggered",
  time_from: "2025-01-01T00:00:00Z",
  time_to: "2025-06-01T00:00:00Z",
});
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |

# @frontal-labs/data

Client for the Frontal Data platform processing subdomains (`/v1/data/*`). Each
subdomain is a distinct backend service exposed as a namespace with a shared
`capabilities`/`health`/`info`/`runs` envelope:

`aggregations`, `archival`, `enrichment`, `exports`, `normalization`, `quality`,
`query`, `schemas`, `serving`, `streams`, `sync`, and `transformations`.

> Datasets (ingest + catalog), pipelines, and lineage have dedicated packages:
> `@frontal-labs/datasets`, `@frontal-labs/pipelines`, `@frontal-labs/lineage`.

## Installation

```bash
npm install @frontal-labs/data
```

## Quick Start

```ts
import { data } from "@frontal-labs/data";

// Resource subdomains share list/create/get/execute.
const aggregations = await data.aggregations.list();
const created = await data.quality.create({ name: "nulls-check" });
const run = await data.quality.execute(created.id as string); // -> evaluations

// Federated query and schema resolution.
const rows = await data.query.federated({ sql: "select 1" });
const schema = await data.schemas.resolve({ name: "users" });
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |

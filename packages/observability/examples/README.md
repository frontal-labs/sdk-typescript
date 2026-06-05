# Observability Examples

This directory contains examples demonstrating how to use the Frontal Observability SDK.

## Available Examples

### logs-and-metrics.ts
Log querying (paginated), log ingestion, metric series retrieval, listing available metrics.

**Run**: `bun run logs-and-metrics.ts`

### alerts-and-dashboards.ts
Alert rule CRUD, incident listing, dashboard creation with widgets, sharing.

**Run**: `bun run alerts-and-dashboards.ts`

## Getting Started

```env
FRONTAL_API_KEY=your_api_key_here
```

```bash
bun run <example-file>.ts
```

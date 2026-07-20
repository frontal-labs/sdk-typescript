# @frontal-labs/schedules

Cron scheduling SDK for recurring jobs with local validation and run tracking.

## Installation

```bash
bun add @frontal-labs/schedules @frontal-labs/_core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/_core";
import { createSchedulesClient } from "@frontal-labs/schedules";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const schedules = createSchedulesClient(client);

const schedule = await schedules.schedules.create({
  name: "Nightly Export",
  cron: "0 2 * * *",
  timezone: "America/New_York",
  target: { type: "pipeline", id: "ppl_export" },
});

const run = await schedules.schedules.trigger(schedule.id);
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |

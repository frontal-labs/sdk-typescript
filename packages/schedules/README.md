# @frontal-labs/schedules

Cron scheduling SDK for recurring jobs with local validation and run tracking.

## Installation

```bash
bun add @frontal-labs/schedules @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
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

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_SCHEDULES_API_URL` — Custom schedules API base URL

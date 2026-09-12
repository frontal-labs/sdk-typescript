# @frontal-labs/schedules

Cron schedules for workflows and pipelines — create, pause, resume, trigger, and validate cron expressions.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.schedules`. To install only this
package: `bun add @frontal-labs/schedules`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const schedule = await f.schedules.create({
  name: "nightly-export",
  cron: "0 2 * * *",
  timezone: "UTC",
  target: { type: "workflow", id: "wf_export" },
});
console.log(schedule.id);
```

## Usage

### Standalone client

```ts
import { createSchedulesClient } from "@frontal-labs/schedules";

const schedules = createSchedulesClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createSchedulesClient } from "@frontal-labs/schedules";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const schedules = createSchedulesClient(client);
```

### Pause, resume, trigger

```ts
await f.schedules.pause("sch_1");
await f.schedules.resume("sch_1");
const run = await f.schedules.trigger("sch_1");
console.log(run.id);
```

### Validate a cron expression

```ts
const check = await f.schedules.cron.validate("0 2 * * *");
console.log(check);
```
## Error handling

All failures throw a typed `FrontalError` subclass (`NotFoundError`,
`ValidationError`, `RateLimitError`, ...) carrying `code`, `requestId` and
`statusCode`. See [`@frontal-labs/core`](../core/README.md#error-handling).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API key (`frt_...`) |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | `development` \| `test` \| `production` |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |

# @frontal-labs/queues

Job and message queue SDK for enqueue, scheduling, retry, and pause/resume.

## Installation

```bash
bun add @frontal-labs/queues @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createQueuesClient } from "@frontal-labs/queues";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const queues = createQueuesClient(client);

const queue = await queues.queues.create({
  name: "email-notifications",
  max_concurrency: 5,
});

const job = await queues.jobs.enqueue(queue.id, {
  to: "user@example.com",
  template: "welcome",
});

const pending = await queues.jobs.list(queue.id, { status: "pending" });
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_QUEUES_API_URL` — Custom queues API base URL

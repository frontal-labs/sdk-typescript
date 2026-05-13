# @frontal/functions

Serverless functions SDK for deploy, invoke, and runtime stats.

## Installation

```bash
bun add @frontal/functions @frontal/core
```

## Usage

```ts
import { FrontalClient } from "@frontal/core";
import { createFunctionsClient } from "@frontal/functions";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const functions = createFunctionsClient(client);

const fn = await functions.deploy({
  name: "process-image",
  runtime: "nodejs20",
  handler: "index.handler",
  memory: 512,
  timeout: 30,
  trigger: { type: "http" },
});

const response = await functions.invoke(fn.id, { payload: { imageId: "123" } });
```

## Configuration

- `FRONTAL_API_KEY`
- `FRONTAL_FUNCTIONS_API_URL` (optional)
- `FRONTAL_API_URL` (fallback)

# @frontal-labs/functions

Serverless functions SDK — deploy, invoke, streaming invocation, and runtime
stats.

## Installation

```bash
npm install @frontal-labs/functions
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts
import { functions } from "@frontal-labs/functions";

const result = await functions.invoke("fn_123", {
  payload: { imageId: "img_456" },
});
```

The `functions` singleton reads `FRONTAL_API_KEY` and
`FRONTAL_FUNCTIONS_API_URL` from the environment.

## Usage

### Explicit config

```ts
import { createFunctionsClient } from "@frontal-labs/functions";

const functions = createFunctionsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const fn = await functions.deploy({
  name: "process-image",
  runtime: "nodejs20",
  handler: "index.handler",
  memory: 512,
  timeout: 30,
  trigger: { type: "http" },
});
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createFunctionsClient } from "@frontal-labs/functions";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const functions = createFunctionsClient(client);
```

### Invoke with streaming

```ts
const stream = await functions.invokeStream("fn_123", {
  payload: { query: "..." },
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### List and manage

```ts
const page = await functions.list({ limit: 10 });
await functions.delete("fn_123");
```

## Configuration

| Variable | Default |
|:---|:---|
| `FRONTAL_API_KEY` | — |
| `FRONTAL_FUNCTIONS_API_URL` | `https://api.frontal.dev/v1` |

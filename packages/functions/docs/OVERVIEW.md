# @frontal/functions

The **Frontal Functions SDK** provides a powerful and scalable way to deploy and manage serverless functions at the edge. It offers a simple, type-safe interface for deploying, invoking, and monitoring functions with support for multiple runtimes and trigger types.

## Key Features

- **Multi-Runtime Support**: Deploy functions using Node.js, Python, and Go runtimes
- **Flexible Triggers**: HTTP endpoints, cron schedules, and queue-based triggers
- **Type-Safe Configuration**: Built with TypeScript and Zod for robust validation
- **Edge Deployment**: Functions automatically deploy to edge locations for low latency
- **Monitoring & Analytics**: Built-in invocation statistics and performance metrics
- **Environment Variables**: Secure environment variable management for each function

## Installation

```bash
bun add @frontal/functions
```

## Quick Start

### Deploy a Simple HTTP Function

```typescript
import { deploy } from "@frontal/functions";

const functionConfig = {
  name: "hello-world",
  runtime: "nodejs20" as const,
  handler: "handler",
  memory: 256,
  timeout: 30,
  trigger: {
    type: "http" as const,
  },
};

const result = await deploy(functionConfig);
console.log(`Function deployed: ${result.data?.url}`);
```

### Invoke a Function

```typescript
import { invoke } from "@frontal/functions";

const response = await invoke("hello-world", {
  payload: { name: "Alice" },
  headers: { "x-custom-header": "value" },
});

console.log(response);
```

### List All Functions

```typescript
import { list } from "@frontal/functions";

const functions = await list();
console.log("Deployed functions:", functions.data);
```

## Supported Runtimes

- **Node.js**: `nodejs18`, `nodejs20`
- **Python**: `python3.9`
- **Go**: `go1.x`

## Trigger Types

### HTTP Triggers
Functions can be invoked via HTTP requests:

```typescript
{
  type: "http",
  // Optional: Custom domain configuration
}
```

### Cron Triggers
Schedule functions to run at specific intervals:

```typescript
{
  type: "cron",
  schedule: "0 */6 * * *", // Every 6 hours
}
```

### Queue Triggers
Trigger functions in response to queue messages:

```typescript
{
  type: "queue",
  queueName: "my-queue",
}
```

## Configuration

The Functions SDK automatically reads configuration from environment variables:

```bash
FRONTAL_API_KEY=your_api_key
FRONTAL_BASE_URL=https://api.frontal.dev
```

Or configure programmatically:

```typescript
import { configure } from "@frontal/functions";

configure({
  apiKey: "your_api_key",
  baseUrl: "https://api.frontal.dev",
});
```

## Error Handling

All API responses follow a consistent structure:

```typescript
interface APIResponse<T> {
  data: T | null;
  error: {
    message: string;
    statusCode: number;
    name: string;
  } | null;
  headers: Record<string, string> | null;
}
```

Example error handling:

```typescript
const result = await deploy(config);

if (result.error) {
  console.error(`Deployment failed: ${result.error.message}`);
  return;
}

console.log(`Success: ${result.data?.id}`);
```

## Next Steps

- Read the [Architecture Guide](./ARCHITECTURE.md) to understand the system design
- Check the [API Reference](./API-REFERENCE.md) for detailed method documentation
- Follow the [Developer Guide](./GUIDE.md) for advanced usage patterns

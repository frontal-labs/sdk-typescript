# API Reference

## Functions Class

The main client class for interacting with Frontal Functions services.

### Constructor

```typescript
new Functions(config?: FunctionsConfig)
```

Creates a new Functions client instance.

**Parameters:**
- `config` (optional): Configuration object for the client

**Example:**
```typescript
import { Functions } from "@frontal-labs/functions";

const functions = new Functions({
  apiKey: "your-api-key",
  baseUrl: "https://api.frontal.dev",
});
```

### Methods

#### deploy

```typescript
deploy(config: FunctionConfig): Promise<APIResponse<FunctionEntry>>
```

Deploys a new function to the Frontal platform.

**Parameters:**
- `config`: Function configuration object

**Returns:** Promise resolving to API response with function details

**Example:**
```typescript
const result = await functions.deploy({
  name: "my-function",
  runtime: "nodejs20",
  handler: "index.handler",
  memory: 256,
  timeout: 30,
  trigger: {
    type: "http",
  },
});
```

#### list

```typescript
list(): Promise<APIResponse<FunctionEntry[]>>
```

Retrieves a list of all deployed functions.

**Returns:** Promise resolving to API response with array of functions

**Example:**
```typescript
const functions = await client.list();
console.log(functions.data);
```

#### get

```typescript
get(id: string): Promise<APIResponse<FunctionEntry>>
```

Retrieves details of a specific function.

**Parameters:**
- `id`: The function ID

**Returns:** Promise resolving to API response with function details

**Example:**
```typescript
const function = await client.get("function-id");
console.log(function.data);
```

#### delete

```typescript
delete(id: string): Promise<APIResponse<void>>
```

Deletes a function from the platform.

**Parameters:**
- `id`: The function ID

**Returns:** Promise resolving to API response

**Example:**
```typescript
const result = await client.delete("function-id");
if (result.error) {
  console.error("Delete failed:", result.error.message);
}
```

#### invoke

```typescript
invoke(id: string, options?: InvokeOptions): Promise<APIResponse<unknown>>
```

Invokes a function synchronously.

**Parameters:**
- `id`: The function ID
- `options` (optional): Invocation options

**Returns:** Promise resolving to API response with function output

**Example:**
```typescript
const response = await client.invoke("function-id", {
  payload: { name: "Alice" },
  headers: { "x-custom": "value" },
});
```

#### stats

```typescript
stats(id: string): Promise<APIResponse<InvocationStats>>
```

Retrieves invocation statistics for a function.

**Parameters:**
- `id`: The function ID

**Returns:** Promise resolving to API response with statistics

**Example:**
```typescript
const stats = await client.stats("function-id");
console.log(`Total invocations: ${stats.data?.totalInvocations}`);
```

#### updateTriggers

```typescript
updateTriggers(id: string, trigger: FunctionConfig["trigger"]): Promise<APIResponse<FunctionEntry>>
```

Updates only the trigger configuration for a function.

**Parameters:**
- `id`: The function ID
- `trigger`: The new trigger configuration

**Returns:** Promise resolving to API response with updated function

**Example:**
```typescript
const result = await client.updateTriggers("function-id", {
  type: "cron",
  schedule: "0 */6 * * *",
});
```

## Functional API

These functions use a global client instance for convenience.

### configure

```typescript
configure(config: { apiKey?: string; baseUrl?: string }): void
```

Configures the global Functions client.

**Parameters:**
- `config`: Configuration object

**Example:**
```typescript
import { configure } from "@frontal-labs/functions";

configure({
  apiKey: "your-api-key",
  baseUrl: "https://api.frontal.dev",
});
```

### deploy

```typescript
deploy(config: FunctionConfig): Promise<APIResponse<FunctionEntry>>
```

Deploys a function using the global client.

### invoke

```typescript
invoke(id: string, options?: InvokeOptions): Promise<unknown>
```

Invokes a function using the global client.

### list

```typescript
list(): Promise<APIResponse<FunctionEntry[]>>
```

Lists functions using the global client.

## Types

### FunctionConfig

Configuration for deploying a function.

```typescript
interface FunctionConfig {
  name: string;
  runtime: "nodejs18" | "nodejs20" | "python3.9" | "go1.x";
  handler: string;
  memory: number; // 128-3008 MB
  timeout: number; // 1-900 seconds
  env?: Record<string, string>;
  trigger?: {
    type: "http" | "cron" | "queue";
    schedule?: string; // For cron triggers
    queueName?: string; // For queue triggers
  };
}
```

### FunctionEntry

Represents a deployed function.

```typescript
interface FunctionEntry extends FunctionConfig {
  id: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}
```

### InvokeOptions

Options for function invocation.

```typescript
interface InvokeOptions {
  payload?: unknown;
  headers?: Record<string, string>;
}
```

### InvocationStats

Statistics for function invocations.

```typescript
interface InvocationStats {
  functionId: string;
  totalInvocations: number;
  errors: number;
  averageDuration: number;
  lastInvoked?: string;
}
```

### FunctionsConfig

Configuration for the Functions client.

```typescript
interface FunctionsConfig {
  apiKey?: string;
  baseUrl?: string;
  environment?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}
```

### APIResponse

Standard API response structure.

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

## Constants

### DEFAULT_FUNCTIONS_BASE_URL

```typescript
const DEFAULT_FUNCTIONS_BASE_URL: string;
```

The default base URL for the Functions API.

### VERSION

```typescript
const VERSION: string;
```

The version of the Functions SDK.

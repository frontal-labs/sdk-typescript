# @frontal-labs/functions API Reference

The Functions package provides typed operations for creating functions, publishing and deploying versions, and invoking or tracking executions.

## Create a client

```ts
import { createFunctionsClient } from "@frontal-labs/functions";

const functions = createFunctionsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
  timeout: 30_000,
  maxRetries: 3,
});
```

`baseUrl`, `timeout`, and `maxRetries` are optional. Defaults are `https://api.frontal.dev/v1`, 30 seconds, and three retries. A `FrontalClient` may also be passed to `createFunctionsClient` to reuse its HTTP client.

## Function operations

| Method | Description |
| --- | --- |
| `functions.create(definition)` | Creates a function (`POST /functions`). |
| `functions.list({ cursor, limit })` | Lists functions (`GET /functions`). |
| `functions.get(id)` | Retrieves a function (`GET /functions/{id}`). |
| `functions.update(id, definition)` | Updates a function and creates a new version (`PATCH /functions/{id}`). |
| `functions.delete(id)` | Deletes a function (`DELETE /functions/{id}`). |

Function definitions require `name`, `runtime`, and `entrypoint`. Optional properties are `description`, `source`, `inputSchema`, `outputSchema`, `dependencies`, `envVars`, `secrets`, `memory` (MB), `timeout` (seconds), and `permissions` with optional `ontology` and `actions` string arrays. Supported runtimes are `nodejs20`, `nodejs22`, and `python311`.

The `functions.define(name)` fluent builder supports the same definition fields and provides `.create()` and `.toDefinition()`.

## Versions and deployments

| Method | Description |
| --- | --- |
| `versions.list(functionId, { cursor, limit })` | Lists versions. |
| `versions.get(functionId, version)` | Retrieves a version. |
| `versions.publish(functionId, version)` | Publishes a version. |
| `deployments.deploy(functionId, version)` | Deploys a version. |
| `deployments.status(functionId, version)` | Reads deployment status and optional details. |

These operations use `/functions/{functionId}/versions/{version}` and its `publish`, `deploy`, and `deployment/status` subroutes.

## Executions

| Method | Description |
| --- | --- |
| `executions.invoke({ functionId, version?, input? })` | Invokes synchronously and returns the execution result. |
| `executions.invokeAsync({ functionId, version?, input? })` | Starts an asynchronous invocation and returns its `executionId`. |
| `executions.getExecution(executionId)` | Reads execution status and metadata. |
| `executions.getResult(executionId)` | Reads the execution result. |
| `executions.listExecutions({ cursor, limit, functionId, status })` | Lists executions with optional filters. |
| `executions.cancelExecution(executionId)` | Cancels an execution. |

Inputs, results, and JSON schemas are JavaScript objects and retain their nested keys. Function and execution resource status values are `draft`, `active`, `deprecated`, and `failed`.

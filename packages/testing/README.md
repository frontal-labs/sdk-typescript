# @frontal-labs/testing

Test utilities for Frontal SDK packages — mock HTTP, test clients, response
factories, and fixture builders.

## Installation

```bash
npm install -D @frontal-labs/testing
```

## Quick Start

```ts
import { createTestHttpClient, mockPageResponse } from "@frontal-labs/testing";
import { GraphService } from "@frontal-labs/graph";

const { http, mock } = createTestHttpClient([
  { method: "GET", path: "/graph/entities/user", body: mockPageResponse([]) },
]);

const graph = new GraphService(http);
await graph.use("user").list();

mock.expectCalled("GET", "/graph/entities/user");
```

## API

### createTestHttpClient

Creates a mock HTTP client with route matching.

```ts
import { createTestHttpClient } from "@frontal-labs/testing";

const { http, mock } = createTestHttpClient([
  { method: "GET", path: "/v1/health", body: { status: "ok" } },
  { method: "POST", path: "/v1/graph/entities", body: { id: "ent_123" } },
]);

mock.expectCalled("POST", "/v1/graph/entities");
mock.expectCallCount(2);
```

### createTestClient

Creates a full `FrontalClient` with a mock fetch injected.

```ts
import { createTestClient } from "@frontal-labs/testing";

const { client, mock } = createTestClient([
  { method: "GET", path: "/v1/workflows", body: { items: [], total: 0 } },
]);

const workflows = createWorkflowsClient(client);
```

### Response factories

```ts
import {
  mockPageResponse,
  mockErrorResponse,
  mockStreamResponse,
  mockFixture,
} from "@frontal-labs/testing";

// Paginated response helper
const page = mockPageResponse([{ id: "a" }, { id: "b" }], { total: 2 });

// Error response
const error = mockErrorResponse(429, "Rate limited");

// SSE stream
const stream = mockStreamResponse([
  { type: "data", data: { chunk: 1 } },
  { type: "done", data: {} },
]);

// Named fixtures
const agent = mockFixture("agent", { name: "test-agent" });
```

### Fixture builders

```ts
import { buildAgent, buildEntity, buildWorkflow } from "@frontal-labs/testing";

const agent = buildAgent({ name: "order-ops" });
const entity = buildEntity("customer", { email: "test@frontal.dev" });
const workflow = buildWorkflow({ name: "onboarding" });
```

## Configuration

No environment variables are required. The test client operates entirely
in-memory with no network calls.

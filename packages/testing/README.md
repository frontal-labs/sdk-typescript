# @frontal/testing

Testing utilities for Frontal SDK packages.

## Installation

```bash
bun add -d @frontal/testing vitest
```

## Provides

- `createMockFetch`
- `createTestClient`
- `createTestHttpClient`
- response factories (for pagination/errors)
- fixture builders (`agent`, `entity`, `workflow`, ...)

## Usage

```ts
import { createTestHttpClient, mockPageResponse } from "@frontal/testing";
import { GraphService } from "@frontal/graph";

const { http, mock } = createTestHttpClient([
  { method: "GET", path: "/graph/entities/user", body: mockPageResponse([]) },
]);

const graph = new GraphService(http);
await graph.use("user").list();

mock.expectCalled("GET", "/graph/entities/user");
```

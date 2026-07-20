# Events SDK Architecture

## System Design

The Events SDK follows the layered architecture shared by all Frontal SDK packages:

```
┌─────────────────────────────────────┐
│  EventsService / Namespaces         │  ← Business logic
├─────────────────────────────────────┤
│  HttpClient (@frontal-labs/_core)    │  ← Transport (HTTP, retries, auth)
├─────────────────────────────────────┤
│  Frontal REST API                     │  ← Backend
└─────────────────────────────────────┘
```

## Key Design Decisions

### Composition over Inheritance

The `EventsService` class does NOT extend `FrontalClient` or `HttpClient`. Instead, it receives an `HttpClient` via constructor injection:

```typescript
class EventsService {
  constructor(private readonly http: HttpClient) {}
}
```

This allows:
- Mock injection for testing
- Shared HTTP instances across packages
- Clean separation of transport from business logic

### Zod-First Types

All data shapes are defined as Zod schemas in `schemas.ts`. TypeScript types are inferred via `z.infer<>`. This provides runtime validation and single-source-of-truth type definitions.

### Namespace Pattern

Sub-resources are organized into namespace classes for a clean API:

```typescript
// service.resource.action() instead of service.resourceAction()
service.resource.list();
service.resource.create(...);
```

### Factory + Singleton

```typescript
// Explicit creation
const client = createEventsClient({ apiKey: "..." });

// Default singleton (uses env vars)
import { events } from "@frontal-labs/events";
```

## Data Flow

1. SDK method called (e.g., `service.someMethod()`)
2. Zod validates input parameters
3. `HttpClient` constructs request with auth headers, timeout, request ID
4. HTTP request sent to Frontal API
5. Response validated against Zod schema (if provided)
6. Result returned as typed object
7. On error: typed `FrontalError` subclass thrown with rate limit info

## Dependencies

- `@frontal-labs/_core` (workspace) — HTTP transport, errors, pagination, polling
- `zod` (^4.3.6) — Runtime schema validation
- `@frontal-labs/_testing` (dev) — Test utilities and mock HTTP

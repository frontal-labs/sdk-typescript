# Events Developer Guide

In-depth guide for using `@frontal-labs/events` in production.

## Setup

### Environment Configuration

```bash
export FRONTAL_API_KEY=frt_your_api_key_here
```

### Client Initialization

```typescript
import { FrontalClient } from "@frontal-labs/core";
import { createEventsClient } from "@frontal-labs/events";

// Option A: Shared client (recommended for multi-package apps)
const frontal = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
  timeout: 30_000,
  maxRetries: 3
});
const client = createEventsClient(frontal);

// Option B: Standalone client (for single-package use)
const client = createEventsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  maxRetries: 3
});
```

## Error Handling Strategies

### Retry with Backoff

The SDK automatically retries on 429, 500, 502, 503, and 504 errors with exponential backoff and jitter. Configure via `maxRetries`:

```typescript
const client = createEventsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  maxRetries: 5 // Maximum retry attempts
});
```

### Circuit Breaker

For high-availability services, use the circuit breaker from core:

```typescript
import { CircuitBreaker } from "@frontal-labs/core";

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 30_000
});

try {
  const result = await breaker.execute(() => client.someMethod());
} catch (error) {
  if (error instanceof CircuitBreakerOpenError) {
    // Circuit is open — wait and retry later
  }
}
```

### Rate Limit Handling

Rate limit errors include retry-after and quota information:

```typescript
import { RateLimitError } from "@frontal-labs/core";

try {
  await client.someMethod();
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log("Retry after:", error.retryAfter, "seconds");
    if (error.rateLimit) {
      console.log("Remaining quota:", error.rateLimit.remaining);
      console.log("Resets at:", new Date(error.rateLimit.reset * 1000));
    }
  }
}
```

## Pagination

List endpoints return `PageResult<T>` objects with async iteration support:

```typescript
const result = await client.someListMethod();

// Iterate all results (auto-fetches pages)
for await (const item of result) {
  console.log(item);
}

// Or fetch all at once
const all = await result.all();
```

## Testing

Use `@frontal-labs/testing` to mock HTTP:

```typescript
import { createTestHttpClient } from "@frontal-labs/testing";

const { http, mock } = createTestHttpClient([
  { method: "GET", path: "/v1/events/resource", body: { data: [...] } }
]);

const service = new EventsService(http);
const result = await service.someMethod();

mock.expectCalled("GET", "/v1/events/resource");
```

## Performance Tips

1. **Reuse clients** — Share a single `FrontalClient` instance across all SDK packages to reuse HTTP connections.
2. **Stream large responses** — Use streaming methods for large data transfers.
3. **Batch operations** — Where available, use batch endpoints instead of individual calls.
4. **Set appropriate timeouts** — Tune `timeout` based on expected operation latency.

## Troubleshooting

| Issue | Likely Cause | Solution |
|---|---|---|
| 401 Unauthorized | Missing or invalid API key | Check `FRONTAL_API_KEY` env var |
| 404 Not Found | Wrong resource ID or endpoint | Verify resource exists |
| 429 Rate Limited | Too many requests | Implement exponential backoff |
| Network errors | Connectivity issues | Check network and API base URL |
| Timeout | Operation taking too long | Increase `timeout` config |

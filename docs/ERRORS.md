# Errors

Every error the SDK raises is a `FrontalError` from the shared
[`@frontal-labs/error`](https://www.npmjs.com/package/@frontal-labs/error)
library, bundled into `@frontal-labs/core`. This page explains how the SDK's
error classes relate to that library, which guard to use, and what is safe to
log or show.

## Hierarchy

| Class | Code | Retryable | Notes |
| --- | --- | --- | --- |
| `ValidationError` | from API, usually `VALIDATION_ERROR` | no | `fields` |
| `UnauthorizedError` | from API | no | 401 |
| `PaymentRequiredError` | from API | no | 402 |
| `ForbiddenError` | from API | no | 403 |
| `NotFoundError` | from API | no | 404 |
| `ConflictError` | from API | no | 409 |
| `PreconditionFailedError` | from API | no | 412 |
| `PayloadTooLargeError` | from API | no | 413 |
| `RateLimitError` | from API | yes | 429, `retryAfter` in seconds |
| `ServiceError` | from API | 408, 425, 5xx | any other status |
| `NetworkError` | `NETWORK_ERROR` | yes | request never reached the API; `cause` |
| `TimeoutError` | `TIMEOUT` | yes | operation exceeded its time limit |
| `CircuitBreakerOpenError` | `CIRCUIT_OPEN` | yes | `retryAfterMs` |

All of them extend the library's base class, so every SDK error has a `scope`
(`"frontal"`), a stable `code`, a `statusCode` where one applies, and a
`retryable` flag.

## Rules

1. **Branch on `code` and `statusCode`, never on `message`.** Messages are
   developer text and may change between releases.
2. **Use `isRetryableError(err)` to decide on retries.** It covers every SDK
   error, including `NetworkError` and `TimeoutError`.
3. **Know what each guard checks.**
   - `isFrontalError` (from `@frontal-labs/core`) checks only the `FrontalError`
     family. It is `false` for `NetworkError` and `TimeoutError`.
   - `instanceof` checks a single class in one module copy.
   - `isFrontalError` from `@frontal-labs/error` accepts any Frontal error,
     including the SDK's, and works across duplicate copies of the package.
4. **Never log the raw error object.** `cause` and `stack` can hold secrets,
   and the base class's `toJSON()` includes stack and metadata. Use
   `describeSdkError()` instead.
5. **Only the server's `public` message may reach end users.** `message` is
   for developers.

## Logging

`describeSdkError(err)` returns a log-ready record for any thrown value:

```ts
import { describeSdkError } from "@frontal-labs/core";

const record = describeSdkError(err);
// {
//   name: "NotFoundError",
//   code: "NOT_FOUND",
//   scope: "frontal",
//   message: "...",          // with frt_ keys replaced by [REDACTED]
//   statusCode: 404,
//   requestId: "req_...",
//   retryable: false,
//   fingerprint: "frontal/NOT_FOUND",
//   metadata: { ... },        // redacted
// }
```

- `fingerprint` (`scope/code`) is the grouping key for alerts and dashboards.
- `redactSecrets(text)` replaces `frt_` and legacy `fr_typed` keys in any string.
- `logSdkFailure(err, logger?)` in `@frontal-labs/observability` logs the
  record with the `[frontal] SDK failure` message. It defaults to `console`.
- The client's `logger.error` hook receives the same record for API errors.
  Setting `debug` also prints it with `console.error`.

## Showing errors to users

The SDK never sets `public`, because the API's `message` is developer text.
Apps that want to show something to end users should map errors on the server
and return only a safe message.

On the server, `errorResponse()` from `@frontal-labs/error/server` sends only
`scope`, `code`, `statusCode` and the generic `An error occurred.` unless an
error has a `public` message. Map sensitive codes to generic ones before
responding:

```ts
import { FrontalError, isFrontalError } from "@frontal-labs/error";
import { errorResponse } from "@frontal-labs/error/server";

function toClientError(err: unknown): Response {
  const status = isFrontalError(err) ? (err.statusCode ?? 500) : 500;
  const wrapped = new FrontalError("Upstream Frontal call failed", {
    cause: err,
    scope: "app",
    code: status === 429 ? "rate_limited" : "upstream_failed",
    statusCode: status,
    public: {
      message:
        status === 429
          ? "Too many requests. Try again shortly."
          : "We could not complete the request.",
    },
  });
  const result = errorResponse(wrapped);
  return new Response(result.body, result);
}
```

In the browser, `getPublicMessage(err)` from `@frontal-labs/react` returns the
server's `public` message, or a fallback. It never returns `message`:

```tsx
import { getPublicMessage } from "@frontal-labs/react";

if (error) return <p>{getPublicMessage(error)}</p>;
```

`useChat` stream errors are serialized by `@frontal-labs/ai` with only `name`,
`code`, `statusCode`, `retryable` and a client-safe `message`. Developer text,
`fix`, `docs` and `requestId` are not sent, so the stream cannot leak them.

If a browser calls your API from another origin, expose the request id header
so the client can read it: `Access-Control-Expose-Headers: x-frontal-id`.

## Testing

`@frontal-labs/testing` provides helpers that build responses the same way the
gateway does:

```ts
import { expectFrontalError, mockError } from "@frontal-labs/testing";

const response = mockError({ status: 404, code: "NOT_FOUND", requestId: "req_1" });
// parse with the SDK, then:
expectFrontalError(error, { code: "NOT_FOUND", statusCode: 404, retryable: false });
```

## Compatibility notes

- `toJSON()` on `FrontalError` keeps its existing wire shape. Streams send it as
  `event.error`.
- `String(err)` keeps the native `Name: message` form.
- Error stacks start at the call site.
- Polling timeouts keep the `TIMEOUT` code and set `metadata.operation` to
  `"poll"`, so existing `code === "TIMEOUT"` checks keep working.
- Every service client records its name as `service.name` on spans and on
  error `attributes`.
- Argument and programming errors (for example a `TypeError` for a bad page
  argument) stay as their native types. They are not API failures, and changing
  them would break `instanceof TypeError` checks.
- Config errors are still `ZodError`. Typed config errors wait for the next major.
- Statuses outside 400–599 become `ServiceError` with status 500, and the
  original value is kept in `metadata.rawStatus`.

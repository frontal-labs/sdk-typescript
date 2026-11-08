# Core errors

Use `FrontalError` for one structured failure or a direct subclass.

## Typed construction

```ts
import { FrontalError } from "@frontal-labs/error";

type PaymentErrorCode = "card_declined" | "gateway_timeout" | "payment_failed";

export function paymentGatewayTimeout(
  cause: unknown,
  providerResponseCode?: string,
): FrontalError<PaymentErrorCode> {
  return new FrontalError("Gateway request timed out", {
    cause,
    code: "gateway_timeout",
    metadata: {
      provider: { responseCode: providerResponseCode },
    },
    public: { message: "The payment provider did not respond" },
    scope: "billing",
  });
}
```

The generic keeps `code` limited to `PaymentErrorCode`. Preserve a caught value through `cause`; do not copy its message or stack into public fields.

When set, `scope` and `code` must be nonblank. Construction keeps their original text.

If `public` is set, its `message` must be nonblank and optional fields must be strings. Construction drops blank optional and unknown fields, then freezes a copy. Invalid fields throw `TypeError`.

## Subclasses

Accept `FrontalErrorOptions` in the constructor so the class remains compatible with `createErrors`. Assign a literal `this.name`; minification can change `constructor.name`.

```ts
import { FrontalError } from "@frontal-labs/error";
import type { FrontalErrorOptions } from "@frontal-labs/error";

class PaymentError extends FrontalError {
  constructor(message: string, options?: FrontalErrorOptions) {
    super(message, options);
    this.name = "PaymentError";
  }
}
```

## Recognition and extraction

- `isFrontalError(value)` uses `instanceof` first, then a package-namespaced Symbol tag plus data-shape checks. Recognition works only while the tag remains observable; JSON, structured clone, `Worker`, and `MessagePort` transfer do not preserve it.
- `hasCode(error, codeOrCodes)` narrows errors by one code or a set of codes.
- `isError`, `isErrorLike`, and `getMessage` handle unknown caught values without unsafe casts. `isErrorLike` guarantees only a string `message`.
- `getRootCause` follows `cause` and stops on object cycles.

`FrontalErrorLike` remains structural. It describes error fields but does not require the package marker.

`RecognizedFrontalError` adds the marker and is the tagged input accepted by `errorResponse()`.

Local `FrontalError` instances, subclasses, and factory results satisfy the type. `isFrontalError()` narrows unknown or structurally typed values to it.

Errors from older or duplicate package copies remain recognizable while their shared marker and valid fields are observable.

Version 0.6.0 requires recognized errors in producer types. Version 0.5.0 rejects untagged errors at runtime, but its declarations allow those calls.

If a variable was annotated as `FrontalErrorLike`, retain the concrete error type or narrow it with `isFrontalError()` before response production. Do not add a cast. Plain errors and field objects remain usable with `formatError()`.

A custom constructor compiled against older package declarations may need a dependency update before it can be passed to the current `createErrors()`. Recognizing an instance with `isFrontalError()` does not change its constructor type.

The Symbol tag is forgeable. Recognition does not authenticate the producer or authorize disclosure. Tagged metadata and attributes remain `unknown`; validate them or use `instanceof FrontalError` for typed local diagnostics.

`FrontalError#toJSON()` includes developer and diagnostic details, though it excludes `cause`; it may contain private data. Set `severity`, `category`, and `kind` on the producer side; they stay out of responses. Use `version` for the failure definition's version and `context` for where it happened (`tenantId` is internal). `failureFingerprint()` returns the canonical identity key for grouping. Record whether the operation may be repeated with `retry: { retryable, maxAttempts?, backoff? }`; the package never retries on its own, and a retryable error is not safe to retry unless the operation is idempotent. Attach observations with `evidence` (up to 32 validated items with a source, observation time, and provenance). Evidence stays out of responses. For storage or transfer between trusted systems, use `serializeFailure()`, which returns a `schemaVersion: 1` payload with bounded traversal and best-effort redaction of secret-shaped strings and keys. Restore it with `deserializeFailure()`. Never send either payload to a client; use `errorResponse()` for that. Use `buildErrorResponseData()` for recipient-approved data or `errorResponse()` for HTTP. See [Response data and HTTP](http.md) and the separate [log allowlist](create-errors.md#allowlisted-logging).

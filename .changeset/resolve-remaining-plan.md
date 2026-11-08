---
"@frontal-labs/core": minor
"@frontal-labs/workflows": patch
"@frontal-labs/ontology": patch
"@frontal-labs/ai": patch
---

Resolves the last error-plan items.

- `CircuitBreakerOpenError` is built through `createErrors`. Its constructor takes either the retry window in milliseconds, as before, or a message with options. `instanceof` holds for both.
- `typeErrorWithCode(code, message)` creates a `TypeError` with a stable code. `invalidRequestError` uses it. Workflow response-shape errors carry `invalid_response`, and zstd without runtime support carries `unsupported_runtime`. `instanceof TypeError` still holds for all of them.

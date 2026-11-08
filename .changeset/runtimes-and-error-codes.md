---
"@frontal-labs/core": minor
"@frontal-labs/ai": patch
"@frontal-labs/ontology": patch
---

Edge and Deno runtime checks, and stable codes for argument errors.

- Polling timeouts keep code `TIMEOUT` and carry `metadata.operation === "poll"`, so existing `code === "TIMEOUT"` checks keep working. A distinct polling code is planned for the next major.
- `invalidRequestError(message)` creates the `TypeError` that SDK argument validation throws, with code `invalid_request`. `instanceof TypeError` still holds. `ai` (`generateText` and `streamText` without a prompt) and `ontology` (entity and relation definitions and arguments) now throw it.
- `TimeoutError` accepts an options object, so a code and a fix can be set when it is created.
- `@frontal-labs/core` is verified in workerd (Miniflare, no compatibility flags) and Deno 2.9.8. Both checks run in CI.

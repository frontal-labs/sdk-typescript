---
"@frontal-labs/core": minor
"@frontal-labs/ai": patch
"@frontal-labs/ontology": patch
---

Edge and Deno runtime checks, and stable codes for polling and argument errors.

- **Polling timeouts now have code `POLL_TIMEOUT`.** Previously they were `TIMEOUT`. Code that checks `error.code === "TIMEOUT"` after `pollUntil` must check `POLL_TIMEOUT`. Request timeouts keep `TIMEOUT`. Polling timeouts still have `metadata.operation === "poll"` and are `TimeoutError`s, so `instanceof` checks hold.
- `invalidRequestError(message)` creates the `TypeError` that SDK argument validation throws, with code `invalid_request`. `instanceof TypeError` still holds. `ai` (`generateText` and `streamText` without a prompt) and `ontology` (entity and relation definitions and arguments) now throw it.
- `TimeoutError` accepts an options object, so a code and a fix can be set when it is created.
- `@frontal-labs/core` is verified in workerd (Miniflare, no compatibility flags) and Deno 2.9.8. Both checks run in CI.

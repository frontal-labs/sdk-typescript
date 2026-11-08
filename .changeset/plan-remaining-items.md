---
"@frontal-labs/ai": patch
"@frontal-labs/core": patch
---

Fixes from the error-integration plan's remaining items.

- `@frontal-labs/ai`: the client reads `code` and `message` from non-OK responses in the `{ error: { code, message } }` envelope that `errorResponse()` produces, as well as from flat bodies. Previously an app's structured error showed as `HTTP_<status>`.
- `@frontal-labs/core`: `FRONTAL_DEBUG` output is rendered with the shared library's `formatError` (`auto`, honouring `NO_COLOR` and TTY) and redacted with `redactSecrets`, so API keys never appear in debug output.

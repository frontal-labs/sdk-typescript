---
"@frontal-labs/react": minor
"@frontal-labs/sdk": minor
---

Error helpers for UI code, and docs for the error model.

- `getPublicMessage(error, fallback?)` in `@frontal-labs/react` returns the server's `public` message, or a fallback. It never returns the developer `message`.
- `@frontal-labs/sdk` re-exports `describeSdkError`, the `SdkErrorDiagnostics` type and `CircuitBreakerOpenError`.
- New `docs/ERRORS.md` covers the error hierarchy, the rules for branching and logging, and the recipes for server mapping and tests.
- The error-taxonomy section of `SKILL.md` and `skills/frontal-sdk/SKILL.md` now describes the base class, the guards, and what is safe to log or show.
- The `frontal-error` skill is installed under `skills/frontal-error` and linked from `.agents/skills`.

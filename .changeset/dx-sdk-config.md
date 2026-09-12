---
"@frontal-labs/sdk": major
---

`new Frontal({ apiKey, ... })` — the unified client now accepts an `SdkConfig` directly (validated at construction; `frt_` prefix enforced) as well as a shared `FrontalClient`. Adds `f.client` for sharing the transport with standalone packages, `resolveSdkConfig`, `sdkConfigSchema`, `FrontalEnvironment`, and re-exports of common helpers (`tool`, `toUIMessageStreamResponse`, `toApprovalStep`, `isFrontalError`, …). The env-driven `frontal` singleton and per-service singleton re-exports are deprecated (runtime kept). README rewritten as the canonical quickstart. Fixes `main`/`require` pointing at a non-existent `dist/index.cjs` and removes a bogus `bin` entry.

**Breaking (inherited from the service packages):** `f.agents.use(id).watch()` yields discriminated parts instead of raw SSE envelopes, `f.agents.define(...).create()` returns a typed accessor, and `f.ai.streamText()`'s `textStream`/`fullStream` are two views of one request. See the `@frontal-labs/agents` and `@frontal-labs/ai` changesets.

---
"@frontal-labs/sdk": major
---

Remove the `@frontal-labs/flags`, `@frontal-labs/vectors`, and `@frontal-labs/search`
packages. An end-to-end audit against the Frontal backend confirmed these three
packages have no corresponding backend service on the public API (no feature-flag
service; no vector/embedding or search service — embeddings are only exposed as
internal inference-gateway endpoints consumed by `@frontal-labs/ai`). They called
fabricated or double-prefixed paths (`/v1/v1/...`) that always 404 in production, so
they are dropped rather than maintained as non-functional stubs.

The umbrella `@frontal-labs/sdk` no longer exposes `sdk.flags`, `sdk.vectors`, or
`sdk.search`, and the corresponding tree-shakeable singletons are removed.

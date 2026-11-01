---
"@frontal-labs/ai": minor
"@frontal-labs/testing": minor
---

Restore embeddings on the public `POST /v1/embeddings` route.

- `@frontal-labs/ai`: new `ai.embeddings` with `embed`, `embedMany` and `create`. Results keep input order, and responses are checked against the request. Adds `EmbeddingRequestError` and `EmbeddingResponseError`. The gateway's internal embeddings route is no longer part of the contract.
- `@frontal-labs/testing`: new `mockEmbeddingModel` for offline tests of `ai.embeddings`.

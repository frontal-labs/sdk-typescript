---
"@frontal-labs/ai": minor
"@frontal-labs/core": minor
"@frontal-labs/testing": minor
---

- `ai.extractions.create({ vocabulary, input })` extracts an intent and typed entities from text against a vocabulary pinned by version (`id@x.y.z`; `latest` does not type-check). Entity spans are returned as JavaScript string offsets, so `input.slice(span.start, span.end)` is the value. A span that does not label its value throws `ExtractionResponseError`. Input is checked before any request (`ExtractionRequestError`), with the 8000-character limit counted in code points.
- `ai.extractions.vocabularies.list()` and `.get(pin)` read the served vocabulary and its schema.
- `RequestOptions.idempotencyKey` sends an `Idempotency-Key` header. The AI client generates one per call and reuses it on retries; decisions do the same, because the gateway requires the header on every write.
- `RequestOptions.preserveKeys` copies named top-level response keys through as sent, instead of camelCasing them. Used for `parameters` and vocabulary schemas.
- The gateway's nested error envelope `{"error":{message,type,param,code}}` maps to the typed error with its `code`, and a plain-text error body keeps its message.
- `mockExtractionModel` in `@frontal-labs/testing` scripts the extraction model, with spans computed from the input.

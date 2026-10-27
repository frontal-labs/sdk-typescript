# @frontal-labs/testing

## 1.1.0

### Minor Changes

- 6bb6903: Breaking: the AI SDK no longer calls the gateway's `/internal/*` routes. Removed `embed`, `generateSpeech`, `generateImage`, `generateVideo`, `transcribe`, `moderate`, `listModels`, `getDefaultModels` and `rerank`, with their option and result types. `generateText`, `streamText`, `generateObject` and `health` are unchanged. Under 0.x semver this is a breaking change released as a minor bump.
  
  - `ai.decisions.decide({ model, state, questions })` answers typed `noul`, `choice` and `score` questions. Answers are typed per question name, and the result carries `requestId`, `model` and `usage` (including `cachedTokens` when reported). Input is validated before any request is sent (`DecisionRequestError`). A response that doesn't match the questions raises `DecisionResponseError`.
  - `ai.decisions.models()` lists the decision models.
  - `onDecision` audit hook: receives a record with a SHA-256 digest of the state, never the state. A throwing hook fails the call.
  - `evaluateDecision(result, policy)` evaluates typed rules over the answers and returns `allow`, `review` or `reject`, with every rule that fired and its reason.
  - `createAIClient({ compression: "zstd" })` compresses large request bodies. Off by default.
  - The decisions routes and schemas are in `contracts/openapi/ai.openapi.json`, generated from the Zod wire schemas.
  - Testing: `mockDecisionModel` scripts the decision model at the transport layer. The scenario aliases `ai.decisions.decide` and `ai.decisions.models` replace the removed `ai.embed` and `ai.listModels`.
- e4a35e6: - `simulateStream()` / `mockStreamResponse()` build SSE/NDJSON `Response`s; `MockRoute` gains `stream`, `handler(request)`, `times`, and `{param}`/`:param` path wildcards (`matchPath`).
  - `mockLanguageModel({ doGenerate, doStream })` — a model-level mock implemented as fetch routes so the real `AISdk` request/response code runs; records `calls`.
  - `createScenario()` / `MockFrontal.scenario()` — sequenced multi-step scripts keyed by alias (`agents.message`, …) or `"METHOD /path/{param}"`, with `assertAllHit()`.
  - README rewritten to match the real exports (it previously documented `mockFixture`, `buildAgent`, `expectCallCount` which never existed). Removes a bogus `bin` entry.
  - `catchAllRoute()` / `catchAllRoutes()` answer any request with a body that satisfies both single-resource and paginated readers — for endpoint-contract tests.
- af9e479: - `ai.extractions.create({ vocabulary, input })` extracts an intent and typed entities from text against a vocabulary pinned by version (`id@x.y.z`; `latest` does not type-check). Entity spans are returned as JavaScript string offsets, so `input.slice(span.start, span.end)` is the value. A span that does not label its value throws `ExtractionResponseError`. Input is checked before any request (`ExtractionRequestError`), with the 8000-character limit counted in code points.
  - `ai.extractions.vocabularies.list()` and `.get(pin)` read the served vocabulary and its schema.
  - `RequestOptions.idempotencyKey` sends an `Idempotency-Key` header. The AI client generates one per call and reuses it on retries; decisions do the same, because the gateway requires the header on every write.
  - `RequestOptions.preserveKeys` copies named top-level response keys through as sent, instead of camelCasing them. Used for `parameters` and vocabulary schemas.
  - The gateway's nested error envelope `{"error":{message,type,param,code}}` maps to the typed error with its `code`, and a plain-text error body keeps its message.
  - `mockExtractionModel` in `@frontal-labs/testing` scripts the extraction model, with spans computed from the input.

### Patch Changes

- Updated dependencies [d7c7a05]
- Updated dependencies [6bb6903]
- Updated dependencies [e4a35e6]
- Updated dependencies [af9e479]
- Updated dependencies [f50d2da]
  - @frontal-labs/core@1.1.0

## 1.0.4

### Patch Changes

- Relicense all packages under Apache-2.0 (previously MIT).
- Updated dependencies
  - @frontal-labs/core@1.0.4

## 1.0.3

### Patch Changes

- Updated dependencies
  - @frontal-labs/core@1.0.3

## 1.0.2

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 1.0.1

### Patch Changes

- Initial public release. Build system refactored: composite TypeScript project
  references enabled across all packages, type declarations generated via tsc,
  npm provenance configured, GitHub Actions CI/CD pipeline with Changesets
  integration.
- Updated dependencies
  - @frontal-labs/core@1.0.1

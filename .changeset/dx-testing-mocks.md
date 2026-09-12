---
"@frontal-labs/testing": minor
---

- `simulateStream()` / `mockStreamResponse()` build SSE/NDJSON `Response`s; `MockRoute` gains `stream`, `handler(request)`, `times`, and `{param}`/`:param` path wildcards (`matchPath`).
- `mockLanguageModel({ doGenerate, doStream })` — a model-level mock implemented as fetch routes so the real `AISdk` request/response code runs; records `calls`.
- `createScenario()` / `MockFrontal.scenario()` — sequenced multi-step scripts keyed by alias (`agents.message`, …) or `"METHOD /path/{param}"`, with `assertAllHit()`.
- README rewritten to match the real exports (it previously documented `mockFixture`, `buildAgent`, `expectCallCount` which never existed). Removes a bogus `bin` entry.
- `catchAllRoute()` / `catchAllRoutes()` answer any request with a body that satisfies both single-resource and paginated readers — for endpoint-contract tests.

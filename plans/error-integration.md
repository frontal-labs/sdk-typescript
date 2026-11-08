# Plan: integrate `@frontal-labs/error` into `sdk-typescript`

Status: complete, with the deviations listed under "Final status". PRs #61–#64 are merged.
Library: `@frontal-labs/error@0.7.0` (npm, MIT, `engines.node >= 22`).

## Final status

| Phase | Status |
| --- | --- |
| 0 Audit | Done. Findings below. |
| 1 Dependency and build | Done. Bundled, pinned, notice shipped, Dependabot group. Skill installed under `skills/frontal-error`. |
| 2 Core error classes | Done. Base class, status clamp, writable `requestId`, stack starts at the call site. |
| 3 Network and timeout | Done. Recognised by the library guard; core's guard unchanged. |
| 4 Response parsing | Done. Library parser for the envelope; `x-frontal-id` fallback. A fallback keeps the message when `code` is missing. |
| 5 Diagnostics and observability | Done. `describeSdkError`, `redactSecrets`, `logSdkFailure`, `FRONTAL_DEBUG` via `formatError`, error attributes, `service.name`. Serialization helpers are local, since 0.7.0 does not export them. |
| 6 SDK-local errors | Done for polling and argument validation. `POLL_TIMEOUT` is created with `createErrors`; argument errors are `TypeError`s with code `invalid_request`. `CIRCUIT_OPEN` keeps its class, because `createErrors` cannot build `CircuitBreakerOpenError`. See deviations. |
| 7 Testing helpers | Done. `mockError`, `expectFrontalError`; fixtures use the gateway envelope. |
| 8 React and templates | Done for the one template with an HTTP handler. `getPublicMessage` added. The browser client reads the nested envelope. |
| 9 Docs and release | Done. `docs/ERRORS.md`, READMEs, both `SKILL.md` files, changesets. |

### Deviations (deliberate)

- **`createErrors` for `circuit_open`.** Not used. `createErrors` builds base-library errors, which are not `CircuitBreakerOpenError` instances, so `instanceof` checks would break. The breaker keeps its class and its `CIRCUIT_OPEN` code. `createErrors` is used for `POLL_TIMEOUT`.
- **Templates `agent-approval`, `cron-export`, `pipeline-graph`.** Not changed. They are CLI scripts with no HTTP boundary, so there is no client-facing error to map.
- **CORS `Access-Control-Expose-Headers`.** Not applicable. The repo sends no CORS headers. `docs/ERRORS.md` tells apps to expose `x-frontal-id`.
- **Workflows response-shape errors and the zstd runtime check.** Still plain `TypeError`s without a code, because they describe a bad response or a runtime, not a request.

### Verification

- The bundle has no runtime import of `@frontal-labs/error`. A search found no code that assigns developer fields after construction.
- `runtime:smoke` passes under Bun and Node.
- Edge: `runtime:worker` runs core inside workerd (Miniflare) with no compatibility flags. The `runtime:deno` check runs core under Deno 2.9.8. Deno needs `--allow-env`, because core reads its environment at import, so it is granted in the script.

## Phase 0 findings (against the published 0.7.0 tarball)

These corrections change parts of the original plan. Where they conflict, this section wins.

| Plan assumption | What 0.7.0 actually does | Resolution |
| --- | --- | --- |
| D1: library requires Node ≥ 24 | `engines.node` is `>=22`. The only Node-24 API is `Error.isError`, which the library guards with a fallback. | Bundling still holds. The Node 24 floor is not needed. |
| D6: `retry: { retryable }` option | No `retry` option exists. | Core keeps its own `retryable` field. |
| D10: `category` and `kind` on errors | Neither exists on errors. `kind` only appears on format sections. | Omitted. |
| Phase 5: `serializeFailure`, `deserializeFailure`, `failureFingerprint` | Not exported in 0.7.0. | Core ships its own `describeSdkError()` (see below). No upstream issue. |
| Phase 5: redact `frt_` keys | No redaction code in the package. | Core ships `redactSecrets()` and redacts diagnostics. No upstream issue. |
| Phase 2 code: `retry` option, `requestId` as a constructor option | `requestId` is a constructor option. `retry` is not. | Phase 2 class adapted (see below). |
| Phase 4: `parseErrorResponseData` drops envelopes without `code` | Correct. | Core keeps a fallback that preserves the message with `UNKNOWN_ERROR`. |
| "Constructing an error must not throw" | `normalizeErrorIdentity` throws `TypeError` on a blank `code` or `scope`. | Core normalizes blank codes to `UNKNOWN_ERROR`. |
| `.size-limit.mjs` budgets to re-baseline | `main` now has size-limit budgets. Core measures 87.19 kB brotlied against a 92 kB budget, and sdk 116.21 kB against 124 kB. | Budgets unchanged, all passing. |
| Renovate rule | The repo uses Dependabot. | Added a Dependabot group with `needs-review` and excluded the package from the catch-all group. |
| "Fork of `vercel-labs/error`" | Neither the package `LICENSE.md` nor its README mentions it. | Not claimed in the notice. Confirm upstream before adding. |
| `tsup` `noExternal` | Confirmed. The config had `external: ["zod"]`, which is kept. | Done. |

## What was built

- **PR 1 (#61):** exact dependency pin, `noExternal` bundling, third-party notice, Dependabot group.
- **PR 2 (#61):** `FrontalError` on the base class, `NetworkError` and `TimeoutError` on the base class, the nested-envelope parser, and compatibility snapshots.
- **PR 3 (#62):** `describeSdkError`, `logSdkFailure`, error attributes, `CircuitBreakerOpenError` on the base class, `mockError`, `expectFrontalError`, two-copies test.
- **PR 4 (#63):** `getPublicMessage`, SDK re-exports, `docs/ERRORS.md`, `SKILL.md` updates, the `frontal-error` skill.
- **PR 5 (#64):** stream disclosure fix in `ai`, `serviceName` on every client, polling metadata, chatbot route error mapping, gateway envelope for mock routes.
- **Follow-up:** the browser client reads the nested envelope, `FRONTAL_DEBUG` renders with `formatError` and redacts keys.

## Open questions

None for the plan. Upstream attribution (`vercel-labs/error`) is still unverified and is not claimed in the notice.

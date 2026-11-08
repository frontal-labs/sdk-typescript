# Plan: integrate `@frontal-labs/error` into `sdk-typescript`

Status: PR 1 and PR 2 implemented on `feat/error-library-integration` (based on `origin/main`). PR 3 and PR 4 not started.
Library: `@frontal-labs/error@0.7.0` (npm, MIT, `engines.node >= 22`).

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

## What was implemented

### PR 1: dependency and build

- `packages/core/package.json`: `"@frontal-labs/error": "0.7.0"` (exact pin, D9).
- `packages/core/tsup.config.ts`: `noExternal: ["@frontal-labs/error"]` (D1). The ESM and CJS outputs contain no runtime import of the library. `zod` stays external.
- `packages/core/src/diagnostics.ts`: `describeSdkError()` and `redactSecrets()`. `describeSdkError()` returns a log-ready view with a `scope/code` fingerprint, no `cause` or `stack`, and `frt_` keys replaced with `[REDACTED]` in the message, request id and metadata.
- `packages/core/THIRD_PARTY_NOTICES.md`: the library's MIT license, shipped in the package `files`.
- `.github/dependabot.yml`: a `frontal-error` group with a `needs-review` label, excluded from the catch-all group.
- Not done: `npx skills add frontal-labs/error`. It downloads third-party agent instructions, so it needs review before it lands.

### PR 2: error classes, network and timeout errors, parsing

- `FrontalError` extends the library's base class, imported as `BaseFrontalError` (D2). Core keeps its own name, brand and `isFrontalError`.
- Scope is `"frontal"` for every SDK error (D4). Codes are unchanged.
- Statuses outside 400–599 are clamped to 500, and the original is kept in `metadata.rawStatus` (D5).
- No `public` is set (D3).
- `toJSON()` keeps the `SerializedFrontalError` shape (D7).
- `NetworkError` and `TimeoutError` extend the base class, keep their codes, and no longer serialize `cause`.
- `toString()` is pinned to the native `Name: message` form on all three roots, so `String(err)` is unchanged.
- `normalizeErrorBody` uses the library's `parseErrorResponseData` for the nested envelope, with a fallback that keeps the message when there is no `code`.
- `http.ts` reads `x-frontal-id` as a fallback after `x-request-id`.

### Tests

- `packages/core/tests/error-library.test.ts`: recognition for all 12 classes, disclosure through `errorResponse()`, status bounds, nested parsing, blank codes, malformed bodies, JSON shapes, `String()` output.
- `packages/core/tests/errors.test.ts`: one assertion changed. The stack now starts at the call site, not inside `new FrontalError`. This is a deliberate behaviour change, listed in the changeset.

## Not done yet

- PR 2 remainder: a test that loads two copies of core. Not written.
- PR 3: `logSdkFailure` in observability, `tracing.ts` attributes, `createErrors` for SDK-local errors (`circuit_open`, `poll_timeout`, `invalid_request`), testing helpers. `FRONTAL_DEBUG` logging is also not wired to `formatError`.
- PR 4: `getPublicMessage` in `@frontal-labs/react`, the template changes, and the docs (`docs/ERRORS.md`, README sections, `SKILL.md`).
- `npx skills add frontal-labs/error` (see PR 1 above).

## Resolved questions

1. Upstream issues were not opened. The missing diagnostics helpers are implemented locally in core (see `diagnostics.ts`).
2. The `vercel-labs/error` attribution is not claimed in the notice, because the package does not state it.
3. The work is on `feat/error-library-integration`, based on `origin/main`.

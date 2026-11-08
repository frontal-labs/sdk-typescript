---
"@frontal-labs/core": minor
---

Errors now extend the shared `@frontal-labs/error` base class.

- `FrontalError`, the status subclasses, `NetworkError` and `TimeoutError` are real `@frontal-labs/error` errors. The library's `isFrontalError` returns `true` for all of them. Core's own `isFrontalError` is unchanged: it returns `false` for `NetworkError` and `TimeoutError`.
- `FrontalError.requestId` is no longer `readonly`, because the base class sets it.
- Statuses outside 400–599 are clamped to `500`, and the original value is kept in `metadata.rawStatus`.
- A blank error code becomes `UNKNOWN_ERROR` instead of throwing.
- Error stacks start at the call site, not inside the constructor.
- `NetworkError` and `TimeoutError` no longer serialize their `cause`. Their `toJSON()` keeps `name`, `code`, `message`, `retryable` and `fix`.
- `FrontalError.toJSON()` keeps its existing shape. `String(error)` keeps the `Name: message` form.
- `@frontal-labs/error@0.7.0` is bundled into the ESM and CJS builds. It is pinned exactly and has no runtime import.

---
"@frontal-labs/core": patch
"@frontal-labs/sdk": patch
---

Core error handling for the ontology API:

- HTTP 412 now throws `PreconditionFailedError` (status 412), exported from the
  core and SDK entry points. It is a `FrontalError`, so existing `instanceof
  FrontalError` checks still hold.
- When an error body has a `code` and a `detail` but no `message`, `detail` is
  the error message. Other error bodies keep their previous message.

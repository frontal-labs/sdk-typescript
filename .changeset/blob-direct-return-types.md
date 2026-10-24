---
"@frontal-labs/blob": minor
---

`IBlobClient` now declares the return types the client implements: methods return
their results directly (`Promise<void>`, `Promise<Blob>`, `Promise<ListObjectsResult>`,
and so on) and throw on failure, instead of `Promise<APIResponse<...>>`. The
`list` parameters also include `limit` and `offset`, and `upload` accepts the same
data types as `BlobSdk.upload`. The `APIResponse` type re-export remains.

`upload` now reads `ReadableStream`, `ArrayBuffer`, `Uint8Array`, and `Buffer` input
into the uploaded file. Before, a stream was stored as the text "[object ReadableStream]".
`SignedUrlOptions.operation` is deprecated: it was validated but never sent, so it had
no effect. `VERSION` now reports the package version (`1.0.3`).

# Architecture

`@frontal-labs/blob` is a thin client over the Frontal Blob HTTP API. It adds
typed inputs, typed outputs, and `FrontalError` handling. Transport, auth, and
retry behavior come from `@frontal-labs/core`.

## Layers

```
blob (Proxy singleton)  ─┐
createBlobClient(...)   ─┼─► BlobSdk ─► HttpClient (@frontal-labs/core) ─► Blob API
FrontalClient           ─┘
```

| File           | Responsibility                                                                 |
|----------------|--------------------------------------------------------------------------------|
| `client.ts`    | `createBlobClient` (from a `FrontalClient` or config) and the lazy `blob` singleton |
| `sdk.ts`       | `BlobSdk`, the nine object and bucket operations, each mapped to one HTTP route |
| `schemas.ts`   | Zod v4 schemas and inferred types for `BlobObject`, `ListObjectsResult`, `SignedUrlOptions`, `BlobConfig`, `BucketConfig`; the `IBlobClient` interface |
| `constants.ts` | `DEFAULT_BLOB_BASE_URL`, `VERSION`, timeout and retry defaults                 |
| `index.ts`     | Public exports                                                                 |

## Client construction

`createBlobClient` accepts either a `FrontalClient` or a `BlobClientConfig`.

- With a `FrontalClient`, it reuses that client's `httpClient`, so timeouts, retries, and interceptors configured on the client apply.
- With a config object, it builds a new `HttpClient` with `apiKey`, `baseUrl` (default `DEFAULT_BLOB_BASE_URL`, overridable by `FRONTAL_API_URL`), `timeout` (default 30 s), `maxRetries` (default 3), and optional `interceptors`.

The `blob` export is a `Proxy` that creates one `BlobSdk` on first property access, using `getDefaultClient()` (which reads `FRONTAL_API_KEY`). Method calls are bound to that instance.

## Request mapping

Object routes live under `/blob/object` relative to the versioned base URL.

| Method            | HTTP call                                                  |
|-------------------|------------------------------------------------------------|
| `upload`          | `POST /blob/object/{bucket}/{key}` (multipart form, `file` field) |
| `download`        | `GET /blob/object/{bucket}/{key}` → `Blob`                 |
| `downloadStream`  | `GET /blob/object/{bucket}/{key}` → body `ReadableStream`  |
| `delete`          | `DELETE /blob/object/{bucket}/{key}`                       |
| `list`            | `POST /blob/object/list/{bucket}` with `prefix`, `limit`, `offset` |
| `getSignedUrl`    | `POST /blob/object/sign/{bucket}/{key}` with `expiresIn`; returns `signedURL` |
| `copyObject`      | `POST /blob/object/copy`                                   |
| `moveObject`      | `POST /blob/object/move`                                   |
| `getMetadata`     | `GET /blob/object/info/{bucket}/{key}`, validated against `blobObjectSchema` |

`upload` wraps non-`Blob` data in a `Blob` with the given `contentType`
(default `application/octet-stream`) and sends a fixed `cacheControl` of `3600`.

`getSignedUrl` validates `options` with `signedUrlOptionsSchema` before sending.
`operation` is deprecated: it is validated if present and is never included in the request body.

## Error handling

Methods return values on success and throw on failure. Failures from the HTTP
layer are `FrontalError` instances from `@frontal-labs/core`, carrying `code`,
`statusCode`, `requestId`, `retryable`, and an optional `fix`. `downloadStream`
throws a plain `Error` when the response has no body. Invalid signed-URL
options fail Zod validation and throw a `ZodError`.

## Retries

The core `HttpClient` retries only `GET` requests, on 429 and 5xx responses, up
to `maxRetries` times, with exponential backoff or the `Retry-After` header.
In this package that covers `download`, `downloadStream`, and `getMetadata`.
`upload`, `delete`, `list`, `getSignedUrl`, `copyObject`, and `moveObject` use
POST or DELETE requests and are not retried by the transport. Callers
that need to retry those should branch on `FrontalError.retryable`.

## Streaming

`downloadStream` returns the response body as a `ReadableStream<Uint8Array>`
without buffering it. `upload` does not stream: its type accepts a
`ReadableStream`, but the implementation wraps the data in a `Blob`, so pass
`Blob`, `ArrayBuffer`, `Uint8Array`, or `Buffer` for uploads.

## Configuration

| Source                  | Used for                                      |
|-------------------------|-----------------------------------------------|
| `FRONTAL_API_KEY`       | API key for the `blob` singleton              |
| `FRONTAL_API_URL`       | Base URL override (default `https://api.frontal.dev/v1`) |
| `FRONTAL_ENV`, `FRONTAL_DEBUG` | Environment and debug logging, passed through to core |
| `BlobClientConfig`      | Per-client overrides passed to `createBlobClient` |

## Compatibility aliases

`StorageObject`, `StorageConfig`, `storageObjectSchema`, `storageConfigSchema`,
and `IStorageClient` are kept as aliases of their `Blob`-named counterparts.

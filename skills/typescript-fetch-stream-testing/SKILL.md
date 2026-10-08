---
name: typescript-fetch-stream-testing
description: Test Frontal TypeScript SDK requests, errors, pagination, and streams with fetch-level mocks.
---

# TypeScript Fetch and Stream Testing

Use this skill when writing or changing tests for HTTP behavior in the TypeScript SDK.

- Mock at the fetch layer with `@frontal-labs/testing`; use `createTestClient` and repository fixtures instead of a live service or real key.
- Assert method, path/query, headers, transformed body, parsed response, and error type. Include request ID and retry metadata checks where behavior depends on them.
- Exercise pagination continuation and async iteration without relying on timing-sensitive sleeps.
- For streams, cover event ordering, discriminated error parts, completion, and consumer cancellation. Do not silently drop yielded errors.
- Keep tests beside the owning package and use the shared testing package rather than reimplementing its mock transport.
- Run `bun run test`, `bun run type-check`, and `bun run test:examples` when public README usage changes.

Follow `docs/TESTING.md` and `AGENTS.md` for fixtures and scripts.

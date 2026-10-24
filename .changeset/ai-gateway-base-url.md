---
"@frontal-labs/ai": minor
---

Point the AI client at the AI gateway by default. `createAIClient(frontalClient)`
and the `ai` singleton now use `https://ai.frontal.dev` instead of the public API
base URL, which does not serve the `/ai/*` and `/internal/*` routes. Credentials and
transport settings from the `FrontalClient` are still reused. `FRONTAL_API_URL` no
longer changes the AI base URL; pass `baseUrl` to `createAIClient` to override it.

`IAIClient` now declares direct return types (`Promise<GenerateTextResult>`, not
`Promise<APIResponse<...>>`), matching the implementation. The `APIResponse` type
re-export remains.

`registerTool` is now generic, so typed tools from `defineTool` can be registered
without casts. The method is still deprecated; use `tool()` with `generateText({ tools })`.

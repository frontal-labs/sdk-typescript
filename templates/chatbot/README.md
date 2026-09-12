# Frontal chatbot template

A streaming chatbot in two files: a route that calls `ai.streamText` and a
page that renders it with `useChat`. Errors are streamed as data, so a rate
limit shows up as a "Retry" button instead of a dead page.

## Use it

```bash
# From a fresh directory
cp -r templates/chatbot my-chatbot && cd my-chatbot
cp .env.example .env            # set FRONTAL_API_KEY=frt_...
bun install                      # replace workspace:* with real versions when copying out of the repo
bun run dev                      # http://localhost:3000
```

When copying out of this repository, change the two `workspace:*` deps in
`package.json` to published versions (`bun add @frontal-labs/sdk @frontal-labs/react`).

## Files

| File | Role |
| --- | --- |
| `src/app/api/chat/route.ts` | `POST /api/chat` → `toUIMessageStreamResponse(f.ai.streamText(...))` |
| `src/app/page.tsx` | `useChat({ api: "/api/chat" })` and a form |
| `.env.example` | `FRONTAL_API_KEY` (server only) |

## Customize

- Model: set `FRONTAL_MODEL` or edit the route.
- Tools: pass `tools` to `streamText`; `tool-call` parts render in the page.
- Auth: wrap the route; `useChat({ headers })` forwards headers.

## Deploy

Any Next.js host works (Vercel, Cloudflare, a container). Only the route needs
`FRONTAL_API_KEY`. The CLI will wrap this template as `frontal init chatbot`
later; nothing here depends on it.

## Test

The repository test-suite exercises this route against a mocked model
(`tests/templates/chatbot.test.ts`), so the template cannot drift from the SDK.

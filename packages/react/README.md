# @frontal-labs/react

React hooks for the Frontal SDK. Thin, transport-agnostic, no framework
lock-in: `useChat` talks to any route that returns
`toUIMessageStreamResponse(...)`; the other hooks take objects from
`new Frontal(...)`.

## Installation

```bash
bun add @frontal-labs/sdk @frontal-labs/react
```

Peer dependency: `react >= 18`.

## Chat in two files (Next.js App Router)

**`app/api/chat/route.ts`** — the server side. `toUIMessageStreamResponse`
turns `ai.streamText` into a streaming `Response`; model errors arrive as
frames the UI can render and retry, not as broken connections.

```ts
import { Frontal, toUIMessageStreamResponse } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: Array<{ role: string; content: string }>;
  };
  // Never trust roles from the browser: keep the system prompt server-side.
  const history = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  return toUIMessageStreamResponse(
    f.ai.streamText({
      model: "claude-sonnet-5",
      prompt: [{ role: "system", content: "You are a helpful assistant." }, ...history],
      streamRetries: 1,
    })
  );
}
```

**`app/page.tsx`** — the client side.

```tsx
"use client";
import { useChat } from "@frontal-labs/react";
import { useState } from "react";

export default function Chat() {
  const { messages, send, status, error, retry, stop } = useChat({ api: "/api/chat" });
  const [input, setInput] = useState("");

  return (
    <main>
      {messages.map((m) => (
        <div key={m.id}>
          <b>{m.role}:</b>{" "}
          {m.parts.map((p, i) =>
            p.type === "text" ? (
              <span key={i}>{p.text}</span>
            ) : p.type === "tool-call" ? (
              <code key={i}>{p.toolName}({JSON.stringify(p.input)})</code>
            ) : (
              <em key={i}>{p.error.message}{p.error.retryable ? " (retryable)" : ""}</em>
            )
          )}
        </div>
      ))}
      {error?.retryable && <button onClick={() => retry()}>Retry</button>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
          setInput("");
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button disabled={status === "streaming"}>Send</button>
        {status === "streaming" && <button type="button" onClick={stop}>Stop</button>}
      </form>
    </main>
  );
}
```

That is the whole chatbot. A copy-paste version lives in
[`templates/chatbot`](../../templates/chatbot).

## Hooks

### `useChat(options)`

| Option | Purpose |
| --- | --- |
| `api` | Route URL (default `/api/chat`) **or** a `(messages, { signal }) => Promise<Response>` transport |
| `id`, `body`, `headers` | Sent with every request |
| `fetch` | Custom fetch (tests, auth) |
| `onError(err)` | Every error frame (`err.code`, `err.retryable`, `err.fix`) |
| `onFinish(message)` | When the assistant message completes |

Returns `{ messages, status, error, send, stop, retry, setMessages }`.
`messages[i].parts` is a discriminated union of `text`, `tool-call`
(`state: "pending" | "done" | "error"`) and `error`.

### `useAgentRun(agent, options)`

Agents are event-driven, not chat: `trigger(event, payload)` starts a run and
streams it. With a `stateSchema` on the accessor, `state` is typed.

```tsx
import { Frontal } from "@frontal-labs/sdk";
import { useAgentRun } from "@frontal-labs/react";
import { z } from "zod";

const f = new Frontal({ apiKey: process.env.NEXT_PUBLIC_FRONTAL_API_KEY! });
const triage = f.agents.use("agt_ticket_triager", {
  stateSchema: z.object({ tier: z.string(), score: z.number() }),
});

export function TriagePanel() {
  const { trigger, events, state, status, error } = useAgentRun(triage);
  return (
    <div>
      <button onClick={() => trigger("support.ticket.created", { ticketId: "t_987" })}>
        Run
      </button>
      <p>{status}{state ? ` — tier ${state.tier} (${state.score})` : ""}</p>
      {error && <p>{error.code}: {error.fix ?? error.message}</p>}
      <ul>{events.map((e, i) => <li key={i}>{e.type === "event" ? e.event : e.type}</li>)}</ul>
    </div>
  );
}
```

### `useWorkflowApprovals(workflows, options)`

The human side of an agent's `approveWhen` contract.

```tsx
import { Frontal } from "@frontal-labs/sdk";
import { useWorkflowApprovals } from "@frontal-labs/react";

const f = new Frontal({ apiKey: process.env.NEXT_PUBLIC_FRONTAL_API_KEY! });

export function Inbox() {
  const { approvals, approve, reject, loading } = useWorkflowApprovals(f.workflows, {
    pollIntervalMs: 5_000,
  });
  if (loading && approvals.length === 0) return <p>Loading…</p>;
  return (
    <ul>
      {approvals.map((a) => (
        <li key={a.id}>
          {a.stepId}
          <button onClick={() => approve(a.id, "LGTM")}>Approve</button>
          <button onClick={() => reject(a.id)}>Reject</button>
        </li>
      ))}
    </ul>
  );
}
```

## Testing

Everything runs against mocks — no gateway, no key:

```ts
import { AISdk, toUIMessageStreamResponse } from "@frontal-labs/ai";
import { createTestClient, mockLanguageModel } from "@frontal-labs/testing";

const model = mockLanguageModel({ doGenerate: () => ({ text: "Hello!" }) });
const ai = new AISdk(createTestClient(model.routes).client.httpClient);

// A fake /api/chat for useChat({ fetch })
const fetchImpl: typeof fetch = async () =>
  toUIMessageStreamResponse(ai.streamText({ model: "m", prompt: "hi" }));
```

See `tests/` in this package for `renderHook` examples.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `FRONTAL_API_KEY` | Server routes | API key (`frt_...`); never ship it to the browser |
| `NEXT_PUBLIC_FRONTAL_API_KEY` | Client hooks | A browser-scoped key, if your deployment issues them |

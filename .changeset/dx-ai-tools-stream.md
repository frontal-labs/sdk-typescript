---
"@frontal-labs/ai": minor
---

- Tool loop: `generateText({ tools, maxSteps })` executes tools that define `execute`, feeds results back to the model and repeats up to `maxSteps`; results carry `steps` and `toolResults`, `onStepFinish` fires per step. Tools without `execute` end the loop with calls in `toolCalls`.
- Tools that reach the model: `generateText`/`streamText` accept `tools` (built with `tool()`) and `toolChoice`; `generateText` returns `toolCalls`, `streamText().fullStream` yields `tool-call` parts. The in-memory `defineTool`/`registerTool`/`executeTool` registry is deprecated.
- `streamText`'s `textStream` and `fullStream` are two views of one request (not a broadcast): read the one you need from the start; breaking out of either cancels the request unless the other is still being read. Previously an early `break` could not cancel the request.
- `streamText` gains `fullStream` (`text` | `tool-call` | `finish` | `error` | `abort` | `done` parts), `finishReason`, and options `signal`, `onError`, `onAbort`, `streamRetries` (retry before first byte). Errors are yielded as data instead of tearing down the stream.
- UI message stream protocol: `toUIMessageStreamResponse()`, `parseUIMessageStream()`, `applyUIFrame()`, `UIMessage` types (header `x-frontal-ai-ui-message-stream: v1`).
- Options types (`GenerateTextOptions`, `StreamTextOptions`, …) now derive from `z.input`, so defaulted fields are optional for callers.

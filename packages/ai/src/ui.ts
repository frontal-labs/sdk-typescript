import type { SdkError, SerializedFrontalError } from "@frontal-labs/core";
import type { StreamTextResult } from "./schemas";
import type { StreamUsage, TextStreamPart } from "./stream";

/**
 * UI message stream protocol (`x-frontal-ai-ui-message-stream: v1`).
 *
 * Server: `toUIMessageStreamResponse(ai.streamText(...))` in a route.
 * Client: `parseUIMessageStream(response)` (used by `@frontal-labs/react`).
 * Framework-agnostic — no React here.
 */

export const UI_MESSAGE_STREAM_HEADER = "x-frontal-ai-ui-message-stream";
export const UI_MESSAGE_STREAM_VERSION = "v1";

/** A serialized error inside a UI stream / message part. */
export interface UIError extends Partial<SerializedFrontalError> {
  code: string;
  message: string;
  retryable: boolean;
}

/** One frame on the wire. */
export type UIStreamFrame =
  | { type: "start"; messageId: string }
  | { type: "text-delta"; delta: string }
  | { type: "tool-call"; id?: string; toolName: string; input: unknown }
  | { type: "tool-result"; id?: string; toolName: string; output: unknown }
  | { type: "error"; error: UIError }
  | { type: "finish"; finishReason: string; usage: StreamUsage }
  | { type: "abort" }
  | { type: "done" };

/** Parts of a rendered message. */
export type UIMessagePart =
  | { type: "text"; text: string }
  | {
      type: "tool-call";
      id?: string;
      toolName: string;
      input: unknown;
      state: "pending" | "done" | "error";
      output?: unknown;
    }
  | { type: "error"; error: UIError };

/** A chat message as rendered by a UI. */
export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: UIMessagePart[];
  /** Convenience: concatenated text parts. */
  text: string;
}

export function serializeError(error: SdkError | Error): UIError {
  const e = error as Partial<SdkError> & Error;
  return {
    name: e.name,
    code: (e as { code?: string }).code ?? "UNKNOWN_ERROR",
    message: e.message,
    requestId: (e as { requestId?: string }).requestId,
    statusCode: (e as { statusCode?: number }).statusCode,
    retryable: (e as { retryable?: boolean }).retryable ?? false,
    docs: (e as { docs?: string }).docs,
    fix: (e as { fix?: string }).fix,
  };
}

function partToFrame(part: TextStreamPart): UIStreamFrame | undefined {
  switch (part.type) {
    case "text":
      return { type: "text-delta", delta: part.text };
    case "tool-call":
      return {
        type: "tool-call",
        id: part.id,
        toolName: part.toolName,
        input: part.input,
      };
    case "finish":
      return {
        type: "finish",
        finishReason: part.finishReason,
        usage: part.usage,
      };
    case "error":
      return { type: "error", error: serializeError(part.error) };
    case "abort":
      return { type: "abort" };
    case "done":
      return { type: "done" };
    default:
      return undefined;
  }
}

/** Options for {@link toUIMessageStreamResponse}. */
export interface UIMessageStreamOptions {
  /** Id for the assistant message being streamed (default: random). */
  messageId?: string;
  /** Extra response headers. */
  headers?: Record<string, string>;
  /** HTTP status (default 200). */
  status?: number;
}

/**
 * Wraps `ai.streamText(...)` in a `Response` that speaks the UI message
 * stream protocol. Errors become frames, never a broken connection.
 *
 * @example
 * ```ts
 * export async function POST(req: Request) {
 *   const { messages } = await req.json();
 *   return toUIMessageStreamResponse(f.ai.streamText({ model, prompt: messages }));
 * }
 * ```
 */
export function toUIMessageStreamResponse(
  result: Pick<StreamTextResult, "fullStream">,
  options: UIMessageStreamOptions = {}
): Response {
  const messageId =
    options.messageId ?? `msg_${Math.random().toString(36).slice(2, 10)}`;
  const encoder = new TextEncoder();
  const encode = (frame: UIStreamFrame) =>
    encoder.encode(`data: ${JSON.stringify(frame)}\n\n`);

  const reader = result.fullStream.getReader();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encode({ type: "start", messageId }));
    },
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      const frame = partToFrame(value);
      if (frame) controller.enqueue(encode(frame));
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(body, {
    status: options.status ?? 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      [UI_MESSAGE_STREAM_HEADER]: UI_MESSAGE_STREAM_VERSION,
      ...options.headers,
    },
  });
}

/**
 * Parses a UI message stream `Response` into frames. Works in browsers and
 * Node; tolerant of partial chunks.
 */
export async function* parseUIMessageStream(
  response: Response,
  options: { signal?: AbortSignal } = {}
): AsyncGenerator<UIStreamFrame> {
  if (!response.ok) {
    let body: unknown = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }
    const b = (body ?? {}) as Partial<UIError>;
    yield {
      type: "error",
      error: {
        code: b.code ?? `HTTP_${response.status}`,
        message: b.message ?? response.statusText,
        retryable: [408, 425, 429, 500, 502, 503, 504].includes(
          response.status
        ),
        requestId: b.requestId,
        statusCode: response.status,
      },
    };
    yield { type: "done" };
    return;
  }
  if (!response.body) {
    yield { type: "done" };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawDone = false;
  let yieldedAbort = false;
  const onAbort = () => void reader.cancel();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx = buffer.indexOf("\n\n");
      while (idx !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        idx = buffer.indexOf("\n\n");
        const line = raw.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        try {
          const frame = JSON.parse(line.slice(5).trim()) as UIStreamFrame;
          if (frame.type === "done") sawDone = true;
          yield frame;
        } catch {
          // ignore malformed frame
        }
      }
    }
  } catch (error) {
    if (options.signal?.aborted) {
      yieldedAbort = true;
      yield { type: "abort" };
    } else {
      yield { type: "error", error: serializeError(error as Error) };
    }
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
  }
  // `reader.cancel()` makes `read()` resolve as done rather than throw, so an
  // abort that lands mid-stream exits the loop normally; report it as such.
  if (options.signal?.aborted && !sawDone && !yieldedAbort) {
    yield { type: "abort" };
  }
  if (!sawDone) yield { type: "done" };
}

/** Creates an empty message. */
export function createUIMessage(
  role: UIMessage["role"],
  text = "",
  id = `msg_${Math.random().toString(36).slice(2, 10)}`
): UIMessage {
  return { id, role, parts: text ? [{ type: "text", text }] : [], text };
}

/**
 * Pure reducer: applies a frame to an assistant message and returns the
 * updated copy. Used by `useChat`; handy for server-side rendering too.
 */
export function applyUIFrame(
  message: UIMessage,
  frame: UIStreamFrame
): UIMessage {
  const parts = [...message.parts];
  switch (frame.type) {
    case "start":
      return { ...message, id: frame.messageId };
    case "text-delta": {
      const last = parts.at(-1);
      if (last?.type === "text") {
        parts[parts.length - 1] = {
          type: "text",
          text: last.text + frame.delta,
        };
      } else {
        parts.push({ type: "text", text: frame.delta });
      }
      break;
    }
    case "tool-call":
      parts.push({
        type: "tool-call",
        id: frame.id,
        toolName: frame.toolName,
        input: frame.input,
        state: "pending",
      });
      break;
    case "tool-result": {
      const i = parts.findIndex(
        (p) =>
          p.type === "tool-call" &&
          (frame.id ? p.id === frame.id : p.toolName === frame.toolName)
      );
      if (i >= 0) {
        const p = parts[i] as Extract<UIMessagePart, { type: "tool-call" }>;
        parts[i] = { ...p, state: "done", output: frame.output };
      }
      break;
    }
    case "error":
      parts.push({ type: "error", error: frame.error });
      break;
    default:
      return message;
  }
  const text = parts
    .filter(
      (p): p is Extract<UIMessagePart, { type: "text" }> => p.type === "text"
    )
    .map((p) => p.text)
    .join("");
  return { ...message, parts, text };
}

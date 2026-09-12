import {
  calculateDelay,
  type HttpClient,
  type SdkError,
  type StreamPart,
} from "@frontal-labs/core";
import type { ChatCompletionRequest, GenerateTextResult } from "./schemas";

/** Token usage reported at the end of a stream. */
export interface StreamUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Parts yielded by `ai.streamText().fullStream`. Errors are data so a UI can
 * render them and offer a retry without tearing down the whole stream.
 */
export type TextStreamPart =
  | { type: "text"; text: string }
  | { type: "tool-call"; id?: string; toolName: string; input: unknown }
  | {
      type: "finish";
      finishReason: GenerateTextResult["finishReason"];
      usage: StreamUsage;
    }
  | { type: "error"; error: SdkError }
  | { type: "abort" }
  | { type: "done" };

/** Streaming-only options layered on top of the generation options. */
export interface StreamControlOptions {
  /** Abort the stream; yields `abort` then `done`. */
  signal?: AbortSignal;
  /** Called for every text delta (legacy `onChunk`). */
  onChunk?: (chunk: string) => void;
  /** Called for every `error` part before it is yielded. */
  onError?: (error: SdkError) => void;
  /** Called when the caller's signal aborts the stream. */
  onAbort?: () => void;
  /**
   * Re-issue the request up to N times if it fails *before the first byte*
   * with a retryable error (429, 5xx, network). Default 0.
   */
  streamRetries?: number;
}

const ZERO_USAGE: StreamUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

interface ToolCallDelta {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface ChunkChoice {
  delta?: {
    content?: string | null;
    toolCalls?: ToolCallDelta[] | null;
  };
  finishReason?: string | null;
}

function normalizeFinish(reason: string | null | undefined) {
  switch (reason) {
    case "stop":
    case "length":
    case "error":
    case "other":
      return reason;
    case "tool_calls":
    case "tool-calls":
      return "tool-calls" as const;
    case "content_filter":
    case "content-filter":
      return "content-filter" as const;
    default:
      return "other" as const;
  }
}

/** Honour `Retry-After` for rate limits; exponential backoff otherwise. */
function retryDelayFor(error: SdkError, attempt: number): number {
  const retryAfter = (error as { retryAfter?: number }).retryAfter;
  if (typeof retryAfter === "number" && Number.isFinite(retryAfter)) {
    return retryAfter * 1000;
  }
  return calculateDelay(attempt, "exponential", 500, true);
}

function parseArgs(raw: string): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Runs a chat-completion request in streaming mode and yields
 * {@link TextStreamPart}s. Handles `[DONE]`, tool-call assembly across
 * chunks, retries-before-first-byte, and abort.
 */
export async function* streamChatParts(
  http: HttpClient,
  body: ChatCompletionRequest,
  control: StreamControlOptions = {}
): AsyncGenerator<TextStreamPart> {
  const { signal, onChunk, onError, onAbort, streamRetries = 0 } = control;

  for (let attempt = 0; ; attempt++) {
    let emitted = false;
    let retry = false;
    let terminated = false;
    let retryDelayMs = 0;
    let usage: StreamUsage | undefined;
    let finishReason: GenerateTextResult["finishReason"] | undefined;
    const pendingTools = new Map<
      number,
      { id?: string; name: string; args: string }
    >();
    const idIndex = new Map<string, number>();

    const parts: AsyncIterable<StreamPart> = http.postStreamParts(
      "/ai/chat/completions",
      body,
      { signal }
    );

    for await (const part of parts) {
      if (part.type === "error") {
        if (!emitted && part.error.retryable && attempt < streamRetries) {
          retry = true;
          retryDelayMs = retryDelayFor(part.error, attempt);
          break;
        }
        onError?.(part.error);
        terminated = true;
        yield part;
        continue;
      }
      if (part.type === "abort") {
        onAbort?.();
        terminated = true;
        yield part;
        continue;
      }
      if (part.type === "done") {
        break;
      }

      if (part.data === "[DONE]") continue;
      const data = part.data as {
        choices?: ChunkChoice[];
        usage?: Partial<StreamUsage>;
      } | null;
      if (!data || typeof data !== "object") continue;
      emitted = true;

      const choice = data.choices?.[0];
      const content = choice?.delta?.content;
      if (content) {
        onChunk?.(content);
        yield { type: "text", text: content };
      }

      for (const tc of choice?.delta?.toolCalls ?? []) {
        // Providers that omit `index` send one complete call per delta;
        // key by id (or arrival order) so parallel calls don't merge.
        const index =
          tc.index ??
          (tc.id
            ? (idIndex.get(tc.id) ?? pendingTools.size)
            : pendingTools.size);
        if (tc.id) idIndex.set(tc.id, index);
        const cur = pendingTools.get(index) ?? {
          id: tc.id,
          name: "",
          args: "",
        };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name = tc.function.name;
        if (tc.function?.arguments) cur.args += tc.function.arguments;
        pendingTools.set(index, cur);
      }

      if (choice?.finishReason)
        finishReason = normalizeFinish(choice.finishReason);
      if (data.usage) {
        usage = {
          promptTokens: data.usage.promptTokens ?? 0,
          completionTokens: data.usage.completionTokens ?? 0,
          totalTokens: data.usage.totalTokens ?? 0,
        };
      }
    }

    if (retry) {
      if (retryDelayMs > 0) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
      if (signal?.aborted) {
        onAbort?.();
        yield { type: "abort" };
        yield { type: "done" };
        return;
      }
      continue;
    }
    if (terminated) {
      yield { type: "done" };
      return;
    }

    for (const [, tool] of [...pendingTools.entries()].sort(
      (a, b) => a[0] - b[0]
    )) {
      yield {
        type: "tool-call",
        id: tool.id,
        toolName: tool.name,
        input: parseArgs(tool.args),
      };
    }
    if (emitted) {
      yield {
        type: "finish",
        finishReason:
          finishReason ?? (pendingTools.size ? "tool-calls" : "stop"),
        usage: usage ?? ZERO_USAGE,
      };
    }
    yield { type: "done" };
    return;
  }
}

/**
 * Turns a part generator into the `{ textStream, fullStream, usage }` shape.
 * Both streams are fed from one pull loop over the request; cancelling
 * either one (e.g. `break`ing out of `for await`) stops the request unless
 * the other stream is still being read.
 */
export function toStreamTextResult(parts: AsyncGenerator<TextStreamPart>): {
  textStream: ReadableStream<string>;
  fullStream: ReadableStream<TextStreamPart>;
  usage: Promise<StreamUsage>;
  finishReason: Promise<GenerateTextResult["finishReason"]>;
} {
  let resolveUsage!: (u: StreamUsage) => void;
  let resolveFinish!: (r: GenerateTextResult["finishReason"]) => void;
  const usage = new Promise<StreamUsage>((r) => {
    resolveUsage = r;
  });
  const finishReason = new Promise<GenerateTextResult["finishReason"]>((r) => {
    resolveFinish = r;
  });

  const branches = {
    full: undefined as
      | ReadableStreamDefaultController<TextStreamPart>
      | undefined,
    text: undefined as ReadableStreamDefaultController<string> | undefined,
  };
  // A branch is "live" from its first read until it is cancelled. Streams
  // use `highWaterMark: 0` so `pull` only fires on an actual read (with the
  // default of 1 the runtime pulls once right after `start`). Parts are only
  // delivered to live branches, so read the stream you want from the start;
  // the two are alternatives, not a broadcast.
  const live = { full: false, text: false };
  let pumping: Promise<void> | undefined;
  let ended = false;

  const finish = (u: StreamUsage, r: GenerateTextResult["finishReason"]) => {
    resolveUsage(u);
    resolveFinish(r);
  };

  const closeAll = () => {
    if (ended) return;
    ended = true;
    finish(ZERO_USAGE, "other");
    try {
      branches.full?.close();
    } catch {
      /* already closed */
    }
    try {
      branches.text?.close();
    } catch {
      /* already closed */
    }
  };

  // Single pull loop: pushes each part to whichever branches are live.
  const pump = async () => {
    try {
      for await (const part of parts) {
        if (part.type === "finish") finish(part.usage, part.finishReason);
        else if (part.type === "error") finish(ZERO_USAGE, "error");
        if (live.full) branches.full?.enqueue(part);
        if (live.text) {
          if (part.type === "text") branches.text?.enqueue(part.text);
          else if (part.type === "error") {
            branches.text?.error(part.error);
            live.text = false;
          }
        }
        if (!(live.full || live.text)) break;
      }
    } catch (error) {
      if (live.full) branches.full?.error(error);
      if (live.text) branches.text?.error(error);
      ended = true;
      finish(ZERO_USAGE, "error");
      return;
    }
    closeAll();
  };

  const ensurePumping = () => {
    pumping ??= pump();
    return pumping;
  };

  const cancelBranch = (name: "full" | "text") => {
    live[name] = false;
    if (!(live.full || live.text)) {
      // Nobody is listening: stop the request.
      void parts.return(undefined).catch(() => undefined);
      closeAll();
    }
  };

  const fullStream = new ReadableStream<TextStreamPart>(
    {
      start(controller) {
        branches.full = controller;
      },
      pull() {
        live.full = true;
        return ensurePumping();
      },
      cancel: () => cancelBranch("full"),
    },
    { highWaterMark: 0 }
  );

  const textStream = new ReadableStream<string>(
    {
      start(controller) {
        branches.text = controller;
      },
      pull() {
        live.text = true;
        return ensurePumping();
      },
      cancel: () => cancelBranch("text"),
    },
    { highWaterMark: 0 }
  );

  return { textStream, fullStream, usage, finishReason };
}

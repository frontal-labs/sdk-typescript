import {
  isFrontalError,
  NetworkError,
  type SdkError,
  TimeoutError,
} from "./errors";

/**
 * A raw server-sent event as produced by the transport.
 */
export interface SseEvent<T = unknown> {
  type: string;
  data: T;
  id?: string;
}

/**
 * Discriminated stream parts. Errors are *data*, not exceptions, so UIs and
 * agents can render/retry without losing the rest of the stream.
 *
 * - `data`  — a server event (`event` is the SSE event name, `data` the payload)
 * - `error` — the stream failed; `error.retryable` says whether to retry
 * - `abort` — the caller's `AbortSignal` fired
 * - `done`  — terminal; always emitted exactly once
 */
export type StreamPart<T = unknown> =
  | { type: "data"; event: string; data: T; id?: string }
  | { type: "error"; error: SdkError }
  | { type: "abort" }
  | { type: "done" };

/** Options accepted by streaming methods. */
export interface StreamOptions {
  /** Abort the stream early; yields `{ type: "abort" }` then `{ type: "done" }`. */
  signal?: AbortSignal;
}

/**
 * Wraps an SSE iterable into {@link StreamPart}s. Transport/HTTP errors thrown
 * by the source become `{ type: "error" }` parts; the stream always ends with
 * `{ type: "done" }`.
 */
export async function* toStreamParts<T = unknown>(
  source: AsyncIterable<SseEvent<T>>,
  options: StreamOptions = {}
): AsyncGenerator<StreamPart<T>> {
  const { signal } = options;
  if (signal?.aborted) {
    yield { type: "abort" };
    yield { type: "done" };
    return;
  }

  const iterator = source[Symbol.asyncIterator]();
  // One listener for the whole stream (not one per event).
  const abort = signal ? abortPromise(signal) : undefined;
  const aborted = abort?.promise;
  try {
    while (true) {
      // Race each read against the abort signal so a hung stream can be cancelled.
      const next = aborted
        ? await Promise.race([iterator.next(), aborted])
        : await iterator.next();

      if (next === ABORTED || signal?.aborted) {
        // Don't await: a generator suspended mid-`await` would never settle.
        void iterator.return?.().catch(() => undefined);
        yield { type: "abort" };
        break;
      }
      if (next.done) break;
      yield {
        type: "data",
        event: next.value.type,
        data: next.value.data,
        id: next.value.id,
      };
    }
  } catch (error) {
    if (signal?.aborted) yield { type: "abort" };
    else yield { type: "error", error: toSdkError(error) };
  } finally {
    // Runs on normal completion, error, and when the consumer breaks early.
    // A no-op on an exhausted iterator; otherwise releases the response body.
    void iterator.return?.().catch(() => undefined);
    abort?.cleanup();
  }
  yield { type: "done" };
}

/**
 * Collect only the `data` payloads of a part stream (drops control parts).
 * Throws the first `error` part so callers who prefer exceptions keep them.
 */
export async function* dataParts<T>(
  parts: AsyncIterable<StreamPart<T>>
): AsyncGenerator<T> {
  for await (const part of parts) {
    if (part.type === "data") yield part.data;
    else if (part.type === "error") throw part.error;
  }
}

const ABORTED: unique symbol = Symbol("aborted");

function abortPromise(signal: AbortSignal): {
  promise: Promise<typeof ABORTED>;
  cleanup: () => void;
} {
  let listener: (() => void) | undefined;
  const promise = new Promise<typeof ABORTED>((resolve) => {
    listener = () => resolve(ABORTED);
    signal.addEventListener("abort", listener, { once: true });
  });
  return {
    promise,
    cleanup: () => {
      if (listener) signal.removeEventListener("abort", listener);
    },
  };
}

/** Normalize anything thrown by a stream into an {@link SdkError}. */
export function toSdkError(error: unknown): SdkError {
  if (isFrontalError(error)) return error;
  if (NetworkError.isInstance(error) || TimeoutError.isInstance(error)) {
    return error as SdkError;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new TimeoutError(error.message);
  }
  return new NetworkError(error);
}

/**
 * Options for {@link simulateStream}.
 */
export interface SimulateStreamOptions {
  /**
   * Frames to emit. Strings are sent verbatim as `data:`; objects are
   * JSON-encoded. Use `{ event, data }` to set the SSE event name.
   */
  chunks: Array<
    string | Record<string, unknown> | { event: string; data: unknown }
  >;
  /** Delay between frames in ms (default 0 — all frames at once). */
  chunkDelayMs?: number;
  /** `"sse"` (default) emits `event:`/`data:` frames; `"ndjson"` one JSON per line. */
  format?: "sse" | "ndjson";
  /** Append an OpenAI-style `data: [DONE]` sentinel (default false). */
  done?: boolean;
  /** HTTP status (default 200). */
  status?: number;
  /** Extra response headers. */
  headers?: Record<string, string>;
}

function isNamedEvent(
  chunk: unknown
): chunk is { event: string; data: unknown } {
  return (
    typeof chunk === "object" &&
    chunk !== null &&
    "event" in chunk &&
    "data" in chunk &&
    typeof (chunk as { event: unknown }).event === "string"
  );
}

function encodeFrame(
  chunk: SimulateStreamOptions["chunks"][number],
  format: "sse" | "ndjson"
): string {
  if (format === "ndjson") {
    return `${typeof chunk === "string" ? chunk : JSON.stringify(isNamedEvent(chunk) ? chunk.data : chunk)}\n`;
  }
  if (typeof chunk === "string") return `data: ${chunk}\n\n`;
  if (isNamedEvent(chunk)) {
    return `event: ${chunk.event}\ndata: ${JSON.stringify(chunk.data)}\n\n`;
  }
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * Builds a streaming `Response` for tests — feed it to a mock `fetch`, a
 * {@link MockRoute} (`stream`), or assert on it directly.
 *
 * @example
 * ```ts
 * const res = simulateStream({
 *   chunks: [{ event: "step", data: { name: "classify" } }, { event: "done", data: {} }],
 *   chunkDelayMs: 5,
 * });
 * ```
 */
export function simulateStream(options: SimulateStreamOptions): Response {
  const {
    chunks,
    chunkDelayMs = 0,
    format = "sse",
    done = false,
    status = 200,
    headers = {},
  } = options;
  const encoder = new TextEncoder();
  const frames = chunks.map((c) => encodeFrame(c, format));
  if (done && format === "sse") frames.push("data: [DONE]\n\n");

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const frame of frames) {
        if (chunkDelayMs > 0) {
          await new Promise((r) => setTimeout(r, chunkDelayMs));
        }
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
    },
  });

  return new Response(body, {
    status,
    headers: {
      "content-type":
        format === "sse" ? "text/event-stream" : "application/x-ndjson",
      "cache-control": "no-cache",
      ...headers,
    },
  });
}

/**
 * Shorthand for `simulateStream({ chunks })`.
 */
export function mockStreamResponse(
  chunks: SimulateStreamOptions["chunks"],
  options: Omit<SimulateStreamOptions, "chunks"> = {}
): Response {
  return simulateStream({ chunks, ...options });
}

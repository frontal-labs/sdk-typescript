import {
  applyUIFrame,
  createUIMessage,
  parseUIMessageStream,
  type UIError,
  type UIMessage,
} from "@frontal-labs/ai";
import { useCallback, useMemo, useRef, useState } from "react";

/** Status of a chat hook. */
export type ChatStatus = "idle" | "submitted" | "streaming" | "error";

/** A transport: given the conversation so far, return a UI-stream Response. */
export type ChatTransport = (
  messages: UIMessage[],
  init: { signal: AbortSignal }
) => Promise<Response>;

/** Options for {@link useChat}. */
export interface UseChatOptions {
  /**
   * Route that returns `toUIMessageStreamResponse(...)`, default
   * `"/api/chat"`. Or pass a function for full control of the transport.
   */
  api?: string | ChatTransport;
  /** Stable conversation id (sent as `id` in the request body). */
  id?: string;
  /** Messages to start with. */
  initialMessages?: UIMessage[];
  /** Extra JSON fields merged into the request body. */
  body?: Record<string, unknown>;
  /** Extra request headers. */
  headers?: Record<string, string>;
  /** Custom fetch (tests, auth wrappers). */
  fetch?: typeof fetch;
  /** Called for every error frame (errors are data — the stream continues). */
  onError?: (error: UIError) => void;
  /** Called when an assistant message finishes streaming. */
  onFinish?: (message: UIMessage) => void;
}

/** Return value of {@link useChat}. */
export interface UseChatResult {
  messages: UIMessage[];
  status: ChatStatus;
  /** The last error frame, if any. */
  error: UIError | undefined;
  /** Send a user message and stream the reply. */
  send: (text: string) => Promise<void>;
  /** Abort the in-flight stream. */
  stop: () => void;
  /** Re-send the last user message (drops the failed assistant reply). */
  retry: () => Promise<void>;
  /** Replace the conversation. */
  setMessages: (messages: UIMessage[]) => void;
}

function toWireMessages(messages: UIMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.text }));
}

/**
 * Chat over a route that calls `ai.streamText` and returns
 * `toUIMessageStreamResponse(...)`. Transport-agnostic: works with any
 * framework that can serve a `Response`.
 *
 * @example
 * ```tsx
 * const { messages, send, status, error, retry } = useChat({ api: "/api/chat" });
 * ```
 */
export function useChat(options: UseChatOptions = {}): UseChatResult {
  const {
    api = "/api/chat",
    id,
    initialMessages = [],
    body,
    headers,
    fetch: fetchImpl,
    onError,
    onFinish,
  } = options;

  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<UIError | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Keep the latest `body`/`headers` in refs so inline object literals don't
  // change the transport (and therefore `send`/`retry`) identity every render.
  const extrasRef = useRef({ body, headers });
  extrasRef.current = { body, headers };

  const transport = useMemo<ChatTransport>(() => {
    if (typeof api === "function") return api;
    return async (msgs, init) =>
      (fetchImpl ?? fetch)(api, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...extrasRef.current.headers,
        },
        body: JSON.stringify({
          id,
          messages: toWireMessages(msgs),
          ...extrasRef.current.body,
        }),
        signal: init.signal,
      });
  }, [api, fetchImpl, id]);

  const run = useCallback(
    async (history: UIMessage[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setError(undefined);
      setStatus("submitted");

      let assistant = createUIMessage("assistant");
      setMessages([...history, assistant]);

      try {
        const response = await transport(history, {
          signal: controller.signal,
        });
        setStatus("streaming");
        for await (const frame of parseUIMessageStream(response, {
          signal: controller.signal,
        })) {
          if (frame.type === "error") {
            setError(frame.error);
            onError?.(frame.error);
          }
          assistant = applyUIFrame(assistant, frame);
          const snapshot = assistant;
          setMessages([...history, snapshot]);
        }
      } catch (err) {
        const e: UIError = {
          code: "TRANSPORT_ERROR",
          message: err instanceof Error ? err.message : String(err),
          retryable: true,
        };
        setError(e);
        onError?.(e);
        assistant = applyUIFrame(assistant, { type: "error", error: e });
        setMessages([...history, assistant]);
      } finally {
        if (abortRef.current === controller) abortRef.current = undefined;
      }

      setStatus(
        assistant.parts.some((p) => p.type === "error") ? "error" : "idle"
      );
      onFinish?.(assistant);
    },
    [onError, onFinish, transport]
  );

  const send = useCallback(
    async (text: string) => {
      const history = [...messagesRef.current, createUIMessage("user", text)];
      await run(history);
    },
    [run]
  );

  const retry = useCallback(async () => {
    const current = messagesRef.current;
    const lastUser = [...current].reverse().findIndex((m) => m.role === "user");
    if (lastUser === -1) return;
    const cut = current.length - lastUser;
    await run(current.slice(0, cut));
  }, [run]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = undefined;
  }, []);

  return { messages, status, error, send, stop, retry, setMessages };
}

import type {
  AgentAccessor,
  AgentRunEvent,
  Execution,
} from "@frontal-labs/agents";
import type { SdkError } from "@frontal-labs/core";
import { useCallback, useRef, useState } from "react";
import type { z } from "zod";

/** Status of an agent run hook. */
export type AgentRunStatus =
  | "idle"
  | "starting"
  | "streaming"
  | "completed"
  | "error";

/** Options for {@link useAgentRun}. */
export interface UseAgentRunOptions {
  /** Called for every error part. */
  onError?: (error: SdkError) => void;
}

/** Return value of {@link useAgentRun}. */
export interface UseAgentRunResult<TState> {
  /** The run started by `trigger`, if any. */
  run: Execution | undefined;
  /** Every stream part received, in order. */
  events: AgentRunEvent<TState>[];
  /** Latest typed state (only when the accessor has a `stateSchema`). */
  state: TState | undefined;
  status: AgentRunStatus;
  error: SdkError | undefined;
  /** Start a run with an event + payload, then stream it. */
  trigger: (
    event: string,
    payload?: Record<string, unknown>
  ) => Promise<Execution | undefined>;
  /** Attach to an existing run id and stream it. */
  watch: (runId: string) => Promise<void>;
  /** Abort the stream. */
  stop: () => void;
}

/**
 * Trigger and observe an agent run. Not a chat — agents are event-driven
 * (`message(event, payload)`); for chat UIs use `useChat` over `ai.streamText`.
 *
 * @example
 * ```tsx
 * const agent = f.agents.use("agt_1", { stateSchema });
 * const { trigger, events, state, status } = useAgentRun(agent);
 * ```
 */
export function useAgentRun<TState extends z.ZodType = z.ZodType>(
  agent: AgentAccessor<TState>,
  options: UseAgentRunOptions = {}
): UseAgentRunResult<z.infer<TState>> {
  type S = z.infer<TState>;
  const [run, setRun] = useState<Execution | undefined>(undefined);
  const [events, setEvents] = useState<AgentRunEvent<S>[]>([]);
  const [state, setState] = useState<S | undefined>(undefined);
  const [status, setStatus] = useState<AgentRunStatus>("idle");
  const [error, setError] = useState<SdkError | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const watch = useCallback(
    async (runId: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setEvents([]);
      setError(undefined);
      setStatus("streaming");
      let failed = false;
      for await (const part of agent.watch(runId, {
        signal: controller.signal,
      })) {
        setEvents((prev) => [...prev, part]);
        if (part.type === "state") setState(part.state);
        if (part.type === "error") {
          failed = true;
          setError(part.error);
          options.onError?.(part.error);
        }
      }
      if (abortRef.current === controller) abortRef.current = undefined;
      setStatus(failed ? "error" : "completed");
    },
    [agent, options.onError]
  );

  const trigger = useCallback(
    async (event: string, payload: Record<string, unknown> = {}) => {
      setStatus("starting");
      setError(undefined);
      try {
        const started = await agent.message(event, payload);
        setRun(started);
        await watch(started.id);
        return started;
      } catch (err) {
        const e = err as SdkError;
        setError(e);
        options.onError?.(e);
        setStatus("error");
        return undefined;
      }
    },
    [agent, options.onError, watch]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = undefined;
  }, []);

  return { run, events, state, status, error, trigger, watch, stop };
}

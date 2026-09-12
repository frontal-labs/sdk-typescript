import type { MockRoute, RequestLog } from "./index";
import { simulateStream } from "./stream";

/** What the mocked model should answer for one `generateText` call. */
export interface MockGenerateResult {
  text?: string;
  finishReason?: "stop" | "length" | "tool_calls" | "content_filter";
  toolCalls?: Array<{ id?: string; toolName: string; input: unknown }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** A captured chat request, camelCased like the SDK sends it. */
export interface MockModelCall {
  model: string;
  messages: Array<{ role: string; content?: string | null }>;
  tools?: Array<{ function: { name: string } }>;
  stream?: boolean;
  raw: Record<string, unknown>;
}

/** Options for {@link mockLanguageModel}. */
export interface MockLanguageModelOptions {
  /** Answer for non-streaming calls. Receives the captured request. */
  doGenerate?: (
    call: MockModelCall
  ) => MockGenerateResult | Promise<MockGenerateResult>;
  /**
   * Answer for streaming calls: text deltas (strings) and/or tool calls.
   * Defaults to streaming `doGenerate().text` in 1-word chunks.
   */
  doStream?: (
    call: MockModelCall
  ) =>
    | Array<
        string | { toolCall: { id?: string; toolName: string; input: unknown } }
      >
    | Promise<
        Array<
          | string
          | { toolCall: { id?: string; toolName: string; input: unknown } }
        >
      >;
  /** Delay between streamed frames (ms). */
  chunkDelayMs?: number;
  /** Model id echoed in responses (default: the requested model). */
  modelId?: string;
}

/**
 * A model-level mock for `@frontal-labs/ai`: returns fetch routes that
 * synthesize OpenAI-compatible responses, so the *real* `AISdk` parsing runs
 * against scripted model output.
 */
export interface MockLanguageModel {
  /** Routes to pass to `createTestClient` / `createMockFetch`. */
  routes: MockRoute[];
  /** Every chat request the model received, in order. */
  calls: MockModelCall[];
}

function toCall(req: RequestLog): MockModelCall {
  const raw = (req.body ?? {}) as Record<string, unknown>;
  return {
    model: String(raw.model ?? ""),
    messages: (raw.messages as MockModelCall["messages"]) ?? [],
    tools: raw.tools as MockModelCall["tools"],
    stream: Boolean(raw.stream),
    raw,
  };
}

function toolCallsWire(
  calls: MockGenerateResult["toolCalls"] | undefined
): Record<string, unknown>[] | undefined {
  if (!calls?.length) return undefined;
  return calls.map((c, i) => ({
    id: c.id ?? `call_${i + 1}`,
    type: "function",
    function: { name: c.toolName, arguments: JSON.stringify(c.input ?? {}) },
  }));
}

/**
 * Create a scripted language model. Mirrors the idea of Vercel's
 * `MockLanguageModel`, but at the transport layer so no SDK code is bypassed.
 *
 * @example
 * ```ts
 * const model = mockLanguageModel({ doGenerate: () => ({ text: "Hello" }) });
 * const { client } = createTestClient(model.routes);
 * const f = new Frontal(client);
 * const { text } = await f.ai.generateText({ model: "any", prompt: "hi" });
 * expect(text).toBe("Hello");
 * expect(model.calls[0]?.messages[0]?.content).toBe("hi");
 * ```
 */
export function mockLanguageModel(
  options: MockLanguageModelOptions = {}
): MockLanguageModel {
  const calls: MockModelCall[] = [];
  const { chunkDelayMs = 0 } = options;

  const doGenerate: NonNullable<MockLanguageModelOptions["doGenerate"]> =
    options.doGenerate ?? (() => ({ text: "" }));
  const doStream =
    options.doStream ??
    (async (call: MockModelCall) => {
      const gen = await doGenerate(call);
      const words = (gen.text ?? "").split(/(?<=\s)/);
      const toolParts = (gen.toolCalls ?? []).map((toolCall) => ({ toolCall }));
      return [...words.filter(Boolean), ...toolParts];
    });

  const route: MockRoute = {
    method: "POST",
    path: "/ai/chat/completions",
    async handler(req) {
      const call = toCall(req);
      calls.push(call);
      const modelId = options.modelId ?? call.model;

      if (!call.stream) {
        const gen = await doGenerate(call);
        const toolCalls = toolCallsWire(gen.toolCalls);
        const body = {
          id: `cmpl_mock_${calls.length}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: modelId,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: gen.text ?? (toolCalls ? null : ""),
                tool_calls: toolCalls,
              },
              finish_reason:
                gen.finishReason ?? (toolCalls ? "tool_calls" : "stop"),
            },
          ],
          usage: gen.usage
            ? {
                prompt_tokens: gen.usage.promptTokens,
                completion_tokens: gen.usage.completionTokens,
                total_tokens: gen.usage.totalTokens,
              }
            : undefined,
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      const parts = await doStream(call);
      const chunk = (
        delta: Record<string, unknown>,
        finish: string | null = null
      ) => ({
        id: `cmpl_mock_${calls.length}`,
        object: "chat.completion.chunk",
        created: 0,
        model: modelId,
        choices: [{ index: 0, delta, finish_reason: finish }],
      });
      const frames: Record<string, unknown>[] = [];
      let toolIndex = 0;
      let sawTool = false;
      for (const part of parts) {
        if (typeof part === "string") {
          frames.push(chunk({ role: "assistant", content: part }));
        } else {
          sawTool = true;
          frames.push(
            chunk({
              tool_calls: [
                {
                  index: toolIndex++,
                  id: part.toolCall.id ?? `call_${toolIndex}`,
                  type: "function",
                  function: {
                    name: part.toolCall.toolName,
                    arguments: JSON.stringify(part.toolCall.input ?? {}),
                  },
                },
              ],
            })
          );
        }
      }
      frames.push(chunk({}, sawTool ? "tool_calls" : "stop"));
      return simulateStream({ chunks: frames, chunkDelayMs, done: true });
    },
  };

  return { routes: [route], calls };
}

import { z } from "zod";
import { type RawValue, raw } from "./transform";

/**
 * A tool the model may call. Shared by `@frontal-labs/ai` (chat tools) and
 * `@frontal-labs/agents` (agent tools) so one definition works in both.
 *
 * @example
 * ```ts
 * const classify = tool({
 *   description: "Classify a support ticket",
 *   inputSchema: z.object({ text: z.string() }),
 *   execute: async ({ text }) => ({ tier: text.includes("enterprise") ? "enterprise" : "free" }),
 * });
 * ```
 */
export interface ToolDefinition<
  TInput extends z.ZodType = z.ZodType,
  TOutput = unknown,
> {
  /** What the tool does; shown to the model. */
  description: string;
  /** Zod schema for the tool's input; converted to JSON Schema on the wire. */
  inputSchema: TInput;
  /**
   * Optional local implementation. The SDK does not auto-execute tools
   * today; callers run `execute` on `tool-call` parts / `toolCalls`.
   */
  execute?: (input: z.infer<TInput>) => Promise<TOutput> | TOutput;
}

/** A named set of tools, keyed by the name the model will use. */
export type ToolSet = Record<string, ToolDefinition>;

/** Identity helper that preserves input/output inference. */
export function tool<TInput extends z.ZodType, TOutput = unknown>(
  definition: ToolDefinition<TInput, TOutput>
): ToolDefinition<TInput, TOutput> {
  return definition;
}

/** OpenAI-compatible wire format for a tool. */
export interface ChatToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    /** JSON Schema, wrapped so the wire transform leaves its keys alone. */
    parameters: RawValue<Record<string, unknown>>;
  };
}

/** A tool call returned by the model. */
export interface ToolCall<TInput = unknown> {
  id?: string;
  toolName: string;
  input: TInput;
}

/** Converts a {@link ToolSet} into the wire format sent with chat requests. */
export function toolSetToRequest(tools: ToolSet): ChatToolSpec[] {
  return Object.entries(tools).map(([name, def]) => {
    const schema = z.toJSONSchema(def.inputSchema) as Record<string, unknown>;
    // The gateway does not need the meta-schema pointer.
    const { $schema: _omit, ...parameters } = schema;
    return {
      type: "function",
      function: {
        name,
        description: def.description,
        parameters: raw(parameters),
      },
    };
  });
}

/**
 * Validates a raw tool call against the matching tool's `inputSchema`.
 * Returns the parsed input, or throws the `ZodError`.
 */
export function parseToolInput<
  TTools extends ToolSet,
  K extends keyof TTools & string,
>(
  tools: TTools,
  toolName: K,
  rawInput: unknown
): z.infer<TTools[K]["inputSchema"]> {
  const def = tools[toolName];
  if (!def) throw new Error(`Unknown tool: ${toolName}`);
  return def.inputSchema.parse(rawInput) as z.infer<TTools[K]["inputSchema"]>;
}

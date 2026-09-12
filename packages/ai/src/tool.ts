/**
 * Tool helpers for `ai.generateText` / `ai.streamText`. The types live in
 * `@frontal-labs/core` so agents and AI share one `ToolSet`.
 *
 * @example
 * ```ts
 * import { tool } from "@frontal-labs/ai";
 * import { z } from "zod";
 *
 * const tools = {
 *   classify: tool({
 *     description: "Classify a ticket",
 *     inputSchema: z.object({ text: z.string() }),
 *   }),
 * };
 * const { toolCalls } = await ai.generateText({ model, prompt, tools });
 * ```
 */
export {
  type ChatToolSpec,
  parseToolInput,
  type ToolCall,
  type ToolDefinition,
  type ToolSet,
  tool,
  toolSetToRequest,
} from "@frontal-labs/core";

import type { ToolSet } from "@frontal-labs/core";

/** How the model should pick tools. Mirrors the OpenAI `tool_choice` field. */
export type ToolChoice<TTools extends ToolSet = ToolSet> =
  | "auto"
  | "none"
  | "required"
  | { toolName: keyof TTools & string };

/** Wire form of {@link ToolChoice}. */
export function toolChoiceToRequest(
  choice: ToolChoice | undefined
): string | { type: string; function: { name: string } } | undefined {
  if (!choice) return undefined;
  if (typeof choice === "string") return choice;
  return { type: "function", function: { name: choice.toolName } };
}

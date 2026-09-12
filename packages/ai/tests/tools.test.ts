import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { AISdk } from "../src/sdk";
import { parseToolInput, tool, toolSetToRequest } from "../src/tool";

const tools = {
  classify: tool({
    description: "Classify a ticket",
    inputSchema: z.object({ text: z.string(), urgent: z.boolean().optional() }),
    execute: async ({ text }) => ({
      tier: text.includes("ent") ? "enterprise" : "free",
    }),
  }),
  route: tool({
    description: "Route to a queue",
    inputSchema: z.object({ queue: z.string() }),
  }),
};

describe("tool()", () => {
  it("infers input type for execute", async () => {
    const out = await tools.classify.execute?.({ text: "ent" });
    expect(out).toEqual({ tier: "enterprise" });
    expectTypeOf(tools.classify.execute).parameter(0).toEqualTypeOf<{
      text: string;
      urgent?: boolean | undefined;
    }>();
  });

  it("serializes a ToolSet to OpenAI-compatible JSON Schema", () => {
    const spec = toolSetToRequest(tools).map((t) => ({
      ...t,
      function: { ...t.function, parameters: t.function.parameters.value },
    }));
    expect(spec).toEqual([
      {
        type: "function",
        function: {
          name: "classify",
          description: "Classify a ticket",
          parameters: {
            type: "object",
            properties: {
              text: { type: "string" },
              urgent: { type: "boolean" },
            },
            required: ["text"],
            additionalProperties: false,
          },
        },
      },
      expect.objectContaining({
        function: expect.objectContaining({ name: "route" }),
      }),
    ]);
  });

  it("parseToolInput validates against the named tool", () => {
    expect(parseToolInput(tools, "route", { queue: "vip" })).toEqual({
      queue: "vip",
    });
    expect(() => parseToolInput(tools, "route", { queue: 1 })).toThrow();
  });
});

describe("generateText with tools", () => {
  it("sends tools/tool_choice and parses tool_calls", async () => {
    const { http, mock } = createTestHttpClient([
      {
        method: "POST",
        path: "/ai/chat/completions",
        body: {
          id: "c",
          object: "chat.completion",
          created: 0,
          model: "m",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: { name: "classify", arguments: '{"text":"hi"}' },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
        },
      },
    ]);
    const ai = new AISdk(http);
    const result = await ai.generateText({
      model: "m",
      prompt: "classify this",
      tools,
      toolChoice: { toolName: "classify" },
    });

    expect(result.finishReason).toBe("tool-calls");
    expect(result.toolCalls).toEqual([
      { id: "call_1", toolName: "classify", input: { text: "hi" } },
    ]);

    const req = mock.expectCalled("POST", "/ai/chat/completions");
    // The mock re-camelizes the captured (snake_case) body.
    const body = req.body as {
      tools: Array<{ function: { name: string } }>;
      toolChoice: unknown;
    };
    expect(body.tools.map((t) => t.function.name)).toEqual([
      "classify",
      "route",
    ]);
    expect(body.toolChoice).toEqual({
      type: "function",
      function: { name: "classify" },
    });

    // Callers execute tools themselves (no auto loop yet).
    const call = result.toolCalls[0];
    if (!call) throw new Error("expected a tool call");
    const input = parseToolInput(tools, "classify", call.input);
    expect(await tools.classify.execute?.(input)).toEqual({ tier: "free" });
  });

  it("returns an empty toolCalls array when none", async () => {
    const { http } = createTestHttpClient([
      {
        method: "POST",
        path: "/ai/chat/completions",
        body: {
          id: "c",
          object: "chat.completion",
          created: 0,
          model: "m",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "hi" },
              finish_reason: "stop",
            },
          ],
        },
      },
    ]);
    const result = await new AISdk(http).generateText({
      model: "m",
      prompt: "x",
    });
    expect(result.toolCalls).toEqual([]);
    expect(result.text).toBe("hi");
  });
});

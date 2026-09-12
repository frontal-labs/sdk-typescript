import { createTestClient, mockLanguageModel } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AISdk } from "../src/sdk";
import { tool } from "../src/tool";

function sdkWithModel(...args: Parameters<typeof mockLanguageModel>) {
  const model = mockLanguageModel(...args);
  const ai = new AISdk(createTestClient(model.routes).client.httpClient);
  return { ai, model };
}

const weather = tool({
  description: "weather",
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, tempC: 21 }),
});

describe("generateText({ maxSteps })", () => {
  it("runs tools, feeds results back, and returns the final answer", async () => {
    const { ai, model } = sdkWithModel({
      doGenerate: (call) => {
        const last = call.messages.at(-1);
        if (last?.role === "tool")
          return {
            text: `It is ${JSON.parse(String(last.content)).tempC}C`,
            usage: { promptTokens: 2, completionTokens: 2, totalTokens: 4 },
          };
        return {
          toolCalls: [
            { id: "c1", toolName: "weather", input: { city: "Lisbon" } },
          ],
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        };
      },
    });
    const steps: number[] = [];
    const result = await ai.generateText({
      model: "m",
      prompt: "weather in Lisbon?",
      tools: { weather },
      maxSteps: 3,
      onStepFinish: (s) => steps.push(s.step),
    });
    expect(result.text).toBe("It is 21C");
    expect(result.finishReason).toBe("stop");
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.toolResults[0]).toMatchObject({
      toolName: "weather",
      output: { city: "Lisbon", tempC: 21 },
    });
    expect(result.usage.totalTokens).toBe(6);
    expect(steps).toEqual([1, 2]);
    // Second request carried the assistant tool call + the tool result.
    const roles = model.calls[1]?.messages.map((m) => m.role);
    expect(roles).toEqual(["user", "assistant", "tool"]);
  });

  it("stops at maxSteps and leaves the last calls to the caller", async () => {
    const { ai, model } = sdkWithModel({
      doGenerate: () => ({
        toolCalls: [{ toolName: "weather", input: { city: "x" } }],
      }),
    });
    const result = await ai.generateText({
      model: "m",
      prompt: "p",
      tools: { weather },
      maxSteps: 2,
    });
    expect(model.calls).toHaveLength(2);
    expect(result.finishReason).toBe("tool-calls");
    expect(result.steps).toHaveLength(2);
  });

  it("does not loop for tools without execute", async () => {
    const { ai, model } = sdkWithModel({
      doGenerate: () => ({ toolCalls: [{ toolName: "manual", input: {} }] }),
    });
    const result = await ai.generateText({
      model: "m",
      prompt: "p",
      tools: { manual: tool({ description: "d", inputSchema: z.object({}) }) },
      maxSteps: 5,
    });
    expect(model.calls).toHaveLength(1);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolResults).toEqual([]);
  });

  it("reports tool errors and invalid input to the model instead of throwing", async () => {
    const { ai, model } = sdkWithModel({
      doGenerate: (call) =>
        call.messages.at(-1)?.role === "tool"
          ? { text: "sorry" }
          : {
              toolCalls: [
                { id: "a", toolName: "weather", input: { city: 5 } },
                { id: "b", toolName: "boom", input: {} },
              ],
            },
    });
    const boom = tool({
      description: "b",
      inputSchema: z.object({}),
      execute: async () => {
        throw new Error("kaboom");
      },
    });
    const result = await ai.generateText({
      model: "m",
      prompt: "p",
      tools: { weather, boom },
      maxSteps: 2,
    });
    expect(result.text).toBe("sorry");
    const firstStep = result.steps[0];
    expect(firstStep?.toolResults.map((r) => Boolean(r.error))).toEqual([
      true,
      true,
    ]);
    const toolMsgs = model.calls[1]?.messages.filter((m) => m.role === "tool");
    expect(toolMsgs?.map((m) => String(m.content))).toEqual(
      expect.arrayContaining([expect.stringContaining("error")])
    );
  });
});

import { FrontalClient } from "@frontal-labs/core";
import { describe, expect, it, vi } from "vitest";
import { createAIClient } from "../src/client";
import { DEFAULT_AI_BASE_URL } from "../src/constants";

const API_KEY = "frt_test-api-key-1234567890";

const chatBody = {
  id: "cmpl-1",
  object: "chat.completion",
  created: 0,
  model: "gpt-4o-mini",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "hi" },
      finishReason: "stop",
    },
  ],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("createAIClient base URL", () => {
  it("targets the AI gateway for a FrontalClient, not the public API", async () => {
    const fetchMock = vi.fn(async (_input: unknown, _init?: unknown) =>
      jsonResponse(chatBody)
    );
    const client = new FrontalClient({
      apiKey: API_KEY,
      baseUrl: "https://api.frontal.dev/v1",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const ai = createAIClient(client);
    await ai.generateText({ model: "gpt-4o-mini", prompt: "hi" });

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toBe(`${DEFAULT_AI_BASE_URL}/ai/chat/completions`);
  });
});

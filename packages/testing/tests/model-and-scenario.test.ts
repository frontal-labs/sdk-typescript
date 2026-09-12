import { AgentsSdk } from "@frontal-labs/agents";
import { AISdk, tool } from "@frontal-labs/ai";
import { RateLimitError } from "@frontal-labs/core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createMockFetch,
  createScenario,
  createTestClient,
  MockFrontal,
  matchPath,
  mockLanguageModel,
  simulateStream,
} from "../src";

async function readAll<T>(stream: ReadableStream<T>): Promise<T[]> {
  const out: T[] = [];
  const r = stream.getReader();
  while (true) {
    const { done, value } = await r.read();
    if (done) return out;
    out.push(value);
  }
}

describe("matchPath", () => {
  it("supports {param} and :param wildcards", () => {
    expect(matchPath("/agents/{param}/runs", "/v1/agents/agt_1/runs")).toBe(
      true
    );
    expect(matchPath("/agents/:id", "/v1/agents/agt_1")).toBe(true);
    expect(matchPath("/agents/{param}", "/v1/agents/agt_1/runs")).toBe(false);
    expect(matchPath("/agents", "/v1/agents")).toBe(true);
  });
});

describe("simulateStream", () => {
  it("emits SSE frames with event names and an optional [DONE]", async () => {
    const res = simulateStream({
      chunks: [{ event: "step", data: { n: 1 } }, { a: 1 }, "raw"],
      done: true,
    });
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(await res.text()).toBe(
      'event: step\ndata: {"n":1}\n\ndata: {"a":1}\n\ndata: raw\n\ndata: [DONE]\n\n'
    );
  });

  it("is usable as a MockRoute.stream and drives agents.watch", async () => {
    const { client } = createTestClient([
      {
        method: "GET",
        path: "/agents/runs/{param}/stream",
        stream: {
          chunks: [
            { event: "state", data: { tier: "enterprise" } },
            { event: "completed", data: {} },
          ],
          chunkDelayMs: 1,
        },
      },
    ]);
    const agents = new AgentsSdk(client.httpClient);
    const parts = [];
    for await (const p of agents
      .use("agt_1", { stateSchema: z.object({ tier: z.string() }) })
      .watch("run_1")) {
      parts.push(p);
    }
    expect(parts.map((p) => p.type)).toEqual(["state", "event", "done"]);
  });
});

describe("mockLanguageModel", () => {
  it("scripts generateText through the real AISdk", async () => {
    const model = mockLanguageModel({
      doGenerate: (call) => ({
        text: `echo:${call.messages.at(-1)?.content}`,
        usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      }),
    });
    const { client } = createTestClient(model.routes);
    const ai = new AISdk(client.httpClient);
    const result = await ai.generateText({
      model: "claude-sonnet-5",
      prompt: "hi",
    });
    expect(result.text).toBe("echo:hi");
    expect(result.usage.totalTokens).toBe(3);
    expect(model.calls[0]?.model).toBe("claude-sonnet-5");
  });

  it("returns tool calls the SDK can parse", async () => {
    const model = mockLanguageModel({
      doGenerate: () => ({
        toolCalls: [{ toolName: "classify", input: { text: "x" } }],
      }),
    });
    const { client } = createTestClient(model.routes);
    const ai = new AISdk(client.httpClient);
    const result = await ai.generateText({
      model: "m",
      prompt: "classify",
      tools: {
        classify: tool({
          description: "c",
          inputSchema: z.object({ text: z.string() }),
        }),
      },
    });
    expect(result.finishReason).toBe("tool-calls");
    expect(result.toolCalls).toEqual([
      { id: "call_1", toolName: "classify", input: { text: "x" } },
    ]);
    expect(model.calls[0]?.tools?.[0]?.function.name).toBe("classify");
  });

  it("streams text and tool calls via streamText", async () => {
    const model = mockLanguageModel({
      doStream: () => [
        "Hel",
        "lo",
        { toolCall: { toolName: "route", input: { queue: "vip" } } },
      ],
      chunkDelayMs: 1,
    });
    const { client } = createTestClient(model.routes);
    const ai = new AISdk(client.httpClient);
    const res = ai.streamText({ model: "m", prompt: "hi" });
    const parts = await readAll(res.fullStream);
    expect(parts).toEqual([
      { type: "text", text: "Hel" },
      { type: "text", text: "lo" },
      {
        type: "tool-call",
        id: "call_1",
        toolName: "route",
        input: { queue: "vip" },
      },
      {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      },
      { type: "done" },
    ]);
  });

  it("defaults doStream to word-chunked doGenerate text", async () => {
    const model = mockLanguageModel({
      doGenerate: () => ({ text: "one two three" }),
    });
    const { client } = createTestClient(model.routes);
    const text = await readAll(
      new AISdk(client.httpClient).streamText({ model: "m", prompt: "x" })
        .textStream
    );
    expect(text).toEqual(["one ", "two ", "three"]);
  });
});

describe("createScenario", () => {
  it("answers steps in order and asserts coverage", async () => {
    const s = createScenario("triage", [
      {
        on: "agents.message",
        return: {
          id: "run_1",
          agent_id: "agt_1",
          trigger_event: "t",
          trigger_payload: {},
          status: "running",
          started_at: "2026-01-01T00:00:00Z",
        },
      },
      { on: "agents.run", return: { id: "run_1", status: "running" } },
      { on: "agents.run", return: { id: "run_1", status: "completed" } },
      {
        on: "agents.watch",
        stream: { chunks: [{ event: "completed", data: {} }] },
      },
    ]);
    const agents = new AgentsSdk(s.client.httpClient);
    const agent = agents.use("agt_1");
    const run = await agent.message("t", {});
    expect(run.id).toBe("run_1");

    expect(s.remaining().map((x) => x.on)).toEqual([
      "agents.run",
      "agents.run",
      "agents.watch",
    ]);
    expect(() => s.assertAllHit()).toThrow(/3 step\(s\) not reached/);

    const done = await agent.waitForCompletion("run_1", { interval: 1 });
    expect(done.status).toBe("completed");
    for await (const _ of agent.watch("run_1")) {
      // drain
    }
    s.assertAllHit();
  });

  it("supports explicit METHOD /path steps, statuses, and MockFrontal namespace", async () => {
    const s = MockFrontal.scenario("rate-limited", [
      {
        on: "GET /internal/models",
        status: 429,
        return: { code: "RATE_LIMITED", message: "slow", request_id: "r" },
        headers: { "retry-after": "2" },
      },
      { on: "GET /internal/models", return: { data: [{ id: "m1" }] } },
    ]);
    const ai = new AISdk(s.client.httpClient);
    await expect(ai.listModels()).rejects.toSatisfy((e) =>
      RateLimitError.isInstance(e)
    );
    expect(await ai.listModels()).toEqual(["m1"]);
    s.assertAllHit();
  });

  it("rejects unknown step keys", () => {
    expect(() => createScenario("bad", [{ on: "nope.nothing" }])).toThrow(
      /must be an alias/
    );
  });
});

describe("MockRoute.handler / times", () => {
  it("serves dynamic responses and honours times", async () => {
    const mock = createMockFetch([
      { method: "GET", path: "/x", times: 1, body: { first: true } },
      {
        method: "GET",
        path: "/x",
        handler: (req) => Response.json({ path: req.path }),
      },
    ]);
    expect(await (await mock.fetch("https://api.test/v1/x")).json()).toEqual({
      first: true,
    });
    expect(await (await mock.fetch("https://api.test/v1/x")).json()).toEqual({
      path: "/v1/x",
    });
  });
});

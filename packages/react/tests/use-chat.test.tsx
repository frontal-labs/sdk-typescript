// @vitest-environment jsdom
import { AISdk, toUIMessageStreamResponse } from "@frontal-labs/ai";
import { createTestClient, mockLanguageModel } from "@frontal-labs/testing";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useChat } from "../src/use-chat";

/** A fake /api/chat route backed by the real AISdk + a mocked model. */
function chatRoute(model = mockLanguageModel({ doGenerate: (c) => ({ text: `re: ${c.messages.at(-1)?.content}` }) })) {
  const ai = new AISdk(createTestClient(model.routes).client.httpClient);
  const fetchImpl: typeof fetch = async (_url, init) => {
    const { messages } = JSON.parse(String(init?.body)) as {
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    };
    return toUIMessageStreamResponse(
      ai.streamText({ model: "m", prompt: messages })
    );
  };
  return { fetchImpl, model };
}

describe("useChat", () => {
  it("streams an assistant reply", async () => {
    const { fetchImpl, model } = chatRoute();
    const { result } = renderHook(() => useChat({ fetch: fetchImpl }));

    await act(async () => {
      await result.current.send("hello");
    });

    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(result.current.messages[1]?.text).toBe("re: hello");
    expect(model.calls[0]?.messages).toEqual([{ role: "user", content: "hello" }]);
  });

  it("keeps history and sends it on the next turn", async () => {
    const { fetchImpl, model } = chatRoute();
    const { result } = renderHook(() => useChat({ fetch: fetchImpl }));
    await act(async () => {
      await result.current.send("one");
    });
    await act(async () => {
      await result.current.send("two");
    });
    expect(result.current.messages).toHaveLength(4);
    expect(model.calls[1]?.messages.map((m) => m.content)).toEqual(["one", "re: one", "two"]);
  });

  it("surfaces errors as data and supports retry", async () => {
    let attempt = 0;
    const fetchImpl: typeof fetch = async () => {
      attempt++;
      if (attempt === 1) {
        return new Response(JSON.stringify({ code: "RATE_LIMITED", message: "slow" }), { status: 429 });
      }
      return chatRoute().fetchImpl("/api/chat", { body: JSON.stringify({ messages: [{ role: "user", content: "again" }] }) });
    };
    const errors: string[] = [];
    const { result } = renderHook(() =>
      useChat({ fetch: fetchImpl, onError: (e) => errors.push(e.code) })
    );

    await act(async () => {
      await result.current.send("again");
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.code).toBe("RATE_LIMITED");
    expect(result.current.error?.retryable).toBe(true);
    expect(result.current.messages[1]?.parts[0]).toMatchObject({ type: "error" });
    expect(errors).toEqual(["RATE_LIMITED"]);

    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]?.text).toBe("re: again");
  });

  it("accepts a custom transport function", async () => {
    const { fetchImpl } = chatRoute();
    const { result } = renderHook(() =>
      useChat({ api: (msgs, init) => fetchImpl("/x", { body: JSON.stringify({ messages: msgs.map((m) => ({ role: m.role, content: m.text })) }), signal: init.signal }) })
    );
    await act(async () => {
      await result.current.send("hi");
    });
    expect(result.current.messages[1]?.text).toBe("re: hi");
  });
});

describe("useChat identity", () => {
  it("keeps send/retry stable across renders with inline body/headers", () => {
    const { fetchImpl } = chatRoute();
    const { result, rerender } = renderHook(() =>
      useChat({ fetch: fetchImpl, body: { tenant: "t" }, headers: { "x-a": "1" } })
    );
    const first = result.current.send;
    rerender();
    expect(result.current.send).toBe(first);
  });
});

/**
 * TTFS gate: the canonical quickstart in packages/sdk/README.md must *run*
 * (not just type-check) against a mocked backend with FRONTAL_API_KEY set to
 * a syntactically valid test key.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createMockFetch } from "@frontal-labs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extractExamples } from "../../scripts/extract-examples";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function sse(frames: Array<{ event: string; data: unknown }>): Response {
  const body = frames
    .map((f) => `event: ${f.event}\ndata: ${JSON.stringify(f.data)}\n\n`)
    .join("");
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("sdk README quickstart (runtime)", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.FRONTAL_API_KEY;
  const mock = createMockFetch([
    {
      method: "POST",
      path: "/ai/chat/completions",
      body: {
        id: "cmpl_1",
        object: "chat.completion",
        created: 0,
        model: "claude-sonnet-4-6",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "Payment gateway outage." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 },
      },
    },
    {
      method: "POST",
      path: "/agents/agt_ticket_triager/runs",
      body: {
        id: "run_1",
        agent_id: "agt_ticket_triager",
        trigger_event: "support.ticket.created",
        trigger_payload: { ticket_id: "t_987" },
        status: "running",
        started_at: "2026-01-01T00:00:00Z",
      },
    },
  ]);

  beforeAll(() => {
    process.env.FRONTAL_API_KEY = "frt_test_key";
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes("/agents/runs/run_1/stream")) {
        return sse([
          { event: "step", data: { name: "classify", tier: "enterprise" } },
          { event: "done", data: { status: "completed" } },
        ]);
      }
      return mock.fetch(input, init);
    }) as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    process.env.FRONTAL_API_KEY = originalKey;
  });

  it("runs end-to-end against mocks", async () => {
    // Separate output dir: examples.test.ts wipes `.examples-build` in parallel.
    const examples = extractExamples({ root, out: ".examples-quickstart" });
    const quickstart = examples.find(
      (e) => e.source === "packages/sdk/README.md"
    );
    if (!quickstart) throw new Error("sdk README quickstart not extracted");

    const logs: unknown[][] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args);
    };
    try {
      const mod = (await import(join(root, quickstart.file))) as {
        example: () => Promise<void>;
      };
      await mod.example();
    } finally {
      console.log = originalLog;
    }

    mock.expectCalled("POST", "/ai/chat/completions");
    mock.expectCalled("POST", "/agents/agt_ticket_triager/runs");
    expect(logs).toEqual([
      ["step", { name: "classify", tier: "enterprise" }],
      ["done", { status: "completed" }],
    ]);
  });
});

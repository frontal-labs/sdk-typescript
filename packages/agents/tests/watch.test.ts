import { NotFoundError } from "@frontal-labs/core";
import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { AgentsSdk } from "../src/sdk";

function withFetch(fetchImpl: typeof fetch): AgentsSdk {
  const { http } = createTestHttpClient();
  (http as unknown as { config: { fetch: typeof fetch } }).config.fetch =
    fetchImpl;
  return new AgentsSdk(http);
}

describe("agents.use(id).watch", () => {
  it("yields server events and a final done", async () => {
    const agents = withFetch(
      async () =>
        new Response(
          'event: step\ndata: {"name":"classify"}\n\nevent: completed\ndata: {"status":"completed"}\n\n',
          { status: 200, headers: { "content-type": "text/event-stream" } }
        )
    );
    const parts = [];
    for await (const p of agents.use("agt_1").watch("run_1")) parts.push(p);
    expect(parts).toEqual([
      {
        type: "event",
        event: "step",
        data: { name: "classify" },
        id: undefined,
      },
      {
        type: "event",
        event: "completed",
        data: { status: "completed" },
        id: undefined,
      },
      { type: "done" },
    ]);
  });

  it("yields an error part instead of throwing", async () => {
    const agents = withFetch(
      async () =>
        new Response(
          JSON.stringify({
            code: "NOT_FOUND",
            message: "no run",
            request_id: "r",
          }),
          { status: 404, headers: { "content-type": "application/json" } }
        )
    );
    const parts = [];
    for await (const p of agents.use("agt_1").watch("nope")) parts.push(p);
    expect(parts).toHaveLength(2);
    expect(parts[0]?.type).toBe("error");
    if (parts[0]?.type === "error") {
      expect(NotFoundError.isInstance(parts[0].error)).toBe(true);
      expect(parts[0].error.retryable).toBe(false);
      expect(parts[0].error.fix).toMatch(/resource id/);
    }
    expect(parts[1]).toEqual({ type: "done" });
  });
});

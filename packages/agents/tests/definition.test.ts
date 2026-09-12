import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { toApprovalStep, tool } from "../src";
import { AgentsSdk } from "../src/sdk";

const agentResource = {
  id: "agt_1",
  name: "ticket-triager",
  triggers: [{ event: "support.ticket.created" }],
  version: 1,
  status: "active",
  environment: "test",
  tags: [],
  timeout: "30s",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const stateSchema = z.object({ tier: z.string(), score: z.number() });

describe("agents.define(name, options)", () => {
  it("applies options and posts a valid definition", async () => {
    const { http, mock } = createTestHttpClient([
      { method: "POST", path: "/agents", body: agentResource },
    ]);
    const agents = new AgentsSdk(http);

    const created = await agents
      .define("ticket-triager", {
        description: "Classifies and routes tickets",
        triggers: "support.ticket.created",
        tags: ["support"],
        stateSchema,
        tools: {
          classify: tool({
            description: "Classify",
            inputSchema: z.object({ text: z.string() }),
          }),
        },
        approveWhen: (s) => s.tier === "enterprise",
        approvers: ["ops@acme.test"],
      })
      .create();

    const body = mock.expectCalled("POST", "/agents").body as Record<
      string,
      unknown
    >;
    expect(body.name).toBe("ticket-triager");
    expect(body.description).toBe("Classifies and routes tickets");
    expect(body.triggers).toEqual([{ event: "support.ticket.created" }]);
    expect(body.tags).toEqual(["support"]);
    // Defaults are filled so the strict schema passes.
    expect(body.scope).toBeDefined();
    expect(body.confidence).toBeDefined();
    // Client-side hints are never sent.
    expect(body.stateSchema).toBeUndefined();
    expect(body.tools).toBeUndefined();
    expect(body.approveWhen).toBeUndefined();

    // Resource fields + accessor methods + typed hints.
    expect(created.id).toBe("agt_1");
    expect(created.name).toBe("ticket-triager");
    expect(created.agent.status).toBe("active");
    expect(typeof created.message).toBe("function");
    expect(created.requiresApproval({ tier: "enterprise", score: 0.9 })).toBe(
      true
    );
    expect(created.requiresApproval({ tier: "free", score: 0.9 })).toBe(false);
    expectTypeOf(created.requiresApproval).parameter(0).toEqualTypeOf<{
      tier: string;
      score: number;
    }>();
  });

  it("accepts multiple triggers and trigger objects", async () => {
    const { http, mock } = createTestHttpClient([
      { method: "POST", path: "/agents", body: agentResource },
    ]);
    await new AgentsSdk(http)
      .define("x", {
        triggers: [
          "a.created",
          { event: "b.updated", filter: { status: "open" } },
        ],
      })
      .create();
    const body = mock.expectCalled("POST", "/agents").body as {
      triggers: unknown;
    };
    expect(body.triggers).toEqual([
      { event: "a.created" },
      { event: "b.updated", filter: { status: "open" } },
    ]);
  });

  it("reports missing required fields readably", async () => {
    const { http } = createTestHttpClient();
    await expect(
      new AgentsSdk(http).define("no-triggers").create()
    ).rejects.toThrow(/Invalid agent definition "no-triggers": triggers/);
  });

  it("builder form: .state()/.tools()/.approveWhen() chain", async () => {
    const { http } = createTestHttpClient([
      { method: "POST", path: "/agents", body: agentResource },
    ]);
    const created = await new AgentsSdk(http)
      .define("chain")
      .trigger("x")
      .state(stateSchema)
      .approveWhen((s) => s.score < 0.5)
      .create();
    expect(created.requiresApproval({ tier: "t", score: 0.1 })).toBe(true);
  });

  it("on() throws instead of silently dropping handlers", () => {
    const { http } = createTestHttpClient();
    expect(() =>
      new AgentsSdk(http).define("h").on("x", async () => undefined)
    ).toThrow(/not supported/);
  });
});

describe("typed watch()", () => {
  it("parses `state` events with the schema and passes others through", async () => {
    const { http } = createTestHttpClient();
    (http as unknown as { config: { fetch: typeof fetch } }).config.fetch =
      async () =>
        new Response(
          'event: step\ndata: {"name":"classify"}\n\n' +
            'event: state\ndata: {"tier":"enterprise","score":0.9}\n\n' +
            'event: state\ndata: {"bogus":true}\n\n',
          { status: 200, headers: { "content-type": "text/event-stream" } }
        );
    const agent = new AgentsSdk(http).use("agt_1", { stateSchema });
    const parts = [];
    for await (const p of agent.watch("run_1")) parts.push(p);
    expect(parts).toEqual([
      {
        type: "event",
        event: "step",
        data: { name: "classify" },
        id: undefined,
      },
      {
        type: "state",
        state: { tier: "enterprise", score: 0.9 },
        id: undefined,
      },
      // Fails the schema → surfaced as a raw event, not dropped.
      { type: "event", event: "state", data: { bogus: true }, id: undefined },
      { type: "done" },
    ]);
    const stateEvent = parts.find((p) => p.type === "state");
    if (stateEvent?.type === "state") {
      expectTypeOf(stateEvent.state).toEqualTypeOf<{
        tier: string;
        score: number;
      }>();
    }
  });
});

describe("toApprovalStep", () => {
  it("maps approveWhen/approvers to a workflow approval step", () => {
    const step = toApprovalStep("ticket-triager", {
      approveWhen: () => true,
      approvers: ["ops"],
    });
    expect(step).toEqual({
      id: "ticket-triager-approval",
      type: "approval",
      name: "Review ticket-triager outcome",
      description:
        "Required when `approveWhen` returns true for the run state.",
      config: { approvers: ["ops"] },
    });
  });
});

describe("configure() trigger passthrough", () => {
  it("keeps debounce on trigger objects", async () => {
    const { http, mock } = createTestHttpClient([
      { method: "POST", path: "/agents", body: agentResource },
    ]);
    await new AgentsSdk(http)
      .define("x", { triggers: [{ event: "a", debounce: "5s" }] })
      .create();
    const body = mock.expectCalled("POST", "/agents").body as {
      triggers: unknown;
    };
    expect(body.triggers).toEqual([{ event: "a", debounce: "5s" }]);
  });
});

describe("stateEvent hint", () => {
  it("parses a custom state event name", async () => {
    const { http } = createTestHttpClient();
    (http as unknown as { config: { fetch: typeof fetch } }).config.fetch =
      async () =>
        new Response('event: snapshot\ndata: {"tier":"t","score":1}\n\n', {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });
    const agent = new AgentsSdk(http).use("agt_1", {
      stateSchema,
      stateEvent: "snapshot",
    });
    const parts = [];
    for await (const p of agent.watch("run_1")) parts.push(p);
    expect(parts[0]).toMatchObject({
      type: "state",
      state: { tier: "t", score: 1 },
    });
  });
});

import {
  createTestHttpClient,
  fixtures,
  mockPageResponse,
} from "frontal/testing";
import { describe, expect, it } from "vitest";
import { AgentBuilder, AgentsSdk } from "../src/sdk";

function createService(
  routes: Parameters<typeof createTestHttpClient>[0] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  const service = new AgentsSdk(http);
  return { service, mock };
}

const agent = fixtures.agent;

function noDoublePrefix(mock: { requests: { path: string }[] }): boolean {
  return !mock.requests.some((r) => r.path.includes("/v1/v1/"));
}

describe("AgentsSdk", () => {
  describe("define()", () => {
    it("returns an AgentBuilder", () => {
      const { service } = createService();
      expect(service.define("my-agent")).toBeInstanceOf(AgentBuilder);
    });
  });

  describe("list()", () => {
    it("lists agents from /agents with pagination", async () => {
      const items = [agent(), agent()];
      const { service, mock } = createService([
        { method: "GET", path: "/agents", body: mockPageResponse(items) },
      ]);

      const result = await service.list();

      expect(result.data).toHaveLength(2);
      mock.expectCalled("GET", "/agents");
      expect(noDoublePrefix(mock)).toBe(true);
    });
  });

  describe("create()", () => {
    it("creates an agent at POST /agents", async () => {
      const agt = agent({ name: "order-processor" });
      const { service, mock } = createService([
        { method: "POST", path: "/agents", body: agt },
      ]);

      const result = await service.create({
        name: "order-processor",
        triggers: [{ event: "order.created" }],
      });

      expect(result.name).toBe("order-processor");
      mock.expectCalled("POST", "/agents");
    });
  });

  describe("builder.create()", () => {
    it("posts the built definition to /agents", async () => {
      const agt = agent({ name: "triager" });
      const { service, mock } = createService([
        { method: "POST", path: "/agents", body: agt },
      ]);

      const result = await service
        .define("triager")
        .description("classifies tickets")
        .trigger("support.ticket.created")
        .tags("support")
        .create();

      expect(result.name).toBe("triager");
      mock.expectCalled("POST", "/agents");
    });
  });

  describe("health()", () => {
    it("checks agent service health", async () => {
      const { service } = createService([
        { method: "GET", path: "/agents/health", body: { status: "ok" } },
      ]);
      const result = await service.health();
      expect(result.status).toBe("ok");
    });
  });
});

describe("AgentAccessor", () => {
  it("get() reads /agents/{id}", async () => {
    const agt = agent({ id: "agt_1" });
    const { service, mock } = createService([
      { method: "GET", path: "/agents/agt_1", body: agt },
    ]);
    const result = await service.use("agt_1").get();
    expect(result.id).toBe("agt_1");
    mock.expectCalled("GET", "/agents/agt_1");
    expect(noDoublePrefix(mock)).toBe(true);
  });

  it("update() puts /agents/{id}", async () => {
    const { service, mock } = createService([
      { method: "PUT", path: "/agents/agt_1", body: agent({ id: "agt_1" }) },
    ]);
    await service.use("agt_1").update({ description: "new" });
    mock.expectCalled("PUT", "/agents/agt_1");
  });

  it("delete() deletes /agents/{id}", async () => {
    const { service, mock } = createService([
      { method: "DELETE", path: "/agents/agt_1", status: 204 },
    ]);
    await service.use("agt_1").delete();
    mock.expectCalled("DELETE", "/agents/agt_1");
  });

  it("rollback() posts /agents/{id}/rollback", async () => {
    const { service, mock } = createService([
      {
        method: "POST",
        path: "/agents/agt_1/rollback",
        body: agent({ id: "agt_1" }),
      },
    ]);
    await service.use("agt_1").rollback({ toVersion: 2 });
    mock.expectCalled("POST", "/agents/agt_1/rollback");
  });

  it("runs() lists /agents/{id}/runs", async () => {
    const { service, mock } = createService([
      {
        method: "GET",
        path: "/agents/agt_1/runs",
        body: mockPageResponse([{ id: "run_1", status: "completed" }]),
      },
    ]);
    const result = await service.use("agt_1").runs();
    expect(result.data).toHaveLength(1);
    mock.expectCalled("GET", "/agents/agt_1/runs");
  });

  it("run() reads /agents/runs/{id}", async () => {
    const { service, mock } = createService([
      {
        method: "GET",
        path: "/agents/runs/run_1",
        body: { id: "run_1", status: "completed" },
      },
    ]);
    const result = await service.use("agt_1").run("run_1");
    expect(result.status).toBe("completed");
    mock.expectCalled("GET", "/agents/runs/run_1");
  });

  it("message() starts a run at POST /agents/{id}/runs", async () => {
    const { service, mock } = createService([
      {
        method: "POST",
        path: "/agents/agt_1/runs",
        body: { id: "run_2", status: "running" },
      },
    ]);
    const result = await service
      .use("agt_1")
      .message("support.ticket.created", { ticketId: "t_1" });
    expect(result.id).toBe("run_2");
    mock.expectCalled("POST", "/agents/agt_1/runs");
  });

  it("conversation() reads /agents/runs/{id}/conversation", async () => {
    const { service, mock } = createService([
      {
        method: "GET",
        path: "/agents/runs/run_1/conversation",
        body: { messages: [{ role: "user" }] },
      },
    ]);
    const result = await service.use("agt_1").conversation("run_1");
    expect(result.messages).toHaveLength(1);
    mock.expectCalled("GET", "/agents/runs/run_1/conversation");
  });
});

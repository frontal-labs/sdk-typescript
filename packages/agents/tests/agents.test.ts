import {
	createTestHttpClient,
	fixtures,
	mockPageResponse,
} from "@frontal/testing";
import { describe, expect, it, vi } from "vitest";
import { AgentBuilder, AgentsService } from "../src/service";

function createService(
	routes: Parameters<typeof createTestHttpClient>[0] = [],
) {
	const { http, mock } = createTestHttpClient(routes);
	const service = new AgentsService(http);
	return { service, mock };
}

const agent = fixtures.agent;

describe("AgentsService", () => {
	describe("define()", () => {
		it("returns an AgentBuilder", () => {
			const { service } = createService();
			const builder = service.define("my-agent");
			expect(builder).toBeInstanceOf(AgentBuilder);
		});
	});

	describe("list()", () => {
		it("lists agents with pagination", async () => {
			const items = [agent(), agent()];
			const { service, mock } = createService([
				{ method: "GET", path: "/agents", body: mockPageResponse(items) },
			]);

			const result = await service.list();

			expect(result.data).toHaveLength(2);
			mock.expectCalled("GET", "/agents");
		});

		it("passes filter options", async () => {
			const { service } = createService([
				{ method: "GET", path: "/agents", body: mockPageResponse([]) },
			]);

			await service.list({ status: "active", limit: 5 });
		});
	});

	describe("create()", () => {
		it("creates an agent from definition", async () => {
			const agt = agent({ name: "order-processor" });
			const { service, mock } = createService([
				{ method: "POST", path: "/agents", body: agt },
			]);

			const result = await service.create({
				name: "order-processor",
				triggers: [{ event: "order.created" }],
				scope: {
					read: [],
					write: [],
					actions: [],
					escalate: [],
					invokeAgents: [],
					invokeFunctions: [],
				},
				confidence: {
					autoExecuteAbove: 0.85,
					escalateBelow: 0.6,
					requireReviewBetween: true,
				},
				memory: { type: "working" },
				retry: {
					maxRetries: 3,
					retryDelay: 1000,
					backoff: "exponential",
					retryOn: [429, 500],
				},
			});

			expect(result.name).toBe("order-processor");
			mock.expectCalled("POST", "/agents");
		});
	});
});

describe("AgentBuilder", () => {
	it("builds and creates an agent with fluent API", async () => {
		const agt = agent({ name: "fraud-detector" });
		const { service, mock } = createService([
			{ method: "POST", path: "/agents", body: agt },
		]);

		const result = await service
			.define("fraud-detector")
			.description("Detects fraudulent transactions")
			.trigger("transaction.created")
			.canRead("transaction", "user")
			.canWrite("alert")
			.autoExecuteAbove(0.9)
			.escalateBelow(0.5)
			.memory({ type: "working" })
			.timeout("60s")
			.tags("fraud", "critical")
			.create();

		expect(result.name).toBe("fraud-detector");
		mock.expectCalled("POST", "/agents");
	});

	it("deploys an agent after creation", async () => {
		const agt = agent({ id: "agt_1", name: "test-agent" });
		const { service, mock } = createService([
			{ method: "POST", path: "/agents", body: agt },
			{ method: "POST", path: "/agents/agt_1/deploy", body: {} },
		]);

		await service.define("test-agent").trigger("entity.created").deploy();

		mock.expectCalled("POST", "/agents");
		mock.expectCalled("POST", "/agents/agt_1/deploy");
	});
});

describe("AgentAccessor", () => {
	const agentId = "agt_abc";

	describe("get()", () => {
		it("fetches an agent by id", async () => {
			const agt = agent({ id: agentId });
			const { service, mock } = createService([
				{ method: "GET", path: `/agents/${agentId}`, body: agt },
			]);

			const result = await service.use(agentId).get();

			expect(result.id).toBe(agentId);
			mock.expectCalled("GET", `/agents/${agentId}`);
		});
	});

	describe("update()", () => {
		it("updates an agent", async () => {
			const agt = agent({ id: agentId, name: "updated-agent" });
			const { service, mock } = createService([
				{ method: "PUT", path: `/agents/${agentId}`, body: agt },
			]);

			const result = await service
				.use(agentId)
				.update({ name: "updated-agent" });

			expect(result.name).toBe("updated-agent");
			mock.expectCalled("PUT", `/agents/${agentId}`);
		});
	});

	describe("delete()", () => {
		it("deletes an agent", async () => {
			const { service, mock } = createService([
				{ method: "DELETE", path: `/agents/${agentId}`, status: 204 },
			]);

			await service.use(agentId).delete();

			mock.expectCalled("DELETE", `/agents/${agentId}`);
		});
	});

	describe("deploy()", () => {
		it("deploys an agent to an environment", async () => {
			const body = {
				id: "dep_1",
				agentId,
				environment: "production",
				status: "deploying",
			};
			const { service, mock } = createService([
				{ method: "POST", path: `/agents/${agentId}/deploy`, body },
			]);

			const result = await service.use(agentId).deploy("production");

			expect(result.environment).toBe("production");
			mock.expectCalled("POST", `/agents/${agentId}/deploy`);
		});
	});

	describe("pause()", () => {
		it("pauses an agent", async () => {
			const agt = agent({ id: agentId, status: "paused" });
			const { service, mock } = createService([
				{ method: "POST", path: `/agents/${agentId}/pause`, body: agt },
			]);

			const result = await service
				.use(agentId)
				.pause({ reason: "maintenance" });

			expect(result.status).toBe("paused");
			mock.expectCalledWith("POST", `/agents/${agentId}/pause`, {
				reason: "maintenance",
			});
		});
	});

	describe("resume()", () => {
		it("resumes a paused agent", async () => {
			const agt = agent({ id: agentId, status: "active" });
			const { service, mock } = createService([
				{ method: "POST", path: `/agents/${agentId}/resume`, body: agt },
			]);

			const result = await service.use(agentId).resume();

			expect(result.status).toBe("active");
			mock.expectCalled("POST", `/agents/${agentId}/resume`);
		});
	});

	describe("rollback()", () => {
		it("rolls back to a previous version", async () => {
			const agt = agent({ id: agentId, version: 1 });
			const { service, mock } = createService([
				{ method: "POST", path: `/agents/${agentId}/rollback`, body: agt },
			]);

			const result = await service.use(agentId).rollback({ toVersion: 1 });

			expect(result.version).toBe(1);
			mock.expectCalledWith("POST", `/agents/${agentId}/rollback`, {
				toVersion: 1,
			});
		});
	});

	describe("simulate()", () => {
		it("simulates an event against the agent", async () => {
			const body = {
				executionId: "exec_1",
				actions: [],
				reasoning: "decided to...",
				confidence: 0.85,
			};
			const { service, mock } = createService([
				{ method: "POST", path: `/agents/${agentId}/simulate`, body },
			]);

			const result = await service
				.use(agentId)
				.simulate("order.created", { orderId: "ord_1" });

			expect(result.confidence).toBe(0.85);
			mock.expectCalledWith("POST", `/agents/${agentId}/simulate`, {
				event: "order.created",
				payload: { orderId: "ord_1" },
			});
		});
	});

	describe("executions()", () => {
		it("lists agent executions with pagination", async () => {
			const items = [
				{ id: "exec_1", status: "completed" },
				{ id: "exec_2", status: "running" },
			];
			const { service, mock } = createService([
				{
					method: "GET",
					path: `/agents/${agentId}/executions`,
					body: mockPageResponse(items),
				},
			]);

			const result = await service.use(agentId).executions();

			expect(result.data).toHaveLength(2);
			mock.expectCalled("GET", `/agents/${agentId}/executions`);
		});
	});

	describe("execution()", () => {
		it("fetches a specific execution", async () => {
			const body = {
				id: "exec_1",
				agentId,
				status: "completed",
				startedAt: "2024-01-01",
			};
			const { service, mock } = createService([
				{ method: "GET", path: `/agents/${agentId}/executions/exec_1`, body },
			]);

			const result = await service.use(agentId).execution("exec_1");

			expect(result.id).toBe("exec_1");
			mock.expectCalled("GET", `/agents/${agentId}/executions/exec_1`);
		});
	});

	describe("escalations()", () => {
		it("lists agent escalations with pagination", async () => {
			const items = [{ id: "esc_1", status: "pending", urgency: "high" }];
			const { service, mock } = createService([
				{
					method: "GET",
					path: `/agents/${agentId}/escalations`,
					body: mockPageResponse(items),
				},
			]);

			const result = await service.use(agentId).escalations();

			expect(result.data).toHaveLength(1);
			mock.expectCalled("GET", `/agents/${agentId}/escalations`);
		});
	});

	describe("metrics()", () => {
		it("fetches agent metrics", async () => {
			const body = {
				executionsToday: 42,
				escalationRate: 0.05,
				avgExecutionMs: 150,
				successRate: 0.98,
			};
			const { service, mock } = createService([
				{ method: "GET", path: `/agents/${agentId}/metrics`, body },
			]);

			const result = await service.use(agentId).metrics("30d");

			expect(result.executionsToday).toBe(42);
			expect(result.successRate).toBe(0.98);
			mock.expectCalled("GET", `/agents/${agentId}/metrics`);
		});
	});

	describe("message()", () => {
		it("sends a message to an agent", async () => {
			const body = {
				messageId: "msg_1",
				executionId: "exec_1",
				status: "accepted",
			};
			const { service, mock } = createService([
				{ method: "POST", path: `/agents/${agentId}/message`, body },
			]);

			const result = await service
				.use(agentId)
				.message("user.query", { question: "what is my balance?" });

			expect(result.messageId).toBe("msg_1");
			mock.expectCalledWith("POST", `/agents/${agentId}/message`, {
				event: "user.query",
				payload: { question: "what is my balance?" },
			});
		});
	});

	describe("experiments", () => {
		it("creates an experiment", async () => {
			const body = { id: "exp_1", name: "prompt-test", status: "running" };
			const { service, mock } = createService([
				{ method: "POST", path: `/agents/${agentId}/experiments`, body },
			]);

			const result = await service.use(agentId).experiments.create({
				name: "prompt-test",
				variants: [
					{ name: "control", weight: 0.5 },
					{ name: "treatment", weight: 0.5 },
				],
				metric: "success_rate",
				metricDirection: "higher-is-better",
				duration: "7d",
			});

			expect(result.name).toBe("prompt-test");
			mock.expectCalled("POST", `/agents/${agentId}/experiments`);
		});

		it("concludes an experiment", async () => {
			const body = {
				id: "exp_1",
				name: "prompt-test",
				status: "concluded",
				winnerVariant: "treatment",
			};
			const { service, mock } = createService([
				{
					method: "POST",
					path: `/agents/${agentId}/experiments/exp_1/conclude`,
					body,
				},
			]);

			const result = await service.use(agentId).experiments.conclude("exp_1", {
				winnerVariant: "treatment",
				promoteToProduction: true,
			});

			expect(result.winnerVariant).toBe("treatment");
			mock.expectCalled(
				"POST",
				`/agents/${agentId}/experiments/exp_1/conclude`,
			);
		});
	});

	describe("waitForCompletion()", () => {
		it("polls execution until completed", async () => {
			let callCount = 0;
			const { http } = createTestHttpClient([]);
			const getSpy = vi.spyOn(http, "get").mockImplementation(async () => {
				callCount++;
				return {
					id: "exec_1",
					agentId,
					status: callCount >= 2 ? "completed" : "running",
					triggerEvent: "test",
					triggerPayload: {},
					startedAt: "2024-01-01T00:00:00Z",
				};
			});

			const service = new AgentsService(http);
			const result = await service.use(agentId).waitForCompletion("exec_1", {
				interval: 10,
				timeout: 5000,
			});

			expect(result.status).toBe("completed");
			expect(callCount).toBeGreaterThanOrEqual(2);
			getSpy.mockRestore();
		});
	});
});

describe("EscalationsNamespace", () => {
	describe("list()", () => {
		it("lists all escalations", async () => {
			const items = [{ id: "esc_1", status: "pending" }];
			const { service, mock } = createService([
				{
					method: "GET",
					path: "/agents/escalations",
					body: mockPageResponse(items),
				},
			]);

			const result = await service.escalations.list();

			expect(result.data).toHaveLength(1);
			mock.expectCalled("GET", "/agents/escalations");
		});
	});

	describe("get()", () => {
		it("fetches a specific escalation", async () => {
			const body = { id: "esc_1", status: "pending", urgency: "critical" };
			const { service, mock } = createService([
				{ method: "GET", path: "/agents/escalations/esc_1", body },
			]);

			const result = await service.escalations.get("esc_1");

			expect(result.urgency).toBe("critical");
			mock.expectCalled("GET", "/agents/escalations/esc_1");
		});
	});

	describe("resolve()", () => {
		it("resolves an escalation", async () => {
			const body = { id: "esc_1", status: "resolved" };
			const { service, mock } = createService([
				{ method: "POST", path: "/agents/escalations/esc_1/resolve", body },
			]);

			const result = await service.escalations.resolve("esc_1", {
				decision: "approved",
				reasoning: "Looks correct",
			});

			expect(result.status).toBe("resolved");
			mock.expectCalled("POST", "/agents/escalations/esc_1/resolve");
		});
	});

	describe("delegate()", () => {
		it("delegates an escalation", async () => {
			const body = { id: "esc_1", status: "delegated" };
			const { service, mock } = createService([
				{ method: "POST", path: "/agents/escalations/esc_1/delegate", body },
			]);

			const result = await service.escalations.delegate("esc_1", {
				delegateTo: "team-lead",
				note: "Needs review",
			});

			expect(result.status).toBe("delegated");
			mock.expectCalled("POST", "/agents/escalations/esc_1/delegate");
		});
	});

	describe("override()", () => {
		it("overrides an escalation", async () => {
			const body = { id: "esc_1", status: "overridden" };
			const { service, mock } = createService([
				{ method: "POST", path: "/agents/escalations/esc_1/override", body },
			]);

			const result = await service.escalations.override("esc_1", {
				action: "force_approve",
				reasoning: "Emergency override",
			});

			expect(result.status).toBe("overridden");
			mock.expectCalled("POST", "/agents/escalations/esc_1/override");
		});
	});
});

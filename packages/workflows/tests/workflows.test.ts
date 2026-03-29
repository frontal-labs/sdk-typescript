import { describe, it, expect, vi } from "vitest";
import {
	createTestHttpClient,
	mockPageResponse,
	fixtures,
} from "@frontal/testing";
import { WorkflowsService, WorkflowBuilder } from "../src/service";

function createService(
	routes: Parameters<typeof createTestHttpClient>[0] = [],
) {
	const { http, mock } = createTestHttpClient(routes);
	const service = new WorkflowsService(http);
	return { service, mock };
}

const workflow = fixtures.workflow;

describe("WorkflowsService", () => {
	describe("define()", () => {
		it("returns a WorkflowBuilder", () => {
			const { service } = createService();
			const builder = service.define("onboarding");
			expect(builder).toBeInstanceOf(WorkflowBuilder);
		});
	});

	describe("list()", () => {
		it("lists workflows with pagination", async () => {
			const items = [workflow(), workflow()];
			const { service, mock } = createService([
				{ method: "GET", path: "/workflows", body: mockPageResponse(items) },
			]);

			const result = await service.list();

			expect(result.data).toHaveLength(2);
			mock.expectCalled("GET", "/workflows");
		});
	});

	describe("create()", () => {
		it("creates a workflow from definition", async () => {
			const wf = workflow({ name: "approval-flow" });
			const { service, mock } = createService([
				{ method: "POST", path: "/workflows", body: wf },
			]);

			const result = await service.create({
				name: "approval-flow",
				triggers: [{ type: "manual" }],
				steps: [{ id: "step-1", type: "task", config: {} }],
			});

			expect(result.name).toBe("approval-flow");
			mock.expectCalled("POST", "/workflows");
		});
	});
});

describe("WorkflowBuilder", () => {
	it("builds a workflow with fluent API", async () => {
		const wf = workflow({ name: "onboarding" });
		const { service, mock } = createService([
			{ method: "POST", path: "/workflows", body: wf },
		]);

		await service
			.define("onboarding")
			.description("Employee onboarding workflow")
			.version("1.0.0")
			.manual()
			.task("setup-account", { system: "iam" })
			.approval("manager-approval", ["manager@company.com"])
			.task(
				"provision-access",
				{ system: "iam" },
				{ dependsOn: ["manager-approval"] },
			)
			.notification("welcome", "Welcome aboard!", ["email", "slack"])
			.tags("hr", "onboarding")
			.create();

		mock.expectCalled("POST", "/workflows");
	});

	it("supports schedule trigger", async () => {
		const wf = workflow({ name: "daily-report" });
		const { service, mock } = createService([
			{ method: "POST", path: "/workflows", body: wf },
		]);

		await service
			.define("daily-report")
			.schedule("0 9 * * *")
			.task("generate-report", { type: "daily" })
			.create();

		mock.expectCalled("POST", "/workflows");
	});

	it("supports event trigger", async () => {
		const wf = workflow({ name: "event-handler" });
		const { service, mock } = createService([
			{ method: "POST", path: "/workflows", body: wf },
		]);

		await service
			.define("event-handler")
			.event("order.created")
			.task("process-order", {})
			.create();

		mock.expectCalled("POST", "/workflows");
	});

	it("supports webhook trigger", async () => {
		const wf = workflow({ name: "webhook-handler" });
		const { service, mock } = createService([
			{ method: "POST", path: "/workflows", body: wf },
		]);

		await service
			.define("webhook-handler")
			.webhook("https://hooks.example.com/ingest")
			.task("process", {})
			.create();

		mock.expectCalled("POST", "/workflows");
	});

	it("builds with conditions and parallel steps", async () => {
		const wf = workflow({ name: "complex-flow" });
		const { service, mock } = createService([
			{ method: "POST", path: "/workflows", body: wf },
		]);

		await service
			.define("complex-flow")
			.manual()
			.condition("is-vip", 'customer.tier == "vip"')
			.parallel("parallel-tasks", ["task-a", "task-b"])
			.delay("cool-down", "5m")
			.create();

		mock.expectCalled("POST", "/workflows");
	});

	it("creates and activates in one call", async () => {
		const wf = workflow({ id: "wfl_1", name: "auto-activate" });
		const { service, mock } = createService([
			{ method: "POST", path: "/workflows", body: wf },
			{
				method: "PATCH",
				path: "/workflows/wfl_1",
				body: { ...wf, status: "active" },
			},
		]);

		await service
			.define("auto-activate")
			.manual()
			.task("do-work", {})
			.activate();

		mock.expectCalled("POST", "/workflows");
		mock.expectCalled("PATCH", "/workflows/wfl_1");
	});
});

describe("WorkflowAccessor", () => {
	const workflowId = "wfl_abc";

	describe("get()", () => {
		it("fetches a workflow by id", async () => {
			const wf = workflow({ id: workflowId });
			const { service, mock } = createService([
				{ method: "GET", path: `/workflows/${workflowId}`, body: wf },
			]);

			const result = await service.use(workflowId).get();

			expect(result.id).toBe(workflowId);
			mock.expectCalled("GET", `/workflows/${workflowId}`);
		});
	});

	describe("update()", () => {
		it("updates a workflow", async () => {
			const wf = workflow({ id: workflowId, name: "updated" });
			const { service, mock } = createService([
				{ method: "PUT", path: `/workflows/${workflowId}`, body: wf },
			]);

			await service.use(workflowId).update({ name: "updated" });

			mock.expectCalled("PUT", `/workflows/${workflowId}`);
		});
	});

	describe("delete()", () => {
		it("deletes a workflow", async () => {
			const { service, mock } = createService([
				{ method: "DELETE", path: `/workflows/${workflowId}`, status: 204 },
			]);

			await service.use(workflowId).delete();

			mock.expectCalled("DELETE", `/workflows/${workflowId}`);
		});
	});

	describe("activate()", () => {
		it("activates a workflow", async () => {
			const wf = workflow({ id: workflowId, status: "active" });
			const { service, mock } = createService([
				{ method: "PATCH", path: `/workflows/${workflowId}`, body: wf },
			]);

			const result = await service.use(workflowId).activate();

			expect(result.status).toBe("active");
			mock.expectCalled("PATCH", `/workflows/${workflowId}`);
		});
	});

	describe("pause()", () => {
		it("pauses a workflow", async () => {
			const wf = workflow({ id: workflowId, status: "paused" });
			const { service, mock } = createService([
				{ method: "PATCH", path: `/workflows/${workflowId}`, body: wf },
			]);

			const result = await service.use(workflowId).pause();

			expect(result.status).toBe("paused");
			mock.expectCalled("PATCH", `/workflows/${workflowId}`);
		});
	});

	describe("executions()", () => {
		it("lists workflow executions with pagination", async () => {
			const items = [{ id: "exec_1", status: "completed" }];
			const { service, mock } = createService([
				{
					method: "GET",
					path: `/workflows/${workflowId}/executions`,
					body: mockPageResponse(items),
				},
			]);

			const result = await service.use(workflowId).executions();

			expect(result.data).toHaveLength(1);
			mock.expectCalled("GET", `/workflows/${workflowId}/executions`);
		});
	});

	describe("execution()", () => {
		it("fetches a specific execution", async () => {
			const body = { id: "exec_1", workflowId, status: "completed" };
			const { service, mock } = createService([
				{
					method: "GET",
					path: `/workflows/${workflowId}/executions/exec_1`,
					body,
				},
			]);

			const result = await service.use(workflowId).execution("exec_1");

			expect(result.id).toBe("exec_1");
			mock.expectCalled("GET", `/workflows/${workflowId}/executions/exec_1`);
		});
	});

	describe("trigger()", () => {
		it("triggers a workflow execution", async () => {
			const body = { id: "exec_1", workflowId, status: "running" };
			const { service, mock } = createService([
				{ method: "POST", path: `/workflows/${workflowId}/trigger`, body },
			]);

			const result = await service
				.use(workflowId)
				.trigger({ userId: "user_1" });

			expect(result.status).toBe("running");
			mock.expectCalledWith("POST", `/workflows/${workflowId}/trigger`, {
				userId: "user_1",
			});
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
					workflowId,
					workflowVersion: 1,
					status: callCount >= 2 ? "completed" : "running",
					stepExecutions: [],
					triggeredBy: "test",
					startedAt: "2024-01-01T00:00:00Z",
				};
			});

			const service = new WorkflowsService(http);
			const result = await service.use(workflowId).waitForCompletion("exec_1", {
				interval: 10,
				timeout: 5000,
			});

			expect(result.status).toBe("completed");
			expect(callCount).toBeGreaterThanOrEqual(2);
			getSpy.mockRestore();
		});
	});
});

describe("ApprovalsNamespace", () => {
	describe("list()", () => {
		it("lists pending approvals", async () => {
			const items = [{ id: "apr_1", status: "pending" }];
			const { service, mock } = createService([
				{
					method: "GET",
					path: "/workflows/approvals",
					body: mockPageResponse(items),
				},
			]);

			const result = await service.approvals.list({ status: "pending" });

			expect(result.data).toHaveLength(1);
			mock.expectCalled("GET", "/workflows/approvals");
		});
	});

	describe("approve()", () => {
		it("approves a pending approval", async () => {
			const body = { id: "apr_1", status: "approved" };
			const { service, mock } = createService([
				{ method: "POST", path: "/workflows/approvals/apr_1/approve", body },
			]);

			const result = await service.approvals.approve("apr_1", "Looks good");

			expect(result.status).toBe("approved");
			mock.expectCalled("POST", "/workflows/approvals/apr_1/approve");
		});
	});

	describe("reject()", () => {
		it("rejects an approval", async () => {
			const body = { id: "apr_1", status: "rejected" };
			const { service, mock } = createService([
				{ method: "POST", path: "/workflows/approvals/apr_1/reject", body },
			]);

			const result = await service.approvals.reject("apr_1", "Missing info");

			expect(result.status).toBe("rejected");
			mock.expectCalled("POST", "/workflows/approvals/apr_1/reject");
		});
	});
});

describe("StepsNamespace", () => {
	describe("list()", () => {
		it("lists step definitions", async () => {
			const { service, mock } = createService([
				{
					method: "GET",
					path: "/workflows/steps",
					body: [{ id: "step_1", type: "task" }],
				},
			]);

			const result = await service.steps.list();

			expect(result).toHaveLength(1);
			mock.expectCalled("GET", "/workflows/steps");
		});
	});

	describe("create()", () => {
		it("creates a step definition", async () => {
			const body = { id: "step_1", type: "task", config: {} };
			const { service, mock } = createService([
				{ method: "POST", path: "/workflows/steps", body },
			]);

			const result = await service.steps.create({
				id: "step_1",
				type: "task",
				config: {},
			});

			expect(result.id).toBe("step_1");
			mock.expectCalled("POST", "/workflows/steps");
		});
	});

	describe("delete()", () => {
		it("deletes a step definition", async () => {
			const { service, mock } = createService([
				{ method: "DELETE", path: "/workflows/steps/step_1", status: 204 },
			]);

			await service.steps.delete("step_1");

			mock.expectCalled("DELETE", "/workflows/steps/step_1");
		});
	});
});

describe("TemplatesNamespace", () => {
	describe("list()", () => {
		it("lists workflow templates", async () => {
			const items = [{ id: "tpl_1", name: "Basic Approval" }];
			const { service, mock } = createService([
				{
					method: "GET",
					path: "/workflows/templates",
					body: mockPageResponse(items),
				},
			]);

			const result = await service.templates.list();

			expect(result.data).toHaveLength(1);
			mock.expectCalled("GET", "/workflows/templates");
		});
	});

	describe("use()", () => {
		it("creates a workflow from a template", async () => {
			const wf = workflow({ name: "my-approval" });
			const { service, mock } = createService([
				{ method: "POST", path: "/workflows/templates/tpl_1/use", body: wf },
			]);

			const result = await service.templates.use("tpl_1", "my-approval");

			expect(result.name).toBe("my-approval");
			mock.expectCalledWith("POST", "/workflows/templates/tpl_1/use", {
				name: "my-approval",
			});
		});
	});
});

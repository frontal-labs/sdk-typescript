import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { WorkflowsSdk } from "../src/sdk";

function createService(
  routes: Parameters<typeof createTestHttpClient>[0] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new WorkflowsSdk(http), mock };
}

const createdWorkflow = {
  workflow: {
    workflowId: "wf_1",
    name: "review-flow",
    slug: "review-flow",
    status: "DRAFT",
    latestVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

describe("WorkflowsSdk", () => {
  it("lists workflows from the server collection response", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/workflows",
        body: {
          workflows: [createdWorkflow.workflow],
          nextPageToken: "",
        },
      },
    ]);

    const page = await service.list();

    expect(page.data[0]).toMatchObject({ id: "wf_1", status: "draft" });
    expect(page.pagination.hasMore).toBe(false);
  });

  it("creates the resource, then stores its immutable version spec", async () => {
    const { service, mock } = createService([
      { method: "POST", path: "/workflows", body: createdWorkflow },
      {
        method: "POST",
        path: "/workflows/wf_1/versions",
        body: { version: { versionId: "ver_1" } },
      },
    ]);

    const workflow = await service
      .define("Review Flow")
      .manual()
      .task("check")
      .create();

    expect(workflow).toMatchObject({ id: "wf_1", status: "draft" });
    expect(mock.requests.map(({ method, path }) => [method, path])).toEqual([
      ["POST", "/v1/workflows"],
      ["POST", "/v1/workflows/wf_1/versions"],
    ]);
    expect(mock.requests[1]?.body).toMatchObject({
      spec: { name: "Review Flow", steps: [{ id: "check", type: "task" }] },
    });
  });

  it("publishes the created workflow by its returned ID", async () => {
    const { service, mock } = createService([
      { method: "POST", path: "/workflows", body: createdWorkflow },
      { method: "POST", path: "/workflows/wf_1/versions", body: {} },
      {
        method: "POST",
        path: "/workflows/wf_1/publish",
        body: { workflow: { ...createdWorkflow.workflow, status: "ACTIVE" } },
      },
    ]);

    const workflow = await service
      .define("Review Flow")
      .manual()
      .task("check")
      .activate();

    expect(workflow).toMatchObject({ id: "wf_1", status: "active" });
    expect(mock.requests[2]?.path).toBe("/v1/workflows/wf_1/publish");
  });

  it("addresses a workflow and its executions by ID", async () => {
    const workflowId = "wf/one";
    const { service, mock } = createService([
      {
        method: "GET",
        path: "/workflows/wf%2Fone",
        body: { workflow: { ...createdWorkflow.workflow, workflowId } },
      },
      {
        method: "GET",
        path: "/workflows/executions",
        body: {
          executions: [
            {
              executionId: "ex_1",
              workflowId,
              status: "COMPLETED",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
          nextPageToken: "",
        },
      },
      {
        method: "GET",
        path: "/workflows/executions/ex_1",
        body: {
          execution: {
            executionId: "ex_1",
            workflowId,
            status: "COMPLETED",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        },
      },
      {
        method: "POST",
        path: "/workflows/executions",
        body: {
          execution: {
            executionId: "ex_2",
            workflowId,
            status: "RUNNING",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        },
      },
    ]);
    const accessor = service.use(workflowId);

    expect((await accessor.get()).id).toBe(workflowId);
    expect((await accessor.executions()).data[0]?.id).toBe("ex_1");
    expect((await accessor.execution("ex_1")).status).toBe("completed");
    expect((await accessor.trigger({ source: "test" })).id).toBe("ex_2");
    expect(mock.requests.map(({ method, path }) => [method, path])).toEqual([
      ["GET", "/v1/workflows/wf%2Fone"],
      ["GET", "/v1/workflows/executions"],
      ["GET", "/v1/workflows/executions/ex_1"],
      ["POST", "/v1/workflows/executions"],
    ]);
    expect(mock.requests[3]?.body).toEqual({
      workflowId,
      input: { source: "test" },
    });
  });

  it("uses distinct approval actions and includes the approval ID", async () => {
    const approval = {
      id: "apr_1",
      status: "PENDING",
      executionId: "ex_1",
      stepId: "review",
      signalName: "review",
      title: "Review",
      description: "Review this request",
      requiredApprovers: ["ops"],
      approvedBy: [],
      rejectedBy: null,
      cancelReason: null,
      comment: null,
      expiresAt: null,
      resolvedAt: null,
      createdBy: "system",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const { service, mock } = createService([
      {
        method: "GET",
        path: "/workflows/approvals",
        body: { items: [approval], nextPageToken: "" },
      },
      {
        method: "GET",
        path: "/workflows/approvals/apr_1",
        body: approval,
      },
      {
        method: "POST",
        path: "/workflows/approvals/apr_1/approve",
        body: { ...approval, status: "APPROVED" },
      },
      {
        method: "POST",
        path: "/workflows/approvals/apr_1/reject",
        body: { ...approval, status: "REJECTED" },
      },
    ]);

    expect((await service.approvals.list()).data[0]?.id).toBe("apr_1");
    expect((await service.approvals.get("apr_1")).id).toBe("apr_1");
    expect((await service.approvals.approve("apr_1", "ok")).status).toBe(
      "approved"
    );
    expect((await service.approvals.reject("apr_1", "no")).status).toBe(
      "rejected"
    );
    expect(mock.requests.slice(2).map((request) => request.path)).toEqual([
      "/v1/workflows/approvals/apr_1/approve",
      "/v1/workflows/approvals/apr_1/reject",
    ]);
  });

  it("addresses actual template and task endpoints", async () => {
    const { service, mock } = createService([
      {
        method: "GET",
        path: "/workflows/templates",
        body: {
          templates: [
            {
              templateId: "tpl_1",
              name: "Review",
              definition: {},
              tags: [],
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
          nextPageToken: "",
        },
      },
      {
        method: "GET",
        path: "/workflows/templates/tpl_1",
        body: {
          template: {
            templateId: "tpl_1",
            name: "Review",
            definition: {},
            tags: [],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
      },
      {
        method: "POST",
        path: "/workflows/templates/tpl_1/instantiate",
        body: createdWorkflow,
      },
      {
        method: "GET",
        path: "/workflows/executions/ex_1/tasks",
        body: { tasks: [], nextPageToken: "" },
      },
      {
        method: "GET",
        path: "/workflows/tasks/task_1",
        body: {
          task: {
            taskId: "task_1",
            stepId: "step_1",
            executionId: "ex_1",
            status: "RUNNING",
            type: "task",
            attempt: 1,
            maxAttempts: 3,
            errorMessage: "",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
      },
      {
        method: "GET",
        path: "/workflows/runs/run_1/steps",
        body: { steps: [], nextPageToken: "" },
      },
    ]);

    expect((await service.templates.list()).data[0]?.id).toBe("tpl_1");
    expect((await service.templates.get("tpl_1")).id).toBe("tpl_1");
    expect((await service.templates.use("tpl_1", "Copy")).id).toBe("wf_1");
    expect((await service.steps.listTasks("ex_1")).data).toEqual([]);
    expect((await service.steps.getTask("task_1")).id).toBe("task_1");
    expect((await service.steps.listRunSteps("run_1")).data).toEqual([]);
    expect(mock.requests.map(({ path }) => path)).toEqual([
      "/v1/workflows/templates",
      "/v1/workflows/templates/tpl_1",
      "/v1/workflows/templates/tpl_1/instantiate",
      "/v1/workflows/executions/ex_1/tasks",
      "/v1/workflows/tasks/task_1",
      "/v1/workflows/runs/run_1/steps",
    ]);
  });
});

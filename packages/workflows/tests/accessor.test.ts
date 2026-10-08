import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { WorkflowsSdk } from "../src/sdk";

describe("WorkflowAccessor lifecycle", () => {
  it("uses the workflow ID for update, delete, archive, and restore", async () => {
    const response = (status: string) => ({
      workflow: {
        workflowId: "wf_1",
        name: "review",
        status,
        latestVersion: 1,
      },
    });
    const { http, mock } = createTestHttpClient([
      { method: "PATCH", path: "/workflows/wf_1", body: response("DRAFT") },
      {
        method: "POST",
        path: "/workflows/wf_1/archive",
        body: response("ARCHIVED"),
      },
      {
        method: "POST",
        path: "/workflows/wf_1/restore",
        body: response("DRAFT"),
      },
      { method: "DELETE", path: "/workflows/wf_1", status: 204 },
    ]);
    const workflow = new WorkflowsSdk(http).use("wf_1");

    expect((await workflow.update({ name: "renamed" })).id).toBe("wf_1");
    expect((await workflow.archive()).status).toBe("archived");
    expect((await workflow.restore()).status).toBe("draft");
    await workflow.delete();
    expect(mock.requests.map(({ method, path }) => [method, path])).toEqual([
      ["PATCH", "/v1/workflows/wf_1"],
      ["POST", "/v1/workflows/wf_1/archive"],
      ["POST", "/v1/workflows/wf_1/restore"],
      ["DELETE", "/v1/workflows/wf_1"],
    ]);
  });
});

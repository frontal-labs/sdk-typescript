// @vitest-environment jsdom
import { AgentsSdk } from "@frontal-labs/agents";
import { WorkflowsSdk } from "@frontal-labs/workflows";
import { createScenario } from "@frontal-labs/testing";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { useAgentRun } from "../src/use-agent-run";
import { useWorkflowApprovals } from "../src/use-workflow-run";

const runResource = {
  id: "run_1",
  agent_id: "agt_1",
  trigger_event: "t",
  trigger_payload: {},
  status: "running",
  started_at: "2026-01-01T00:00:00Z",
};

describe("useAgentRun", () => {
  it("triggers a run and streams typed state", async () => {
    const s = createScenario("agent-run", [
      { on: "agents.message", return: runResource },
      {
        on: "agents.watch",
        stream: {
          chunks: [
            { event: "step", data: { name: "classify" } },
            { event: "state", data: { tier: "enterprise" } },
          ],
        },
      },
    ]);
    const agent = new AgentsSdk(s.client.httpClient).use("agt_1", {
      stateSchema: z.object({ tier: z.string() }),
    });
    const { result } = renderHook(() => useAgentRun(agent));

    await act(async () => {
      await result.current.trigger("t", { ticketId: "t_1" });
    });

    await waitFor(() => expect(result.current.status).toBe("completed"));
    expect(result.current.run?.id).toBe("run_1");
    expect(result.current.state).toEqual({ tier: "enterprise" });
    expect(result.current.events.map((e) => e.type)).toEqual(["event", "state", "done"]);
    s.assertAllHit();
  });

  it("reports stream errors without throwing", async () => {
    const s = createScenario("agent-run-404", [
      { on: "agents.message", return: runResource },
      { on: "agents.watch", status: 404, return: { code: "NOT_FOUND", message: "gone" } },
    ]);
    const agent = new AgentsSdk(s.client.httpClient).use("agt_1");
    const { result } = renderHook(() => useAgentRun(agent));
    await act(async () => {
      await result.current.trigger("t");
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.code).toBe("NOT_FOUND");
  });
});

describe("useWorkflowApprovals", () => {
  it("lists and approves", async () => {
    const pending = {
      id: "apr_1",
      workflow_id: "wf_1",
      execution_id: "ex_1",
      step_id: "review",
      status: "pending",
      approvers: ["ops"],
      required_approvals: 1,
      created_at: "2026-01-01T00:00:00Z",
    };
    const s = createScenario("approvals", [
      { on: "workflows.approvals.list", return: { data: [pending], pagination: { cursor: "", has_more: false } } },
      { on: "workflows.approvals.approve", return: { ...pending, status: "approved" } },
    ]);
    const workflows = new WorkflowsSdk(s.client.httpClient);
    const { result } = renderHook(() => useWorkflowApprovals(workflows));

    await waitFor(() => expect(result.current.approvals).toHaveLength(1));
    await act(async () => {
      await result.current.approve("apr_1", "LGTM");
    });
    expect(result.current.approvals).toEqual([]); // no longer pending
    s.assertAllHit();
  });
});

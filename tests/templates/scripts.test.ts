/**
 * Each script template exports `run(f)`; drive them against scenarios so the
 * templates cannot drift from the SDK.
 */
import { Frontal } from "@frontal-labs/sdk";
import { createScenario, createTestClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";

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

describe("templates/agent-approval", () => {
  it("runs end-to-end with an approval", async () => {
    const s = createScenario("agent-approval", [
      { on: "agents.create", return: agentResource },
      { on: "workflows.create", return: { id: "wf_1", name: "triage-review", status: "draft" } },
      { on: "agents.message", return: { id: "run_1", agent_id: "agt_1", trigger_event: "t", trigger_payload: {}, status: "running", started_at: "2026-01-01T00:00:00Z" } },
      { on: "agents.watch", stream: { chunks: [{ event: "state", data: { tier: "enterprise", score: 0.9 } }, { event: "completed", data: {} }] } },
      { on: "workflows.approvals.list", return: { data: [{ id: "apr_1", status: "pending" }], pagination: { cursor: "", has_more: false } } },
      { on: "workflows.approvals.approve", return: { id: "apr_1", status: "approved" } },
    ]);
    const { run } = await import("../../templates/agent-approval/src/index");
    const out = await run(new Frontal(s.client));
    expect(out).toMatchObject({ agentId: "agt_1", workflowId: "wf_1", runId: "run_1", needsHuman: true, approved: ["apr_1"] });
    s.assertAllHit();
  });
});

describe("templates/pipeline-graph", () => {
  it("defines, triggers, queries and traces", async () => {
    const s = createScenario("pipeline-graph", [
      { on: "POST /data/pipelines/pipelines", return: { id: "ppl_1", name: "crm-sync", status: "active" } },
      { on: "POST /data/pipelines/runs", return: { id: "prun_1", pipeline_id: "ppl_1", status: "queued" } },
      { on: "graph.query", return: { data: [{ id: "ent_1", type: "customer", fields: {}, version: 1, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }], pagination: { cursor: "", has_more: false } } },
      { on: "GET /lineage/nodes/{param}/trace", return: { nodes: [{ id: "ent_1" }, { id: "ppl_1" }], edges: [] } },
    ]);
    const { run } = await import("../../templates/pipeline-graph/src/index");
    const out = await run(new Frontal(s.client));
    expect(out).toEqual({ pipelineId: "ppl_1", runId: "prun_1", customers: 1, lineageNodes: 2 });
    s.assertAllHit();
  });
});

describe("templates/cron-export", () => {
  it("schedules, exports and signs", async () => {
    const { client, mock } = createTestClient([
      { method: "POST", path: "/workflows/schedules", body: { id: "sch_1", name: "nightly", cron: "0 2 * * *", status: "active" } },
      { method: "GET", path: /\/artifacts\/latest\/content$/, handler: () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "application/octet-stream" } }) },
      { method: "POST", path: /\/blob\/object\/exports\//, body: {} },
      { method: "POST", path: /\/blob\/object\/sign\//, body: { signedURL: "https://signed.test/x" } },
    ]);
    const { run } = await import("../../templates/cron-export/src/index");
    const out = await run(new Frontal(client));
    expect(out).toMatchObject({ scheduleId: "sch_1", bytes: 3, url: "https://signed.test/x" });
    mock.expectCalled("POST", "/workflows/schedules");
    mock.expectCalled("POST", "/blob/object/exports/");
  });
});

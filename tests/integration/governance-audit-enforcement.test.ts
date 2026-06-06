/**
 * Integration: Evaluate policy (deny) → blocked action logged in audit.
 * Verifies the governance → audit enforcement chain.
 */
import { describe, expect, it } from "vitest";
import {
  createIntegrationHarness,
  integrationPage,
} from "@frontal-labs/testing";
import { GovernanceService } from "@frontal-labs/governance";
import { AuditService } from "@frontal-labs/audit";

const mockPolicy = {
  id: "pol_1", name: "No public data export",
  rules: [{ id: "r1", resource: "datasets.*", actions: ["export"], effect: "deny", conditions: {} }],
  enabled: true, priority: 1,
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
};

const mockEval = {
  policy_id: "pol_1", passed: false,
  rule_results: [{ rule_id: "r1", passed: false, reason: "Denied by policy: No public data export" }],
};

const mockAuditEvent = {
  id: "evt_1",
  actor: { user_id: "usr_1" },
  action: "dataset.export.denied",
  resource: { type: "dataset", id: "ds_1" },
  status: "denied",
  metadata: { policy_id: "pol_1", reason: "Denied by policy" },
  timestamp: "2025-01-01T00:00:00Z",
};

describe("Governance → Audit enforcement", () => {
  it("denied policy evaluation → audit log recorded", async () => {
    const harness = createIntegrationHarness([
      { method: "POST", path: "/v1/governance/policies/pol_1/evaluate", body: mockEval },
      { method: "POST", path: "/v1/audit/events", body: mockAuditEvent },
      { method: "POST", path: "/v1/audit/events/query", body: integrationPage([mockAuditEvent]) },
    ]);

    const { http: govHttp } = harness.createHttp();
    const { http: auditHttp } = harness.createHttp();

    const gov = new GovernanceService(govHttp);
    const audit = new AuditService(auditHttp);

    // Step 1: Evaluate policy — should deny
    const evalResult = await gov.evaluatePolicy("pol_1", {
      userId: "usr_1",
      resource: { type: "dataset", id: "ds_1" },
    });
    expect(evalResult.passed).toBe(false);

    // Step 2: Log the denied action in audit
    const event = await audit.log({
      action: "dataset.export.denied",
      resource: { type: "dataset", id: "ds_1" },
      status: "denied",
      metadata: { policy_id: "pol_1", reason: "Denied by policy" },
    });
    expect(event.status).toBe("denied");
    expect(event.action).toBe("dataset.export.denied");

    // Step 3: Query audit trail confirms the denial
    const results = await audit.query({ action: "dataset.export.denied" });
    expect(results.data.length).toBeGreaterThan(0);
    expect(results.data[0].metadata?.policyId).toBe("pol_1");
  });
});

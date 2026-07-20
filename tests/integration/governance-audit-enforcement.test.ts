/**
 * Integration: validate a deny policy → record the blocked action in the audit log.
 * Verifies the governance → audit chain against the real service contracts.
 */
import { describe, expect, it } from "vitest";
import {
  createIntegrationHarness,
  integrationPage,
} from "frontal/testing";
import { GovernanceService } from "@frontal-labs/governance";
import { AuditService } from "@frontal-labs/audit";

const mockValidation = {
  valid: true,
  errors: [],
};

const mockAuditEvent = {
  id: "evt_1",
  actor_id: "usr_1",
  action: "dataset.export.denied",
  resource_type: "dataset",
  resource_id: "ds_1",
  outcome: "denied",
  metadata: { policy_id: "pol_1", reason: "Denied by policy" },
  timestamp: "2025-01-01T00:00:00Z",
};

describe("Governance → Audit enforcement", () => {
  it("validate policy → record + query audit event", async () => {
    const harness = createIntegrationHarness([
      { method: "POST", path: "/v1/policies/validate", body: mockValidation },
      { method: "POST", path: "/v1/audit/events", body: mockAuditEvent },
      {
        method: "GET",
        path: "/v1/audit/events",
        body: integrationPage([mockAuditEvent]),
      },
    ]);

    const { http: govHttp } = harness.createHttp();
    const { http: auditHttp } = harness.createHttp();

    const gov = new GovernanceService(govHttp);
    const audit = new AuditService(auditHttp);

    // Step 1: Validate a deny policy definition.
    const validation = await gov.policies.validate({
      definition: { effect: "deny", resource: "datasets.*", actions: ["export"] },
      definitionFormat: "rego",
    });
    expect(validation.valid).toBe(true);

    // Step 2: Record the denied action in the audit log.
    const event = await audit.events.create({
      action: "dataset.export.denied",
      resource: { type: "dataset", id: "ds_1" },
      outcome: "denied",
      metadata: { policy_id: "pol_1", reason: "Denied by policy" },
    });
    expect(event.outcome).toBe("denied");

    // Step 3: Query the audit log confirms the denial.
    const results = await audit.events.list({ action: "dataset.export.denied" });
    expect(results.data.length).toBeGreaterThan(0);
  });
});

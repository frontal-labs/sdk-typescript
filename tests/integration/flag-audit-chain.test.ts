/**
 * Integration: Toggle feature flag → audit event logged → query audit trail.
 * Verifies that state changes in one package produce traceable audit events.
 */
import { describe, expect, it } from "vitest";
import {
  createIntegrationHarness,
  integrationPage,
} from "@frontal-labs/testing";
import { FlagsService } from "@frontal-labs/flags";
import { AuditService } from "@frontal-labs/audit";

const mockFlag = {
  id: "flag_1", key: "new-dashboard", name: "New Dashboard",
  type: "boolean", default_value: false, status: "active",
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
};

const mockAuditEvent = {
  id: "evt_1",
  actor: { user_id: "usr_1", member_id: "mbr_1" },
  action: "flag.toggled",
  resource: { type: "flag", id: "flag_1" },
  status: "success",
  metadata: { previous: "active", new: "inactive" },
  timestamp: "2025-01-01T00:00:00Z",
};

describe("Flags → Audit integration chain", () => {
  it("toggle flag → audit event logged → query returns event", async () => {
    const harness = createIntegrationHarness([
      { method: "POST", path: "/v1/flags/flag_1/toggle", body: { ...mockFlag, status: "inactive" } },
      { method: "POST", path: "/v1/audit/events", body: mockAuditEvent },
      { method: "POST", path: "/v1/audit/events/query", body: integrationPage([mockAuditEvent]) },
    ]);

    const { http: flagsHttp } = harness.createHttp();
    const { http: auditHttp } = harness.createHttp();

    const flags = new FlagsService(flagsHttp);
    const audit = new AuditService(auditHttp);

    // Step 1: Toggle flag
    const result = await flags.toggle("flag_1", false);
    expect(result.status).toBe("inactive");

    // Step 2: Log audit event for the toggle
    const event = await audit.log({
      action: "flag.toggled",
      resource: { type: "flag", id: "flag_1" },
      status: "success",
      metadata: { previous: "active", new: "inactive" },
    });
    expect(event.action).toBe("flag.toggled");

    // Step 3: Query audit trail finds the event
    const results = await audit.query({
      action: "flag.toggled",
    });
    expect(results.data.length).toBeGreaterThan(0);
    expect(results.data[0].resource.type).toBe("flag");
  });
});

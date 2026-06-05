import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  GovernanceService,
  createGovernanceClient,
  PolicySchema,
} from "../src/index";

function createService(
  routes: Array<{
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }> = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new GovernanceService(http), mock };
}

const mockPolicy = {
  id: "pol_1",
  name: "No Public Access",
  rules: [],
  enabled: true,
  priority: 1,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

describe("GovernanceService", () => {
  it("evaluates a policy", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/governance/policies/pol_1/evaluate",
        body: { policy_id: "pol_1", passed: true, rule_results: [] },
      },
    ]);
    const result = await service.evaluatePolicy("pol_1", {});
    expect(result.passed).toBe(true);
  });
  it("lists policies (paginated)", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/v1/governance/policies",
        body: pageWrap([mockPolicy]),
      },
    ]);
    const result = await service.policies.list();
    expect(result.data).toHaveLength(1);
  });
  it("enables a policy", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/governance/policies/pol_1/enable",
        body: mockPolicy,
      },
    ]);
    const result = await service.policies.enable("pol_1");
    expect(result.id).toBe("pol_1");
  });
  it("disables a policy", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/governance/policies/pol_1/disable",
        body: mockPolicy,
      },
    ]);
    const result = await service.policies.disable("pol_1");
    expect(result.id).toBe("pol_1");
  });
  it("checks RBAC access", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/governance/rbac/check",
        body: { allowed: true },
      },
    ]);
    const result = await service.rbac.checkAccess({
      resource: "pipelines",
      action: "read",
    });
    expect(result.allowed).toBe(true);
  });
});

describe("Schemas", () => {
  it("validates Policy", () => {
    expect(PolicySchema.safeParse(mockPolicy).success).toBe(true);
  });
});

describe("createGovernanceClient", () => {
  it("creates client", () => {
    expect(createGovernanceClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      GovernanceService
    );
  });
});

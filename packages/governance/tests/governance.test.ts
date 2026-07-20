import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import {
  createGovernanceClient,
  GovernanceSdk,
  PolicySchema,
} from "../src/index";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new GovernanceSdk(http), mock };
}

const mockPolicy = {
  id: "pol_1",
  name: "No Public Access",
  rules: [],
  enabled: true,
  priority: 1,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

function noDoublePrefix(mock: { requests: { path: string }[] }): boolean {
  return !mock.requests.some((r) => r.path.includes("/v1/v1/"));
}

describe("GovernanceSdk", () => {
  describe("policies", () => {
    it("lists, validates, and reads templates at /policies*", async () => {
      const { service, mock } = createService([
        { method: "GET", path: "/policies", body: pageWrap([mockPolicy]) },
        {
          method: "POST",
          path: "/policies/validate",
          body: { valid: true },
        },
        {
          method: "GET",
          path: "/policies/templates",
          body: { data: [{ id: "tpl_1" }] },
        },
        {
          method: "POST",
          path: "/policies/from-template",
          body: mockPolicy,
        },
      ]);
      const list = await service.policies.list();
      expect(list.data).toHaveLength(1);
      const v = await service.policies.validate({ definition: {} });
      expect(v.valid).toBe(true);
      const t = await service.policies.templates();
      expect(t.data).toHaveLength(1);
      const p = await service.policies.fromTemplate({ templateId: "tpl_1" });
      expect(p.id).toBe("pol_1");
      mock.expectCalled("POST", "/policies/validate");
      mock.expectCalled("GET", "/policies/templates");
      expect(noDoublePrefix(mock)).toBe(true);
    });

    it("reads policy versions", async () => {
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/policies/pol_1/versions",
          body: { data: [{ version: 1 }] },
        },
      ]);
      const res = await service.policies.versions("pol_1");
      expect(res.data).toHaveLength(1);
      mock.expectCalled("GET", "/policies/pol_1/versions");
    });
  });

  describe("compliance", () => {
    it("frameworks / assessments / violations / score", async () => {
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/compliance/frameworks",
          body: { data: [{ id: "gdpr" }] },
        },
        {
          method: "POST",
          path: "/compliance/assessments",
          body: { id: "as_1", framework: "gdpr" },
        },
        {
          method: "POST",
          path: "/compliance/violations/vi_1/resolve",
          body: { resolved: true },
        },
        {
          method: "GET",
          path: "/compliance/score",
          body: { overallScore: 92 },
        },
      ]);
      expect((await service.compliance.frameworks()).data).toHaveLength(1);
      const a = await service.compliance.runAssessment({ framework: "gdpr" });
      expect(a.id).toBe("as_1");
      await service.compliance.resolveViolation("vi_1");
      const s = await service.compliance.score();
      expect(s.overallScore).toBe(92);
      mock.expectCalled("POST", "/compliance/assessments");
      mock.expectCalled("POST", "/compliance/violations/vi_1/resolve");
    });
  });

  describe("access control", () => {
    it("roles, permissions, and access check", async () => {
      const { service, mock } = createService([
        { method: "GET", path: "/roles", body: pageWrap([{ id: "ro_1" }]) },
        {
          method: "POST",
          path: "/permissions",
          body: { id: "pe_1" },
        },
        { method: "POST", path: "/access/check", body: { allowed: true } },
      ]);
      const roles = await service.roles.list();
      expect(roles.data).toHaveLength(1);
      await service.permissions.create({
        name: "read",
        description: "read",
        resourceType: "pipeline",
        action: "read",
      });
      const check = await service.access.check({
        userId: "usr_1",
        roleNames: ["admin"],
        action: "read",
      });
      expect(check.allowed).toBe(true);
      mock.expectCalled("POST", "/access/check");
      mock.expectCalled("GET", "/roles");
    });
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
      GovernanceSdk
    );
  });
});

import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type { Policy, PolicyEvaluationResult, RbacBinding } from "./schemas";

export class GovernanceService {
  readonly policies: PoliciesNamespace;
  readonly rbac: RbacNamespace;

  constructor(private readonly http: HttpClient) {
    this.policies = new PoliciesNamespace(http);
    this.rbac = new RbacNamespace(http);
  }

  async evaluatePolicy(
    policyId: string,
    context: Record<string, unknown>
  ): Promise<PolicyEvaluationResult> {
    return this.http.post(`/governance/policies/${policyId}/evaluate`, {
      context,
    });
  }
  async evaluateAllPolicies(
    context: Record<string, unknown>
  ): Promise<PolicyEvaluationResult[]> {
    return this.http.post("/governance/policies/evaluate", { context });
  }
}

export class PoliciesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Policy>> {
    const raw = await this.http.get("/governance/policies", opts);
    return createPageResult(asPagePayload<Policy>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async create(
    input: Omit<Policy, "id" | "createdAt" | "updatedAt">
  ): Promise<Policy> {
    return this.http.post("/governance/policies", input);
  }
  async get(id: string): Promise<Policy> {
    return this.http.get(`/governance/policies/${id}`);
  }
  async update(id: string, input: Partial<Policy>): Promise<Policy> {
    return this.http.put(`/governance/policies/${id}`, input);
  }
  async delete(id: string): Promise<void> {
    return this.http.delete(`/governance/policies/${id}`);
  }
  async enable(id: string): Promise<Policy> {
    return this.http.post(`/governance/policies/${id}/enable`, {});
  }
  async disable(id: string): Promise<Policy> {
    return this.http.post(`/governance/policies/${id}/disable`, {});
  }
}

export class RbacNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: { userId?: string; memberId?: string } = {}
  ): Promise<{ data: RbacBinding[] }> {
    return this.http.get("/governance/rbac/bindings", opts);
  }
  async create(
    input: Omit<RbacBinding, "id" | "createdAt">
  ): Promise<RbacBinding> {
    return this.http.post("/governance/rbac/bindings", input);
  }
  async delete(id: string): Promise<void> {
    return this.http.delete(`/governance/rbac/bindings/${id}`);
  }
  async checkAccess(input: {
    userId?: string;
    memberId?: string;
    resource: string;
    action: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    return this.http.post("/governance/rbac/check", input);
  }
}

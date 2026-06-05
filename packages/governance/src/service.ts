import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type { Policy, PolicyEvaluationResult, RbacBinding } from "./schemas";

const asPagePayload = <T>(
  raw: unknown
): { data: T[]; pagination: PaginationMeta; meta?: unknown } =>
  raw as { data: T[]; pagination: PaginationMeta; meta?: unknown };

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
    return this.http.post(`/v1/governance/policies/${policyId}/evaluate`, {
      context,
    });
  }
  async evaluateAllPolicies(
    context: Record<string, unknown>
  ): Promise<PolicyEvaluationResult[]> {
    return this.http.post("/v1/governance/policies/evaluate", { context });
  }
}

export class PoliciesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Policy>> {
    const raw = await this.http.get("/v1/governance/policies", opts);
    return createPageResult(asPagePayload<Policy>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async create(
    input: Omit<Policy, "id" | "created_at" | "updated_at">
  ): Promise<Policy> {
    return this.http.post("/v1/governance/policies", input);
  }
  async get(id: string): Promise<Policy> {
    return this.http.get(`/v1/governance/policies/${id}`);
  }
  async update(id: string, input: Partial<Policy>): Promise<Policy> {
    return this.http.put(`/v1/governance/policies/${id}`, input);
  }
  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/governance/policies/${id}`);
  }
  async enable(id: string): Promise<Policy> {
    return this.http.post(`/v1/governance/policies/${id}/enable`, {});
  }
  async disable(id: string): Promise<Policy> {
    return this.http.post(`/v1/governance/policies/${id}/disable`, {});
  }
}

export class RbacNamespace {
  constructor(private readonly http: HttpClient) {}
  async listBindings(
    opts: { user_id?: string; member_id?: string } = {}
  ): Promise<{ data: RbacBinding[] }> {
    return this.http.get("/v1/governance/rbac/bindings", opts);
  }
  async createBinding(
    input: Omit<RbacBinding, "id" | "created_at">
  ): Promise<RbacBinding> {
    return this.http.post("/v1/governance/rbac/bindings", input);
  }
  async deleteBinding(id: string): Promise<void> {
    return this.http.delete(`/v1/governance/rbac/bindings/${id}`);
  }
  async checkAccess(input: {
    user_id?: string;
    member_id?: string;
    resource: string;
    action: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    return this.http.post("/v1/governance/rbac/check", input);
  }
}

import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";
import type { Policy } from "./schemas";

type Obj = Record<string, unknown>;
interface ListOpts {
  limit?: number;
  cursor?: string;
  [key: string]: unknown;
}

/**
 * Client for the Frontal GovernanceSdk platform. The platform is composed of three
 * gateway-exposed services:
 *  - **policies** (`/v1/policies`) — policy definitions, versions, templates, validation.
 *  - **compliance** (`/v1/compliance`) — frameworks, assessments, violations, score.
 *  - **access control / RBAC** (`/v1/roles`, `/v1/permissions`, `/v1/access`).
 *
 * Paths are written without the leading `/v1` because the client base URL
 * already includes it.
 */
export class GovernanceSdk {
  readonly policies: PoliciesNamespace;
  readonly compliance: ComplianceNamespace;
  readonly roles: RolesNamespace;
  readonly permissions: PermissionsNamespace;
  readonly access: AccessNamespace;

  constructor(http: HttpClient) {
    this.policies = new PoliciesNamespace(http);
    this.compliance = new ComplianceNamespace(http);
    this.roles = new RolesNamespace(http);
    this.permissions = new PermissionsNamespace(http);
    this.access = new AccessNamespace(http);
  }
}

export class PoliciesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: {
      category?: string;
      status?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PageResult<Policy>> {
    const raw = await this.http.get("/policies", opts);
    return createPageResult(asPagePayload<Policy>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  create(
    input: Omit<Policy, "id" | "createdAt" | "updatedAt">
  ): Promise<Policy> {
    return this.http.post("/policies", input);
  }
  get(id: string): Promise<Policy> {
    return this.http.get(`/policies/${id}`);
  }
  update(id: string, input: Partial<Policy>): Promise<Policy> {
    return this.http.put(`/policies/${id}`, input);
  }
  delete(id: string): Promise<void> {
    return this.http.delete(`/policies/${id}`);
  }
  /** List the version history of a policy. */
  versions(id: string): Promise<{ data: Obj[] }> {
    return this.http.get(`/policies/${id}/versions`);
  }
  /** List available policy templates (optionally filtered by category). */
  templates(opts: { category?: string } = {}): Promise<{ data: Obj[] }> {
    return this.http.get("/policies/templates", opts);
  }
  /** Create a policy from a template with parameter substitution. */
  fromTemplate(input: {
    templateId: string;
    parameters?: Obj;
    [key: string]: unknown;
  }): Promise<Policy> {
    return this.http.post("/policies/from-template", input);
  }
  /** Validate a policy definition without saving it. */
  validate(input: {
    definition: unknown;
    definitionFormat?: "rego" | "json_schema" | "cel";
    [key: string]: unknown;
  }): Promise<{ valid: boolean; errors?: Obj[] }> {
    return this.http.post("/policies/validate", input);
  }
}

export class ComplianceNamespace {
  constructor(private readonly http: HttpClient) {}
  /** List supported compliance frameworks (GDPR, HIPAA, SOC2, …). */
  frameworks(): Promise<{ data: Obj[] }> {
    return this.http.get("/compliance/frameworks");
  }
  /** Run a compliance assessment against a framework. */
  runAssessment(input: {
    framework: string;
    [key: string]: unknown;
  }): Promise<Obj> {
    return this.http.post("/compliance/assessments", input);
  }
  async listAssessments(
    opts: { framework?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/compliance/assessments", opts);
    return createPageResult(asPagePayload<Obj>(raw), (cursor) =>
      this.listAssessments({ ...opts, cursor })
    );
  }
  getAssessment(id: string): Promise<Obj> {
    return this.http.get(`/compliance/assessments/${id}`);
  }
  async listViolations(
    opts: {
      framework?: string;
      unresolved?: boolean;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/compliance/violations", opts);
    return createPageResult(asPagePayload<Obj>(raw), (cursor) =>
      this.listViolations({ ...opts, cursor })
    );
  }
  resolveViolation(id: string, input: Obj = {}): Promise<Obj> {
    return this.http.post(`/compliance/violations/${id}/resolve`, input);
  }
  /** Overall compliance score, optionally scoped to a framework. */
  score(opts: { framework?: string } = {}): Promise<Obj> {
    return this.http.get("/compliance/score", opts);
  }
}

export class RolesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/roles", opts);
    return createPageResult(asPagePayload<Obj>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  get(id: string): Promise<Obj> {
    return this.http.get(`/roles/${id}`);
  }
  create(input: {
    name: string;
    description?: string;
    permissions: string[];
    [key: string]: unknown;
  }): Promise<Obj> {
    return this.http.post("/roles", input);
  }
  delete(id: string): Promise<void> {
    return this.http.delete(`/roles/${id}`);
  }
}

export class PermissionsNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/permissions", opts);
    return createPageResult(asPagePayload<Obj>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  get(id: string): Promise<Obj> {
    return this.http.get(`/permissions/${id}`);
  }
  create(input: {
    name: string;
    description: string;
    resourceType: string;
    action: string;
    [key: string]: unknown;
  }): Promise<Obj> {
    return this.http.post("/permissions", input);
  }
}

export class AccessNamespace {
  constructor(private readonly http: HttpClient) {}
  /** Check whether a user with the given roles may perform an action. */
  check(input: {
    userId: string;
    roleNames: string[];
    action: string;
    resourceType?: string;
    [key: string]: unknown;
  }): Promise<{ allowed: boolean; reason?: string }> {
    return this.http.post("/access/check", input);
  }
}

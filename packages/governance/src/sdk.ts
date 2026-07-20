import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "frontal/core";
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
  /** Namespace for policy operations. */
  readonly policies: PoliciesNamespace;
  /** Namespace for compliance operations. */
  readonly compliance: ComplianceNamespace;
  /** Namespace for role operations. */
  readonly roles: RolesNamespace;
  /** Namespace for permission operations. */
  readonly permissions: PermissionsNamespace;
  /** Namespace for access control operations. */
  readonly access: AccessNamespace;

  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(http: HttpClient) {
    this.policies = new PoliciesNamespace(http);
    this.compliance = new ComplianceNamespace(http);
    this.roles = new RolesNamespace(http);
    this.permissions = new PermissionsNamespace(http);
    this.access = new AccessNamespace(http);
  }
}

/** Namespace for policy CRUD and validation operations. */
export class PoliciesNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}
  /**
   * List policies with optional filters.
   * @param opts - Filters (category, status) and pagination options.
   * @returns A paginated list of policies.
   */
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
  /**
   * Create a new policy.
   * @param input - Policy data (id, createdAt, updatedAt are auto-generated).
   * @returns The created policy.
   */
  create(
    input: Omit<Policy, "id" | "createdAt" | "updatedAt">
  ): Promise<Policy> {
    return this.http.post("/policies", input);
  }
  /**
   * Get a policy by ID.
   * @param id - The policy's unique identifier.
   * @returns The policy.
   */
  get(id: string): Promise<Policy> {
    return this.http.get(`/policies/${id}`);
  }
  /**
   * Update a policy.
   * @param id - The policy's unique identifier.
   * @param input - The fields to update.
   * @returns The updated policy.
   */
  update(id: string, input: Partial<Policy>): Promise<Policy> {
    return this.http.put(`/policies/${id}`, input);
  }
  /**
   * Delete a policy.
   * @param id - The policy's unique identifier.
   */
  delete(id: string): Promise<void> {
    return this.http.delete(`/policies/${id}`);
  }
  /**
   * List the version history of a policy.
   * @param id - The policy's unique identifier.
   * @returns A list of policy versions.
   */
  versions(id: string): Promise<{ data: Obj[] }> {
    return this.http.get(`/policies/${id}/versions`);
  }
  /**
   * List available policy templates, optionally filtered by category.
   * @param opts - Optional category filter.
   * @returns A list of policy templates.
   */
  templates(opts: { category?: string } = {}): Promise<{ data: Obj[] }> {
    return this.http.get("/policies/templates", opts);
  }
  /**
   * Create a policy from a template with parameter substitution.
   * @param input - The template ID and optional parameters.
   * @returns The created policy.
   */
  fromTemplate(input: {
    templateId: string;
    parameters?: Obj;
    [key: string]: unknown;
  }): Promise<Policy> {
    return this.http.post("/policies/from-template", input);
  }
  /**
   * Validate a policy definition without saving it.
   * @param input - The policy definition and format.
   * @returns Validation result with any errors.
   */
  validate(input: {
    definition: unknown;
    definitionFormat?: "rego" | "json_schema" | "cel";
    [key: string]: unknown;
  }): Promise<{ valid: boolean; errors?: Obj[] }> {
    return this.http.post("/policies/validate", input);
  }
}

/** Namespace for compliance operations (frameworks, assessments, violations, score). */
export class ComplianceNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}
  /**
   * List supported compliance frameworks (e.g. GDPR, HIPAA, SOC2).
   * @returns A list of compliance frameworks.
   */
  frameworks(): Promise<{ data: Obj[] }> {
    return this.http.get("/compliance/frameworks");
  }
  /**
   * Run a compliance assessment against a framework.
   * @param input - The framework to assess against.
   * @returns The assessment result.
   */
  runAssessment(input: {
    framework: string;
    [key: string]: unknown;
  }): Promise<Obj> {
    return this.http.post("/compliance/assessments", input);
  }
  /**
   * List compliance assessments with optional filters.
   * @param opts - Filters (framework) and pagination options.
   * @returns A paginated list of assessments.
   */
  async listAssessments(
    opts: { framework?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/compliance/assessments", opts);
    return createPageResult(asPagePayload<Obj>(raw), (cursor) =>
      this.listAssessments({ ...opts, cursor })
    );
  }
  /**
   * Get a compliance assessment by ID.
   * @param id - The assessment's unique identifier.
   * @returns The assessment.
   */
  getAssessment(id: string): Promise<Obj> {
    return this.http.get(`/compliance/assessments/${id}`);
  }
  /**
   * List compliance violations with optional filters.
   * @param opts - Filters (framework, unresolved) and pagination options.
   * @returns A paginated list of violations.
   */
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
  /**
   * Resolve a compliance violation.
   * @param id - The violation's unique identifier.
   * @param input - Optional resolution data.
   * @returns The resolution result.
   */
  resolveViolation(id: string, input: Obj = {}): Promise<Obj> {
    return this.http.post(`/compliance/violations/${id}/resolve`, input);
  }
  /**
   * Get the overall compliance score, optionally scoped to a framework.
   * @param opts - Optional framework filter.
   * @returns The compliance score.
   */
  score(opts: { framework?: string } = {}): Promise<Obj> {
    return this.http.get("/compliance/score", opts);
  }
}

/** Namespace for RBAC role operations. */
export class RolesNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}
  /**
   * List roles with pagination.
   * @param opts - Pagination options.
   * @returns A paginated list of roles.
   */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/roles", opts);
    return createPageResult(asPagePayload<Obj>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  /**
   * Get a role by ID.
   * @param id - The role's unique identifier.
   * @returns The role.
   */
  get(id: string): Promise<Obj> {
    return this.http.get(`/roles/${id}`);
  }
  /**
   * Create a new role.
   * @param input - The role name, description, and associated permissions.
   * @returns The created role.
   */
  create(input: {
    name: string;
    description?: string;
    permissions: string[];
    [key: string]: unknown;
  }): Promise<Obj> {
    return this.http.post("/roles", input);
  }
  /**
   * Delete a role.
   * @param id - The role's unique identifier.
   */
  delete(id: string): Promise<void> {
    return this.http.delete(`/roles/${id}`);
  }
}

/** Namespace for permission operations. */
export class PermissionsNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}
  /**
   * List permissions with pagination.
   * @param opts - Pagination options.
   * @returns A paginated list of permissions.
   */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/permissions", opts);
    return createPageResult(asPagePayload<Obj>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  /**
   * Get a permission by ID.
   * @param id - The permission's unique identifier.
   * @returns The permission.
   */
  get(id: string): Promise<Obj> {
    return this.http.get(`/permissions/${id}`);
  }
  /**
   * Create a new permission.
   * @param input - The permission name, description, resource type, and action.
   * @returns The created permission.
   */
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

/** Namespace for access control checks. */
export class AccessNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}
  /**
   * Check whether a user with the given roles may perform an action.
   * @param input - The user ID, role names, action, and optional resource type.
   * @returns Whether the action is allowed and an optional reason.
   */
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

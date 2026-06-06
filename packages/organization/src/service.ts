import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type {
  Invitation,
  Member,
  Organization,
  Role,
  Team,
  Tenant,
} from "./schemas";

const asPagePayload = <T>(
  raw: unknown
): {
  data: T[];
  pagination: PaginationMeta;
  meta?: unknown;
} =>
  raw as {
    data: T[];
    pagination: PaginationMeta;
    meta?: unknown;
  };

export class OrganizationService {
  readonly tenants: TenantsNamespace;
  readonly teams: TeamsNamespace;
  readonly members: MembersNamespace;
  readonly roles: RolesNamespace;
  readonly invitations: InvitationsNamespace;

  constructor(private readonly http: HttpClient) {
    this.tenants = new TenantsNamespace(http);
    this.teams = new TeamsNamespace(http);
    this.members = new MembersNamespace(http);
    this.roles = new RolesNamespace(http);
    this.invitations = new InvitationsNamespace(http);
  }

  async get(): Promise<Organization> {
    return this.http.get("/v1/organization");
  }

  async update(input: {
    name?: string;
    slug?: string;
    settings?: Record<string, unknown>;
    billingEmail?: string;
  }): Promise<Organization> {
    return this.http.put("/v1/organization", input);
  }

  async delete(): Promise<void> {
    return this.http.delete("/v1/organization");
  }
}

// ── Tenants ────────────────────────────────────────────────────────

export class TenantsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Tenant>> {
    const raw = await this.http.get("/v1/organization/tenants", opts);
    return createPageResult(asPagePayload<Tenant>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: {
    name: string;
    slug: string;
    description?: string;
  }): Promise<Tenant> {
    return this.http.post("/v1/organization/tenants", input);
  }

  async get(id: string): Promise<Tenant> {
    return this.http.get(`/v1/organization/tenants/${id}`);
  }

  async update(
    id: string,
    input: { name?: string; slug?: string; description?: string }
  ): Promise<Tenant> {
    return this.http.put(`/v1/organization/tenants/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/organization/tenants/${id}`);
  }
}

// ── Teams ──────────────────────────────────────────────────────────

export class TeamsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { tenantId?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Team>> {
    const raw = await this.http.get("/v1/organization/teams", opts);
    return createPageResult(asPagePayload<Team>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: {
    name: string;
    description?: string;
    tenantId?: string;
  }): Promise<Team> {
    return this.http.post("/v1/organization/teams", input);
  }

  async get(id: string): Promise<Team> {
    return this.http.get(`/v1/organization/teams/${id}`);
  }

  async update(
    id: string,
    input: { name?: string; description?: string }
  ): Promise<Team> {
    return this.http.put(`/v1/organization/teams/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/organization/teams/${id}`);
  }

  async addMember(teamId: string, memberId: string): Promise<void> {
    return this.http.post(`/v1/organization/teams/${teamId}/members`, {
      memberId,
    });
  }

  /** @deprecated Use {@link deleteMember} instead. */
  async removeMember(teamId: string, memberId: string): Promise<void> {
    return this.deleteMember(teamId, memberId);
  }
  async deleteMember(teamId: string, memberId: string): Promise<void> {
    return this.http.delete(
      `/v1/organization/teams/${teamId}/members/${memberId}`
    );
  }

  async listMembers(teamId: string): Promise<{ data: Member[] }> {
    return this.http.get(`/v1/organization/teams/${teamId}/members`);
  }
}

// ── Members ────────────────────────────────────────────────────────

export class MembersNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: {
      status?: string;
      role?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PageResult<Member>> {
    const raw = await this.http.get("/v1/organization/members", opts);
    return createPageResult(asPagePayload<Member>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async get(id: string): Promise<Member> {
    return this.http.get(`/v1/organization/members/${id}`);
  }

  async invite(input: { email: string; role: string }): Promise<Invitation> {
    return this.http.post("/v1/organization/members/invite", input);
  }

  /** @deprecated Use {@link delete} instead. */
  async remove(memberId: string): Promise<void> {
    return this.delete(memberId);
  }
  async delete(memberId: string): Promise<void> {
    return this.http.delete(`/v1/organization/members/${memberId}`);
  }

  async updateRole(memberId: string, role: string): Promise<Member> {
    return this.http.put(`/v1/organization/members/${memberId}/role`, { role });
  }
}

// ── Roles ──────────────────────────────────────────────────────────

export class RolesNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<{ data: Role[] }> {
    return this.http.get("/v1/organization/roles");
  }

  async create(input: {
    name: string;
    description?: string;
    permissions: {
      resource: string;
      action: string;
      conditions?: Record<string, unknown>;
    }[];
  }): Promise<Role> {
    return this.http.post("/v1/organization/roles", input);
  }

  async get(id: string): Promise<Role> {
    return this.http.get(`/v1/organization/roles/${id}`);
  }

  async update(
    id: string,
    input: {
      name?: string;
      description?: string;
      permissions?: {
        resource: string;
        action: string;
        conditions?: Record<string, unknown>;
      }[];
    }
  ): Promise<Role> {
    return this.http.put(`/v1/organization/roles/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/organization/roles/${id}`);
  }
}

// ── Invitations ────────────────────────────────────────────────────

export class InvitationsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { status?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Invitation>> {
    const raw = await this.http.get("/v1/organization/invitations", opts);
    return createPageResult(asPagePayload<Invitation>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: { email: string; role: string }): Promise<Invitation> {
    return this.http.post("/v1/organization/invitations", input);
  }

  async cancel(id: string): Promise<void> {
    return this.http.post(`/v1/organization/invitations/${id}/cancel`, {});
  }

  async resend(id: string): Promise<Invitation> {
    return this.http.post(`/v1/organization/invitations/${id}/resend`, {});
  }
}

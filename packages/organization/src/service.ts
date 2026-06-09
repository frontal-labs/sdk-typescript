import {
  asPagePayload,
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
    return this.http.get("/organization");
  }

  async update(input: {
    name?: string;
    slug?: string;
    settings?: Record<string, unknown>;
    billingEmail?: string;
  }): Promise<Organization> {
    return this.http.put("/organization", input);
  }

  async delete(): Promise<void> {
    return this.http.delete("/organization");
  }
}

// ── Tenants ────────────────────────────────────────────────────────

export class TenantsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Tenant>> {
    const raw = await this.http.get("/organization/tenants", opts);
    return createPageResult(asPagePayload<Tenant>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: {
    name: string;
    slug: string;
    description?: string;
  }): Promise<Tenant> {
    return this.http.post("/organization/tenants", input);
  }

  async get(id: string): Promise<Tenant> {
    return this.http.get(`/organization/tenants/${id}`);
  }

  async update(
    id: string,
    input: { name?: string; slug?: string; description?: string }
  ): Promise<Tenant> {
    return this.http.put(`/organization/tenants/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/organization/tenants/${id}`);
  }
}

// ── Teams ──────────────────────────────────────────────────────────

export class TeamsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { tenantId?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Team>> {
    const raw = await this.http.get("/organization/teams", opts);
    return createPageResult(asPagePayload<Team>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: {
    name: string;
    description?: string;
    tenantId?: string;
  }): Promise<Team> {
    return this.http.post("/organization/teams", input);
  }

  async get(id: string): Promise<Team> {
    return this.http.get(`/organization/teams/${id}`);
  }

  async update(
    id: string,
    input: { name?: string; description?: string }
  ): Promise<Team> {
    return this.http.put(`/organization/teams/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/organization/teams/${id}`);
  }

  async addMember(teamId: string, memberId: string): Promise<void> {
    return this.http.post(`/organization/teams/${teamId}/members`, {
      memberId,
    });
  }

  async deleteMember(teamId: string, memberId: string): Promise<void> {
    return this.http.delete(
      `/organization/teams/${teamId}/members/${memberId}`
    );
  }

  async listMembers(teamId: string): Promise<{ data: Member[] }> {
    return this.http.get(`/organization/teams/${teamId}/members`);
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
    const raw = await this.http.get("/organization/members", opts);
    return createPageResult(asPagePayload<Member>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async get(id: string): Promise<Member> {
    return this.http.get(`/organization/members/${id}`);
  }

  async invite(input: { email: string; role: string }): Promise<Invitation> {
    return this.http.post("/organization/members/invite", input);
  }

  async delete(memberId: string): Promise<void> {
    return this.http.delete(`/organization/members/${memberId}`);
  }

  async updateRole(memberId: string, role: string): Promise<Member> {
    return this.http.put(`/organization/members/${memberId}/role`, { role });
  }
}

// ── Roles ──────────────────────────────────────────────────────────

export class RolesNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<{ data: Role[] }> {
    return this.http.get("/organization/roles");
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
    return this.http.post("/organization/roles", input);
  }

  async get(id: string): Promise<Role> {
    return this.http.get(`/organization/roles/${id}`);
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
    return this.http.put(`/organization/roles/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/organization/roles/${id}`);
  }
}

// ── Invitations ────────────────────────────────────────────────────

export class InvitationsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { status?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Invitation>> {
    const raw = await this.http.get("/organization/invitations", opts);
    return createPageResult(asPagePayload<Invitation>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: { email: string; role: string }): Promise<Invitation> {
    return this.http.post("/organization/invitations", input);
  }

  async cancel(id: string): Promise<void> {
    return this.http.post(`/organization/invitations/${id}/cancel`, {});
  }

  async resend(id: string): Promise<Invitation> {
    return this.http.post(`/organization/invitations/${id}/resend`, {});
  }
}

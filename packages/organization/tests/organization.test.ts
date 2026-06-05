import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  OrganizationService,
  createOrganizationClient,
  OrganizationSchema,
  TenantSchema,
  TeamSchema,
  MemberSchema,
  RoleSchema,
  PermissionSchema,
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
  const service = new OrganizationService(http);
  return { service, mock };
}

const mockOrg = {
  id: "org_abc123",
  name: "Test Labs",
  slug: "test-labs",
  plan: "pro",
  status: "active",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const mockTenant = {
  id: "tnt_xyz456",
  organization_id: "org_abc123",
  name: "Engineering",
  slug: "engineering",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const mockTeam = {
  id: "tm_def789",
  organization_id: "org_abc123",
  name: "Platform Team",
  member_count: 3,
  created_at: "2025-01-01T00:00:00Z",
};

const mockMember = {
  id: "mbr_ghi012",
  organization_id: "org_abc123",
  user_id: "usr_abc123",
  email: "test@frontal.dev",
  name: "Test User",
  role: "admin",
  status: "active",
  joined_at: "2025-01-01T00:00:00Z",
};

const mockRole = {
  id: "rol_jkl345",
  organization_id: "org_abc123",
  name: "Viewer",
  description: "Read-only access",
  permissions: [{ resource: "*", action: "read" }],
  is_system: false,
  created_at: "2025-01-01T00:00:00Z",
};

const mockInvitation = {
  id: "inv_mno678",
  organization_id: "org_abc123",
  email: "invited@frontal.dev",
  role: "member",
  invited_by: "usr_abc123",
  status: "pending",
  expires_at: "2025-02-01T00:00:00Z",
  created_at: "2025-01-01T00:00:00Z",
};

function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

describe("OrganizationService", () => {
  describe("org CRUD", () => {
    it("gets the organization", async () => {
      const { service } = createService([
        { method: "GET", path: "/v1/organization", body: mockOrg },
      ]);
      const result = await service.get();
      expect(result.id).toBe("org_abc123");
    });

    it("updates the organization", async () => {
      const updated = { ...mockOrg, name: "New Name" };
      const { service } = createService([
        { method: "PUT", path: "/v1/organization", body: updated },
      ]);
      const result = await service.update({ name: "New Name" });
      expect(result.name).toBe("New Name");
    });
  });

  describe("tenants", () => {
    it("lists tenants (paginated)", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/v1/organization/tenants",
          body: pageWrap([mockTenant]),
        },
      ]);
      const result = await service.tenants.list();
      expect(result.data).toHaveLength(1);
    });

    it("creates a tenant", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/v1/organization/tenants",
          body: mockTenant,
        },
      ]);
      const result = await service.tenants.create({
        name: "Engineering",
        slug: "engineering",
      });
      expect(result.id).toBe("tnt_xyz456");
      mock.expectCalled("POST", "/v1/organization/tenants");
    });

    it("gets a tenant", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/v1/organization/tenants/tnt_xyz456",
          body: mockTenant,
        },
      ]);
      const result = await service.tenants.get("tnt_xyz456");
      expect(result.name).toBe("Engineering");
    });

    it("deletes a tenant", async () => {
      const { service, mock } = createService([
        {
          method: "DELETE",
          path: "/v1/organization/tenants/tnt_xyz456",
          status: 204,
        },
      ]);
      await service.tenants.delete("tnt_xyz456");
      mock.expectCalled("DELETE", "/v1/organization/tenants/tnt_xyz456");
    });
  });

  describe("teams", () => {
    it("lists teams (paginated)", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/v1/organization/teams",
          body: pageWrap([mockTeam]),
        },
      ]);
      const result = await service.teams.list();
      expect(result.data).toHaveLength(1);
    });

    it("creates a team", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/organization/teams",
          body: mockTeam,
        },
      ]);
      const result = await service.teams.create({
        name: "Platform Team",
      });
      expect(result.name).toBe("Platform Team");
    });

    it("adds member to team", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/v1/organization/teams/tm_def789/members",
          status: 204,
        },
      ]);
      await service.teams.addMember("tm_def789", "mbr_ghi012");
      mock.expectCalled("POST", "/v1/organization/teams/tm_def789/members");
    });
  });

  describe("members", () => {
    it("lists members (paginated)", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/v1/organization/members",
          body: pageWrap([mockMember]),
        },
      ]);
      const result = await service.members.list();
      expect(result.data).toHaveLength(1);
    });

    it("invites a member", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/organization/members/invite",
          body: mockInvitation,
        },
      ]);
      const result = await service.members.invite({
        email: "invited@frontal.dev",
        role: "member",
      });
      expect(result.email).toBe("invited@frontal.dev");
    });

    it("updates member role", async () => {
      const updated = { ...mockMember, role: "viewer" };
      const { service } = createService([
        {
          method: "PUT",
          path: "/v1/organization/members/mbr_ghi012/role",
          body: updated,
        },
      ]);
      const result = await service.members.updateRole("mbr_ghi012", "viewer");
      expect(result.role).toBe("viewer");
    });
  });

  describe("roles", () => {
    it("lists roles", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/v1/organization/roles",
          body: { data: [mockRole] },
        },
      ]);
      const result = await service.roles.list();
      expect(result.data).toHaveLength(1);
    });

    it("creates a role", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/organization/roles",
          body: mockRole,
        },
      ]);
      const result = await service.roles.create({
        name: "Viewer",
        description: "Read-only access",
        permissions: [{ resource: "*", action: "read" }],
      });
      expect(result.name).toBe("Viewer");
    });

    it("deletes a role", async () => {
      const { service, mock } = createService([
        {
          method: "DELETE",
          path: "/v1/organization/roles/rol_jkl345",
          status: 204,
        },
      ]);
      await service.roles.delete("rol_jkl345");
      mock.expectCalled("DELETE", "/v1/organization/roles/rol_jkl345");
    });
  });

  describe("invitations", () => {
    it("lists invitations (paginated)", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/v1/organization/invitations",
          body: pageWrap([mockInvitation]),
        },
      ]);
      const result = await service.invitations.list();
      expect(result.data).toHaveLength(1);
    });

    it("cancels an invitation", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/v1/organization/invitations/inv_mno678/cancel",
          status: 204,
        },
      ]);
      await service.invitations.cancel("inv_mno678");
      mock.expectCalled(
        "POST",
        "/v1/organization/invitations/inv_mno678/cancel"
      );
    });
  });
});

describe("Schemas validation", () => {
  it("validates Organization schema", () => {
    expect(OrganizationSchema.safeParse(mockOrg).success).toBe(true);
  });

  it("validates Tenant schema", () => {
    expect(TenantSchema.safeParse(mockTenant).success).toBe(true);
  });

  it("validates Team schema", () => {
    expect(TeamSchema.safeParse(mockTeam).success).toBe(true);
  });

  it("validates Member schema", () => {
    expect(MemberSchema.safeParse(mockMember).success).toBe(true);
  });

  it("validates Role schema", () => {
    expect(RoleSchema.safeParse(mockRole).success).toBe(true);
  });

  it("validates Permission schema", () => {
    expect(
      PermissionSchema.safeParse({ resource: "test", action: "read" }).success
    ).toBe(true);
  });

  it("rejects invalid permission action", () => {
    expect(
      PermissionSchema.safeParse({ resource: "test", action: "invalid" })
        .success
    ).toBe(false);
  });
});

describe("createOrganizationClient factory", () => {
  it("creates client from config", () => {
    const client = createOrganizationClient({
      apiKey: "frt_test-key-1234567890",
    });
    expect(client).toBeInstanceOf(OrganizationService);
  });
});

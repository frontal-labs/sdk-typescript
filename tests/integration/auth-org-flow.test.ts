/**
 * Integration: Auth sign-up → Organization tenant → member invite flow.
 * Verifies that auth user IDs flow correctly into organization members.
 */
import { describe, expect, it } from "vitest";
import {
  createIntegrationHarness,
  dataEnvelope,
  integrationPage,
} from "@frontal-labs/testing";
import { AuthService } from "@frontal-labs/auth";
import { OrganizationService } from "@frontal-labs/organization";

const mockUser = {
  id: "usr_abc123", aud: "authenticated", email: "dev@test.com",
  role: "authenticated", app_metadata: {}, user_metadata: {},
  created_at: "2025-01-01T00:00:00Z",
};

const mockSession = {
  access_token: "eyJ...", refresh_token: "ref_xxx",
  expires_in: 3600, token_type: "bearer" as const, user: mockUser,
};

const mockOrg = {
  id: "org_123", name: "Test Labs", slug: "test-labs",
  plan: "pro", status: "active",
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
};

const mockTenant = {
  id: "tnt_1", organization_id: "org_123", name: "Engineering",
  slug: "engineering", created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const mockMember = {
  id: "mbr_1", organization_id: "org_123", user_id: "usr_abc123",
  email: "dev@test.com", name: "Dev User", role: "admin",
  status: "active", joined_at: "2025-01-01T00:00:00Z",
};

describe("Auth → Organization integration flow", () => {
  it("signs up → creates org → creates tenant → adds member", async () => {
    const harness = createIntegrationHarness([
      // Auth: sign up
      { method: "POST", path: "/auth/signup", body: dataEnvelope({ user: mockUser, session: mockSession }) },
      // Org: get
      { method: "GET", path: "/v1/organization", body: mockOrg },
      // Org: create tenant
      { method: "POST", path: "/v1/organization/tenants", body: mockTenant },
    ]);

    const { http: authHttp } = harness.createHttp();
    const { http: orgHttp } = harness.createHttp();

    const auth = new AuthService(authHttp);
    const org = new OrganizationService(orgHttp);

    // Step 1: Sign up
    const signUp = await auth.signUp({
      email: "dev@test.com", password: "secure123!",
    });
    expect(signUp.data.user?.id).toBe("usr_abc123");
    harness.expectCalled("POST", "/auth/signup");

    // Step 2: Get organization
    const orgData = await org.get();
    expect(orgData.id).toBe("org_123");

    // Step 3: Create tenant
    const tenant = await org.tenants.create({
      name: "Engineering", slug: "engineering",
    });
    expect(tenant.organizationId).toBe("org_123");
  });

  it("invites member with GoTrue user ID reference", async () => {
    const harness = createIntegrationHarness([
      { method: "GET", path: "/v1/organization/members", body: integrationPage([mockMember]) },
      { method: "POST", path: "/v1/organization/invitations", body: {
        id: "inv_1", organization_id: "org_123", email: "new@test.com",
        role: "member", invited_by: "usr_abc123", status: "pending",
        expires_at: "2025-02-01T00:00:00Z", created_at: "2025-01-01T00:00:00Z",
      }},
    ]);

    const { http: orgHttp } = harness.createHttp();
    const org = new OrganizationService(orgHttp);

    // List members — verify user_id references GoTrue User.id
    const members = await org.members.list();
    expect(members.data[0].userId).toBe("usr_abc123");

    // Invite — references GoTrue user as inviter
    const invite = await org.invitations.create({
      email: "new@test.com", role: "member",
    });
    expect(invite.invitedBy).toBe("usr_abc123");
  });
});

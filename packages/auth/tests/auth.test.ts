import { createTestHttpClient } from "frontal/testing";
import { describe, expect, it } from "vitest";
import { AuthSdk, createAuthClient } from "../src/index";
import {
  MfaEnrollParamsSchema,
  MfaUnenrollParamsSchema,
  SessionSchema,
  SignInWithOtpCredentialsSchema,
  SignInWithPasswordCredentialsSchema,
  SignUpWithPasswordCredentialsSchema,
  UserSchema,
  VerifyOtpParamsSchema,
} from "../src/schemas";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
    headers?: Record<string, string>;
  }[] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  const service = new AuthSdk(http);
  return { service, mock };
}

const mockUser = {
  id: "usr_abc123",
  aud: "authenticated",
  email: "test@frontal.dev",
  role: "authenticated",
  appMetadata: {},
  userMetadata: { name: "Test User" },
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  confirmedAt: "2025-01-01T00:00:00Z",
  lastSignInAt: "2025-01-01T00:00:00Z",
};

const mockSession = {
  accessToken: "eyJhbGciOiJIUzI1NiJ9.xxx",
  refreshToken: "ref_xxx",
  expiresIn: 3600,
  expiresAt: 1_735_689_600,
  tokenType: "bearer" as const,
  user: mockUser,
};

const data = <T>(payload: T) => ({ data: payload, error: null });

describe("AuthService — client-side", () => {
  describe("signUp", () => {
    it("signs up with email and password", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/auth/signup",
          body: data({ user: mockUser, session: mockSession }),
        },
      ]);
      const result = await service.signUp({
        email: "new@frontal.dev",
        password: "secure123!",
      });
      expect(result.data.user).toBeDefined();
      expect(result.data.session).toBeDefined();
      mock.expectCalled("POST", "/auth/signup");
    });

    it("validates required fields", () => {
      const result = SignUpWithPasswordCredentialsSchema.safeParse({
        password: "secure123!",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("signInWithPassword", () => {
    it("signs in with email and password", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/auth/token",
          body: data({ user: mockUser, session: mockSession }),
        },
      ]);
      const result = await service.signInWithPassword({
        email: "test@frontal.dev",
        password: "secure123!",
      });
      expect(result.data.user).toBeDefined();
      expect(result.data.session).toBeDefined();
      mock.expectCalled("POST", "/auth/token");
    });

    it("validates email or phone required", () => {
      const result = SignInWithPasswordCredentialsSchema.safeParse({
        password: "secure123!",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("signInWithOtp", () => {
    it("sends OTP to email", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/auth/otp",
          body: data({ user: null, session: null, messageId: "msg_1" }),
        },
      ]);
      const result = await service.signInWithOtp({
        email: "test@frontal.dev",
      });
      expect(result.data.messageId).toBe("msg_1");
      mock.expectCalled("POST", "/auth/otp");
    });

    it("validates email or phone required", () => {
      const result = SignInWithOtpCredentialsSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("verifyOtp", () => {
    it("verifies email OTP", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/auth/verify",
          body: data({ user: mockUser, session: mockSession }),
        },
      ]);
      const result = await service.verifyOtp({
        email: "test@frontal.dev",
        token: "123456",
        type: "magiclink",
      });
      expect(result.data.user).toBeDefined();
      expect(result.data.session).toBeDefined();
      mock.expectCalled("POST", "/auth/verify");
    });

    it("validates type enum", () => {
      const result = VerifyOtpParamsSchema.safeParse({
        email: "test@frontal.dev",
        token: "123456",
        type: "invalid" as string,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("session management", () => {
    it("gets session", async () => {
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/auth/session",
          body: data({ session: mockSession }),
        },
      ]);
      const result = await service.getSession();
      expect(result.data.session).toBeDefined();
      mock.expectCalled("GET", "/auth/session");
    });

    it("gets user", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/auth/user",
          body: data({ user: mockUser }),
        },
      ]);
      const result = await service.getUser();
      expect(result.data.user).toBeDefined();
      expect(result.data.user.email).toBe("test@frontal.dev");
    });

    it("signs out", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/auth/logout",
          body: { error: null },
        },
      ]);
      const result = await service.signOut();
      expect(result.error).toBeNull();
      mock.expectCalled("POST", "/auth/logout");
    });

    it("refreshes session", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/auth/token",
          body: data({ user: mockUser, session: mockSession }),
        },
      ]);
      const result = await service.refreshSession({
        refresh_token: "ref_xxx",
      });
      expect(result.data.user).toBeDefined();
      mock.expectCalled("POST", "/auth/token");
    });
  });

  describe("MFA (factors)", () => {
    it("enrolls a factor at POST /auth/factors", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/auth/factors",
          body: data({ id: "mfa_1", type: "totp" }),
        },
      ]);
      const result = await service.mfa.enroll({ factorType: "totp" });
      expect(result.data).toBeDefined();
      mock.expectCalled("POST", "/auth/factors");
    });

    it("unenrolls a factor via DELETE /auth/factors/{id}", async () => {
      const { service, mock } = createService([
        { method: "DELETE", path: "/auth/factors/mfa_1", status: 204 },
      ]);
      await service.mfa.unenroll({ factorId: "mfa_1" });
      mock.expectCalled("DELETE", "/auth/factors/mfa_1");
    });

    it("verifies a factor via /auth/factors/{id}/verify", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/auth/factors/mfa_1/verify",
          body: data({ verified: true }),
        },
      ]);
      await service.mfa.verify({
        factorId: "mfa_1",
        challengeId: "ch_1",
        code: "123456",
      });
      mock.expectCalled("POST", "/auth/factors/mfa_1/verify");
    });
  });

  describe("account management", () => {
    it("profile, api-keys, sessions resolve under /auth/account/*", async () => {
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/auth/account/profile",
          body: { id: "usr_1" },
        },
        {
          method: "GET",
          path: "/auth/account/security/api-keys",
          body: { data: [] },
        },
        { method: "GET", path: "/auth/account/sessions", body: { data: [] } },
      ]);
      await service.account.getProfile();
      await service.account.apiKeys.list();
      await service.account.sessions.list();
      mock.expectCalled("GET", "/auth/account/profile");
      mock.expectCalled("GET", "/auth/account/security/api-keys");
      mock.expectCalled("GET", "/auth/account/sessions");
      expect(
        mock.requests.some((r: { path: string }) => r.path.includes("/v1/v1/"))
      ).toBe(false);
    });
  });

  describe("resetPasswordForEmail", () => {
    it("sends password recovery", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/auth/recover",
          body: data({}),
        },
      ]);
      const result = await service.resetPasswordForEmail("test@frontal.dev");
      expect(result.data).toBeDefined();
      mock.expectCalled("POST", "/auth/recover");
    });
  });
});

describe("AuthAdminService — admin operations", () => {
  it("creates a user", async () => {
    const { service, mock } = createService([
      {
        method: "POST",
        path: "/admin/users",
        body: data({ user: mockUser }),
      },
    ]);
    const result = await service.admin.users.create({
      email: "new@frontal.dev",
      password: "secure123!",
    });
    expect(result.data.user).toBeDefined();
    mock.expectCalled("POST", "/admin/users");
  });

  it("lists users (paginated)", async () => {
    const { service, mock } = createService([
      {
        method: "GET",
        path: "/admin/users",
        body: data({
          users: [mockUser],
          aud: "authenticated",
          nextPage: null,
          lastPage: 1,
          total: 1,
        }),
      },
    ]);
    const result = await service.admin.users.list({ page: 1, perPage: 10 });
    expect(result.data.users).toHaveLength(1);
    mock.expectCalled("GET", "/admin/users");
  });

  it("gets user by id", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/admin/users/usr_abc123",
        body: data({ user: mockUser }),
      },
    ]);
    const result = await service.admin.users.get("usr_abc123");
    expect(result.data.user.id).toBe("usr_abc123");
  });

  it("updates user by id", async () => {
    const updated = { ...mockUser, email: "updated@frontal.dev" };
    const { service } = createService([
      {
        method: "PUT",
        path: "/admin/users/usr_abc123",
        body: data({ user: updated }),
      },
    ]);
    const result = await service.admin.users.update("usr_abc123", {
      email: "updated@frontal.dev",
    });
    expect(result.data.user.email).toBe("updated@frontal.dev");
  });

  it("deletes a user", async () => {
    const { service } = createService([
      {
        method: "DELETE",
        path: "/admin/users/usr_abc123",
        body: data({ user: mockUser }),
      },
    ]);
    const result = await service.admin.users.delete("usr_abc123");
    expect(result.data.user).toBeDefined();
  });

  it("invites user by email", async () => {
    const { service, mock } = createService([
      {
        method: "POST",
        path: "/invite",
        body: data({ user: mockUser }),
      },
    ]);
    const result = await service.admin.users.invite("new@frontal.dev");
    expect(result.data.user).toBeDefined();
    mock.expectCalled("POST", "/invite");
  });
});

describe("Schemas validation", () => {
  it("validates User schema", () => {
    const result = UserSchema.safeParse(mockUser);
    expect(result.success).toBe(true);
  });

  it("validates Session schema", () => {
    const result = SessionSchema.safeParse(mockSession);
    expect(result.success).toBe(true);
  });

  it("rejects MFA enroll with invalid factor type", () => {
    const result = MfaEnrollParamsSchema.safeParse({
      factorType: "invalid",
    } as Record<string, unknown>);
    expect(result.success).toBe(false);
  });

  it("accepts MFA unenroll with valid params", () => {
    const result = MfaUnenrollParamsSchema.safeParse({
      factorId: "mfa_1",
    });
    expect(result.success).toBe(true);
  });
});

describe("createAuthClient factory", () => {
  it("creates client from config", () => {
    const client = createAuthClient({
      apiKey: "frt_test-key-1234567890",
      baseUrl: "https://api.test.frontal.dev/auth/v1",
    });
    expect(client).toBeInstanceOf(AuthSdk);
  });
});

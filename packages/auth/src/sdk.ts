import type { HttpClient } from "@frontal-labs/core";
import type {
  AdminUserAttributes,
  AuthOtpResponse,
  AuthResponse,
  AuthTokenResponse,
  GenerateLinkParams,
  GenerateLinkResponse,
  MfaChallengeAndVerifyParams,
  MfaChallengeParams,
  MfaEnrollParams,
  MfaUnenrollParams,
  MfaVerifyParams,
  OAuthResponse,
  PageParams,
  Session,
  SignInAnonymouslyCredentials,
  SignInWithIdTokenCredentials,
  SignInWithOAuthCredentials,
  SignInWithOtpCredentials,
  SignInWithPasswordCredentials,
  SignInWithSSOParams,
  SignUpWithPasswordCredentials,
  SSOResponse,
  UserAttributes,
  UserIdentity,
  UserResponse,
  VerifyOtpParams,
} from "./schemas";
import {
  AdminUserAttributesSchema,
  MfaChallengeAndVerifyParamsSchema,
  MfaChallengeParamsSchema,
  MfaEnrollParamsSchema,
  MfaUnenrollParamsSchema,
  MfaVerifyParamsSchema,
  SignInAnonymouslyCredentialsSchema,
  SignInWithIdTokenCredentialsSchema,
  SignInWithOAuthCredentialsSchema,
  SignInWithOtpCredentialsSchema,
  SignInWithPasswordCredentialsSchema,
  SignInWithSSOParamsSchema,
  SignUpWithPasswordCredentialsSchema,
  UserAttributesSchema,
  VerifyOtpParamsSchema,
} from "./schemas";

export class UsersNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    params?: PageParams
  ): Promise<{ data: { users: unknown[]; aud: string }; error: null }> {
    return this.http.get("/auth/admin/users", params ?? {});
  }

  async get(uid: string): Promise<UserResponse> {
    return this.http.get(`/auth/admin/users/${uid}`);
  }

  async create(attributes: AdminUserAttributes): Promise<UserResponse> {
    const body = AdminUserAttributesSchema.parse(attributes);
    return this.http.post("/auth/admin/users", body);
  }

  async update(
    uid: string,
    attributes: AdminUserAttributes
  ): Promise<UserResponse> {
    const body = AdminUserAttributesSchema.parse(attributes);
    return this.http.put(`/auth/admin/users/${uid}`, body);
  }

  async delete(id: string, shouldSoftDelete?: boolean): Promise<UserResponse> {
    return this.http.delete(`/auth/admin/users/${id}`, {
      shouldSoftDelete,
    });
  }

  async invite(
    email: string,
    options?: { data?: Record<string, unknown>; redirectTo?: string }
  ): Promise<UserResponse> {
    return this.http.post("/auth/invite", { email, ...options });
  }
}

export class InviteNamespace {
  constructor(private readonly http: HttpClient) {}

  async generateLink(
    params: GenerateLinkParams
  ): Promise<GenerateLinkResponse> {
    return this.http.post("/auth/admin/generate_link", params);
  }
}

export class SessionNamespace {
  constructor(private readonly http: HttpClient) {}

  async signOut(
    jwt: string,
    scope?: "global" | "local" | "others"
  ): Promise<{
    data: null;
    error: { message: string; status: number } | null;
  }> {
    return this.http.post("/auth/admin/logout", { jwt, scope });
  }
}

export class AuthAdminService {
  readonly mfa: AdminMfaNamespace;
  readonly users: UsersNamespace;
  readonly invite: InviteNamespace;
  readonly session: SessionNamespace;

  constructor(private readonly http: HttpClient) {
    this.mfa = new AdminMfaNamespace(http);
    this.users = new UsersNamespace(http);
    this.invite = new InviteNamespace(http);
    this.session = new SessionNamespace(http);
  }

  /** @deprecated Use `users.create()` instead */
  async createUser(attributes: AdminUserAttributes): Promise<UserResponse> {
    return this.users.create(attributes);
  }

  /** @deprecated Use `users.list()` instead */
  async listUsers(
    params?: PageParams
  ): Promise<{ data: { users: unknown[]; aud: string }; error: null }> {
    return this.users.list(params);
  }

  /** @deprecated Use `users.get()` instead */
  async getUserById(uid: string): Promise<UserResponse> {
    return this.users.get(uid);
  }

  /** @deprecated Use `users.update()` instead */
  async updateUserById(
    uid: string,
    attributes: AdminUserAttributes
  ): Promise<UserResponse> {
    return this.users.update(uid, attributes);
  }

  /** @deprecated Use `users.delete()` instead */
  async deleteUser(
    id: string,
    shouldSoftDelete?: boolean
  ): Promise<UserResponse> {
    return this.users.delete(id, shouldSoftDelete);
  }

  /** @deprecated Use `users.invite()` instead */
  async inviteUserByEmail(
    email: string,
    options?: { data?: Record<string, unknown>; redirectTo?: string }
  ): Promise<UserResponse> {
    return this.users.invite(email, options);
  }

  /** @deprecated Use `invite.generateLink()` instead */
  async generateLink(
    params: GenerateLinkParams
  ): Promise<GenerateLinkResponse> {
    return this.invite.generateLink(params);
  }

  /** @deprecated Use `session.signOut()` instead */
  async signOut(
    jwt: string,
    scope?: "global" | "local" | "others"
  ): Promise<{
    data: null;
    error: { message: string; status: number } | null;
  }> {
    return this.session.signOut(jwt, scope);
  }
}

class AdminMfaNamespace {
  constructor(private readonly http: HttpClient) {}

  async listFactors(userId: string): Promise<{
    data: { factors: unknown[] };
    error: null;
  }> {
    return this.http.get(`/auth/admin/users/${userId}/factors`);
  }

  async deleteFactor(
    id: string,
    userId: string
  ): Promise<{
    data: { id: string };
    error: null;
  }> {
    return this.http.delete(`/auth/admin/users/${userId}/factors/${id}`);
  }
}

export class MfaNamespace {
  constructor(private readonly http: HttpClient) {}

  async enroll(params: MfaEnrollParams): Promise<unknown> {
    const body = MfaEnrollParamsSchema.parse(params);
    return this.http.post("/auth/factors", body);
  }

  async challenge(params: MfaChallengeParams): Promise<unknown> {
    const body = MfaChallengeParamsSchema.parse(params) as { factorId: string };
    return this.http.post(`/auth/factors/${body.factorId}/challenge`, body);
  }

  async verify(params: MfaVerifyParams): Promise<unknown> {
    const body = MfaVerifyParamsSchema.parse(params) as { factorId: string };
    return this.http.post(`/auth/factors/${body.factorId}/verify`, body);
  }

  async challengeAndVerify(
    params: MfaChallengeAndVerifyParams
  ): Promise<unknown> {
    const body = MfaChallengeAndVerifyParamsSchema.parse(params) as {
      factorId: string;
    };
    return this.http.post(`/auth/factors/${body.factorId}/verify`, body);
  }

  async unenroll(params: MfaUnenrollParams): Promise<unknown> {
    const body = MfaUnenrollParamsSchema.parse(params) as { factorId: string };
    return this.http.delete(`/auth/factors/${body.factorId}`);
  }

  async listFactors(): Promise<unknown> {
    return this.http.get("/auth/factors");
  }
}

type Obj = Record<string, unknown>;

/**
 * Authenticated account self-management (`/api/account/*`, exposed publicly as
 * `/v1/auth/account/*`): profile, password, API keys, devices, MFA factors,
 * sessions, and the account audit log.
 */
export class AccountNamespace {
  readonly apiKeys: AccountApiKeysNamespace;
  readonly devices: AccountDevicesNamespace;
  readonly sessions: AccountSessionsNamespace;
  readonly mfa: AccountMfaNamespace;

  constructor(private readonly http: HttpClient) {
    this.apiKeys = new AccountApiKeysNamespace(http);
    this.devices = new AccountDevicesNamespace(http);
    this.sessions = new AccountSessionsNamespace(http);
    this.mfa = new AccountMfaNamespace(http);
  }

  getProfile(): Promise<Obj> {
    return this.http.get("/auth/account/profile");
  }
  updateProfile(input: Obj): Promise<Obj> {
    return this.http.put("/auth/account/profile", input);
  }
  deleteProfile(): Promise<void> {
    return this.http.delete("/auth/account/profile");
  }
  updatePassword(input: {
    currentPassword?: string;
    newPassword: string;
  }): Promise<Obj> {
    return this.http.post("/auth/account/password", input);
  }
  getAuditLog(opts: Obj = {}): Promise<Obj> {
    return this.http.get("/auth/account/audit-log", opts);
  }
}

class AccountApiKeysNamespace {
  constructor(private readonly http: HttpClient) {}
  list(): Promise<Obj> {
    return this.http.get("/auth/account/security/api-keys");
  }
  create(input: Obj): Promise<Obj> {
    return this.http.post("/auth/account/security/api-keys", input);
  }
  get(keyId: string): Promise<Obj> {
    return this.http.get(`/auth/account/security/api-keys/${keyId}`);
  }
  update(keyId: string, input: Obj): Promise<Obj> {
    return this.http.put(`/auth/account/security/api-keys/${keyId}`, input);
  }
  delete(keyId: string): Promise<void> {
    return this.http.delete(`/auth/account/security/api-keys/${keyId}`);
  }
}

class AccountDevicesNamespace {
  constructor(private readonly http: HttpClient) {}
  list(): Promise<Obj> {
    return this.http.get("/auth/account/security/devices");
  }
  register(input: Obj): Promise<Obj> {
    return this.http.post("/auth/account/security/devices", input);
  }
  get(deviceId: string): Promise<Obj> {
    return this.http.get(`/auth/account/security/devices/${deviceId}`);
  }
  delete(deviceId: string): Promise<void> {
    return this.http.delete(`/auth/account/security/devices/${deviceId}`);
  }
  trust(deviceId: string): Promise<Obj> {
    return this.http.post(
      `/auth/account/security/devices/${deviceId}/trust`,
      {}
    );
  }
}

class AccountSessionsNamespace {
  constructor(private readonly http: HttpClient) {}
  list(): Promise<Obj> {
    return this.http.get("/auth/account/sessions");
  }
  extend(sessionId: string): Promise<Obj> {
    return this.http.post(`/auth/account/sessions/${sessionId}/extend`, {});
  }
  revoke(sessionId: string): Promise<void> {
    return this.http.delete(`/auth/account/sessions/${sessionId}`);
  }
}

class AccountMfaNamespace {
  constructor(private readonly http: HttpClient) {}
  list(): Promise<Obj> {
    return this.http.get("/auth/account/mfa");
  }
  enroll(input: Obj): Promise<Obj> {
    return this.http.post("/auth/account/mfa", input);
  }
  get(factorId: string): Promise<Obj> {
    return this.http.get(`/auth/account/mfa/${factorId}`);
  }
  unenroll(factorId: string): Promise<void> {
    return this.http.delete(`/auth/account/mfa/${factorId}`);
  }
  verify(factorId: string, input: Obj): Promise<Obj> {
    return this.http.post(`/auth/account/mfa/${factorId}/verify`, input);
  }
  challenge(factorId: string): Promise<Obj> {
    return this.http.post(`/auth/account/mfa/${factorId}/challenge`, {});
  }
}

export class AuthSdk {
  readonly mfa: MfaNamespace;
  readonly admin: AuthAdminService;
  readonly account: AccountNamespace;

  constructor(private readonly http: HttpClient) {
    this.mfa = new MfaNamespace(http);
    this.admin = new AuthAdminService(http);
    this.account = new AccountNamespace(http);
  }

  // ── Sign-up / Sign-in ────────────────────────────────────────────

  async signUp(
    credentials: SignUpWithPasswordCredentials
  ): Promise<AuthResponse> {
    const body = SignUpWithPasswordCredentialsSchema.parse(credentials);
    return this.http.post("/auth/signup", body);
  }

  async signInWithPassword(
    credentials: SignInWithPasswordCredentials
  ): Promise<AuthTokenResponse> {
    const body = SignInWithPasswordCredentialsSchema.parse(credentials);
    return this.http.post("/auth/token?grant_type=password", body);
  }

  async signInWithOAuth(
    credentials: SignInWithOAuthCredentials
  ): Promise<OAuthResponse> {
    const body = SignInWithOAuthCredentialsSchema.parse(credentials);
    return this.http.post("/auth/authorize", body);
  }

  async signInWithOtp(
    credentials: SignInWithOtpCredentials
  ): Promise<AuthOtpResponse> {
    const body = SignInWithOtpCredentialsSchema.parse(credentials);
    return this.http.post("/auth/otp", body);
  }

  async signInWithSSO(params: SignInWithSSOParams): Promise<SSOResponse> {
    const body = SignInWithSSOParamsSchema.parse(params);
    return this.http.post("/auth/sso", body);
  }

  async signInWithIdToken(
    credentials: SignInWithIdTokenCredentials
  ): Promise<AuthTokenResponse> {
    const body = SignInWithIdTokenCredentialsSchema.parse(credentials);
    return this.http.post("/auth/token?grant_type=id_token", body);
  }

  async signInAnonymously(
    credentials?: SignInAnonymouslyCredentials
  ): Promise<AuthResponse> {
    const body = credentials
      ? SignInAnonymouslyCredentialsSchema.parse(credentials)
      : {};
    return this.http.post("/auth/signup", { ...body, anonymous: true });
  }

  // ── Verification ─────────────────────────────────────────────────

  async verifyOtp(params: VerifyOtpParams): Promise<AuthResponse> {
    const body = VerifyOtpParamsSchema.parse(params);
    return this.http.post("/auth/verify", body);
  }

  async exchangeCodeForSession(authCode: string): Promise<AuthTokenResponse> {
    return this.http.post("/auth/token?grant_type=pkce", {
      authCode,
    });
  }

  // ── Session Management ───────────────────────────────────────────

  async getSession(): Promise<
    | { data: { session: Session }; error: null }
    | { data: { session: null }; error: null }
  > {
    return this.http.get("/auth/auth/session");
  }

  async getUser(jwt?: string): Promise<UserResponse> {
    const headers: Record<string, string> = {};
    if (jwt) headers.Authorization = `Bearer ${jwt}`;
    return this.http.get("/auth/user");
  }

  async updateUser(
    attributes: UserAttributes,
    options?: { emailRedirectTo?: string }
  ): Promise<UserResponse> {
    const body = UserAttributesSchema.parse(attributes);
    return this.http.put("/auth/user", { ...body, ...options });
  }

  async setSession(currentSession: {
    accessToken: string;
    refreshToken: string;
  }): Promise<AuthResponse> {
    return this.http.post("/auth/auth/session", currentSession);
  }

  async refreshSession(currentSession?: {
    refreshToken: string;
  }): Promise<AuthResponse> {
    return this.http.post(
      "/auth/token?grant_type=refresh_token",
      currentSession ?? {}
    );
  }

  async signOut(options?: {
    scope?: "global" | "local" | "others";
  }): Promise<{ error: { message: string; status: number } | null }> {
    return this.http.post("/auth/logout", options ?? {});
  }

  // ── Password Reset / Email Actions ───────────────────────────────

  async resetPasswordForEmail(
    email: string,
    options?: { redirectTo?: string; captchaToken?: string }
  ): Promise<
    | { data: Record<string, never>; error: null }
    | { data: null; error: { message: string; status: number } }
  > {
    return this.http.post("/auth/recover", { email, ...options });
  }

  async reauthenticate(): Promise<AuthResponse> {
    return this.http.post("/auth/reauthenticate", {});
  }

  async resend(credentials: {
    type: string;
    email?: string;
    phone?: string;
  }): Promise<AuthOtpResponse> {
    return this.http.post("/auth/resend", credentials);
  }

  // ── Identity Management ──────────────────────────────────────────

  async getUserIdentities(): Promise<
    | { data: { identities: UserIdentity[] }; error: null }
    | { data: null; error: { message: string; status: number } }
  > {
    return this.http.get("/auth/user/identities");
  }

  async linkIdentity(
    credentials: SignInWithOAuthCredentials | SignInWithIdTokenCredentials
  ): Promise<OAuthResponse | AuthTokenResponse> {
    return this.http.post("/auth/user/identities", credentials);
  }

  async unlinkIdentity(
    identity: UserIdentity
  ): Promise<
    | { data: Record<string, never>; error: null }
    | { data: null; error: { message: string; status: number } }
  > {
    return this.http.delete(`/auth/user/identities/${identity.identityId}`);
  }

  // ── Auth State / Events ──────────────────────────────────────────

  onAuthStateChange(
    _callback: (event: string, session: Session | null) => void
  ): { data: { subscription: { id: string; unsubscribe: () => void } } } {
    const id = `sub_${Math.random().toString(36).slice(2)}`;
    // Client-side state change is a no-op in server SDK; the caller must
    // implement their own event bus. The returned subscription allows
    // consistent API shape with the browser client.
    return {
      data: {
        subscription: {
          id,
          unsubscribe: () => {},
        },
      },
    };
  }
}

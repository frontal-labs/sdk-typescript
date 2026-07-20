import type { HttpClient } from "frontal/core";
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

/** Admin namespace for managing users. */
export class UsersNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * List all users with optional pagination.
   * @param params - Pagination parameters.
   * @returns A list of users and the audience.
   */
  async list(
    params?: PageParams
  ): Promise<{ data: { users: unknown[]; aud: string }; error: null }> {
    return this.http.get("/auth/admin/users", params ?? {});
  }

  /**
   * Get a user by ID.
   * @param uid - The user's unique identifier.
   * @returns The user or an error.
   */
  async get(uid: string): Promise<UserResponse> {
    return this.http.get(`/auth/admin/users/${uid}`);
  }

  /**
   * Create a new user with admin attributes.
   * @param attributes - Admin-level user attributes.
   * @returns The created user or an error.
   */
  async create(attributes: AdminUserAttributes): Promise<UserResponse> {
    const body = AdminUserAttributesSchema.parse(attributes);
    return this.http.post("/auth/admin/users", body);
  }

  /**
   * Update a user's attributes.
   * @param uid - The user's unique identifier.
   * @param attributes - The attributes to update.
   * @returns The updated user or an error.
   */
  async update(
    uid: string,
    attributes: AdminUserAttributes
  ): Promise<UserResponse> {
    const body = AdminUserAttributesSchema.parse(attributes);
    return this.http.put(`/auth/admin/users/${uid}`, body);
  }

  /**
   * Delete a user, optionally performing a soft delete.
   * @param id - The user's unique identifier.
   * @param shouldSoftDelete - If true, marks the user as deleted without removing them.
   * @returns The result or an error.
   */
  async delete(id: string, shouldSoftDelete?: boolean): Promise<UserResponse> {
    return this.http.delete(`/auth/admin/users/${id}`, {
      shouldSoftDelete,
    });
  }

  /**
   * Invite a user by email.
   * @param email - The email address to invite.
   * @param options - Optional data and redirect URL for the invitation.
   * @returns The invitation result or an error.
   */
  async invite(
    email: string,
    options?: { data?: Record<string, unknown>; redirectTo?: string }
  ): Promise<UserResponse> {
    return this.http.post("/auth/invite", { email, ...options });
  }
}

/** Admin namespace for invitation links. */
export class InviteNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * Generate a magic link for signup, invite, or recovery.
   * @param params - The link generation parameters.
   * @returns The generated link details or an error.
   */
  async generateLink(
    params: GenerateLinkParams
  ): Promise<GenerateLinkResponse> {
    return this.http.post("/auth/admin/generate_link", params);
  }
}

/** Admin namespace for session management. */
export class SessionNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * Sign out a user session.
   * @param jwt - The JWT of the session to sign out.
   * @param scope - Scope of sign-out: "global", "local", or "others".
   * @returns Null data on success or an error.
   */
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

/** Admin service for user, session, MFA, and invite management. */
export class AuthAdminService {
  /** Namespace for admin MFA operations. */
  readonly mfa: AdminMfaNamespace;
  /** Namespace for admin user management. */
  readonly users: UsersNamespace;
  /** Namespace for invitation link generation. */
  readonly invite: InviteNamespace;
  /** Namespace for admin session management. */
  readonly session: SessionNamespace;

  /**
   * @param http - The HTTP client used for API requests.
   */
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

/** Namespace for MFA operations (enroll, challenge, verify, unenroll). */
export class MfaNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * Enroll a new MFA factor.
   * @param params - The enrollment parameters (TOTP, phone, or WebAuthn).
   * @returns The enrollment response.
   */
  async enroll(params: MfaEnrollParams): Promise<unknown> {
    const body = MfaEnrollParamsSchema.parse(params);
    return this.http.post("/auth/factors", body);
  }

  /**
   * Initiate an MFA challenge for a factor.
   * @param params - Contains the factor ID to challenge.
   * @returns The challenge response.
   */
  async challenge(params: MfaChallengeParams): Promise<unknown> {
    const body = MfaChallengeParamsSchema.parse(params) as { factorId: string };
    return this.http.post(`/auth/factors/${body.factorId}/challenge`, body);
  }

  /**
   * Verify an MFA challenge with a code.
   * @param params - The factor ID, challenge ID, and verification code.
   * @returns The verification response.
   */
  async verify(params: MfaVerifyParams): Promise<unknown> {
    const body = MfaVerifyParamsSchema.parse(params) as { factorId: string };
    return this.http.post(`/auth/factors/${body.factorId}/verify`, body);
  }

  /**
   * Challenge and verify an MFA factor in a single step.
   * @param params - The factor ID and verification code.
   * @returns The verification response.
   */
  async challengeAndVerify(
    params: MfaChallengeAndVerifyParams
  ): Promise<unknown> {
    const body = MfaChallengeAndVerifyParamsSchema.parse(params) as {
      factorId: string;
    };
    return this.http.post(`/auth/factors/${body.factorId}/verify`, body);
  }

  /**
   * Unenroll (remove) an MFA factor.
   * @param params - Contains the factor ID to remove.
   * @returns The unenrollment response.
   */
  async unenroll(params: MfaUnenrollParams): Promise<unknown> {
    const body = MfaUnenrollParamsSchema.parse(params) as { factorId: string };
    return this.http.delete(`/auth/factors/${body.factorId}`);
  }

  /**
   * List all enrolled MFA factors for the current user.
   * @returns A list of MFA factors.
   */
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
  /** Namespace for API key management. */
  readonly apiKeys: AccountApiKeysNamespace;
  /** Namespace for device management. */
  readonly devices: AccountDevicesNamespace;
  /** Namespace for session management. */
  readonly sessions: AccountSessionsNamespace;
  /** Namespace for MFA management. */
  readonly mfa: AccountMfaNamespace;

  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {
    this.apiKeys = new AccountApiKeysNamespace(http);
    this.devices = new AccountDevicesNamespace(http);
    this.sessions = new AccountSessionsNamespace(http);
    this.mfa = new AccountMfaNamespace(http);
  }

  /** Get the current user's profile. */
  getProfile(): Promise<Obj> {
    return this.http.get("/auth/account/profile");
  }
  /** Update the current user's profile. */
  updateProfile(input: Obj): Promise<Obj> {
    return this.http.put("/auth/account/profile", input);
  }
  /** Delete the current user's profile. */
  deleteProfile(): Promise<void> {
    return this.http.delete("/auth/account/profile");
  }
  /** Update the current user's password. */
  updatePassword(input: {
    currentPassword?: string;
    newPassword: string;
  }): Promise<Obj> {
    return this.http.post("/auth/account/password", input);
  }
  /** Get the account audit log. */
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

/** Client for Frontal Auth API. Handles authentication, users, sessions, MFA, and admin operations. */
export class AuthSdk {
  /** Namespace for MFA operations. */
  readonly mfa: MfaNamespace;
  /** Namespace for admin operations. */
  readonly admin: AuthAdminService;
  /** Namespace for current user's account management. */
  readonly account: AccountNamespace;

  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {
    this.mfa = new MfaNamespace(http);
    this.admin = new AuthAdminService(http);
    this.account = new AccountNamespace(http);
  }

  // ── Sign-up / Sign-in ────────────────────────────────────────────

  /**
   * Sign up a new user with email/phone and password.
   * @param credentials - Sign-up credentials.
   * @returns The new user and session or an error.
   */
  async signUp(
    credentials: SignUpWithPasswordCredentials
  ): Promise<AuthResponse> {
    const body = SignUpWithPasswordCredentialsSchema.parse(credentials);
    return this.http.post("/auth/signup", body);
  }

  /**
   * Sign in with email/phone and password.
   * @param credentials - Sign-in credentials.
   * @returns A token response containing user and session or an error.
   */
  async signInWithPassword(
    credentials: SignInWithPasswordCredentials
  ): Promise<AuthTokenResponse> {
    const body = SignInWithPasswordCredentialsSchema.parse(credentials);
    return this.http.post("/auth/token?grant_type=password", body);
  }

  /**
   * Sign in with an OAuth provider.
   * @param credentials - OAuth credentials specifying the provider.
   * @returns An OAuth redirect URL or an error.
   */
  async signInWithOAuth(
    credentials: SignInWithOAuthCredentials
  ): Promise<OAuthResponse> {
    const body = SignInWithOAuthCredentialsSchema.parse(credentials);
    return this.http.post("/auth/authorize", body);
  }

  /**
   * Sign in with a one-time password sent via email or phone.
   * @param credentials - OTP credentials.
   * @returns An OTP response with message ID or an error.
   */
  async signInWithOtp(
    credentials: SignInWithOtpCredentials
  ): Promise<AuthOtpResponse> {
    const body = SignInWithOtpCredentialsSchema.parse(credentials);
    return this.http.post("/auth/otp", body);
  }

  /**
   * Sign in with Single Sign-On (SSO).
   * @param params - SSO parameters specifying provider ID or domain.
   * @returns An SSO redirect URL or an error.
   */
  async signInWithSSO(params: SignInWithSSOParams): Promise<SSOResponse> {
    const body = SignInWithSSOParamsSchema.parse(params);
    return this.http.post("/auth/sso", body);
  }

  /**
   * Sign in with a third-party ID token.
   * @param credentials - ID token credentials.
   * @returns A token response or an error.
   */
  async signInWithIdToken(
    credentials: SignInWithIdTokenCredentials
  ): Promise<AuthTokenResponse> {
    const body = SignInWithIdTokenCredentialsSchema.parse(credentials);
    return this.http.post("/auth/token?grant_type=id_token", body);
  }

  /**
   * Sign in anonymously.
   * @param credentials - Optional anonymous credentials with metadata.
   * @returns The anonymous user and session or an error.
   */
  async signInAnonymously(
    credentials?: SignInAnonymouslyCredentials
  ): Promise<AuthResponse> {
    const body = credentials
      ? SignInAnonymouslyCredentialsSchema.parse(credentials)
      : {};
    return this.http.post("/auth/signup", { ...body, anonymous: true });
  }

  // ── Verification ─────────────────────────────────────────────────

  /**
   * Verify a one-time password.
   * @param params - Verification parameters including the OTP and type.
   * @returns The verified user and session or an error.
   */
  async verifyOtp(params: VerifyOtpParams): Promise<AuthResponse> {
    const body = VerifyOtpParamsSchema.parse(params);
    return this.http.post("/auth/verify", body);
  }

  /**
   * Exchange an authorization code for a session (PKCE flow).
   * @param authCode - The authorization code from the OAuth provider.
   * @returns A token response or an error.
   */
  async exchangeCodeForSession(authCode: string): Promise<AuthTokenResponse> {
    return this.http.post("/auth/token?grant_type=pkce", {
      authCode,
    });
  }

  // ── Session Management ───────────────────────────────────────────

  /**
   * Get the current session.
   * @returns The current session or null.
   */
  async getSession(): Promise<
    | { data: { session: Session }; error: null }
    | { data: { session: null }; error: null }
  > {
    return this.http.get("/auth/auth/session");
  }

  /**
   * Get the current user.
   * @param jwt - Optional JWT to override the default authorization.
   * @returns The user or an error.
   */
  async getUser(jwt?: string): Promise<UserResponse> {
    const headers: Record<string, string> = {};
    if (jwt) headers.Authorization = `Bearer ${jwt}`;
    return this.http.get("/auth/user");
  }

  /**
   * Update the current user's attributes.
   * @param attributes - The attributes to update.
   * @param options - Optional redirect URL for email changes.
   * @returns The updated user or an error.
   */
  async updateUser(
    attributes: UserAttributes,
    options?: { emailRedirectTo?: string }
  ): Promise<UserResponse> {
    const body = UserAttributesSchema.parse(attributes);
    return this.http.put("/auth/user", { ...body, ...options });
  }

  /**
   * Set the current session with access and refresh tokens.
   * @param currentSession - The access and refresh tokens.
   * @returns The session result or an error.
   */
  async setSession(currentSession: {
    accessToken: string;
    refreshToken: string;
  }): Promise<AuthResponse> {
    return this.http.post("/auth/auth/session", currentSession);
  }

  /**
   * Refresh the current session using a refresh token.
   * @param currentSession - Optional refresh token.
   * @returns The refreshed session or an error.
   */
  async refreshSession(currentSession?: {
    refreshToken: string;
  }): Promise<AuthResponse> {
    return this.http.post(
      "/auth/token?grant_type=refresh_token",
      currentSession ?? {}
    );
  }

  /**
   * Sign out the current user.
   * @param options - Optional scope of sign-out.
   * @returns An error if sign-out failed, or null on success.
   */
  async signOut(options?: {
    scope?: "global" | "local" | "others";
  }): Promise<{ error: { message: string; status: number } | null }> {
    return this.http.post("/auth/logout", options ?? {});
  }

  // ── Password Reset / Email Actions ───────────────────────────────

  /**
   * Send a password reset email.
   * @param email - The email address to send the reset link to.
   * @param options - Optional redirect URL and captcha token.
   * @returns Empty data on success or an error.
   */
  async resetPasswordForEmail(
    email: string,
    options?: { redirectTo?: string; captchaToken?: string }
  ): Promise<
    | { data: Record<string, never>; error: null }
    | { data: null; error: { message: string; status: number } }
  > {
    return this.http.post("/auth/recover", { email, ...options });
  }

  /**
   * Re-authenticate the current user.
   * @returns The re-authentication result or an error.
   */
  async reauthenticate(): Promise<AuthResponse> {
    return this.http.post("/auth/reauthenticate", {});
  }

  /**
   * Resend a verification email or OTP.
   * @param credentials - The resend type and email/phone.
   * @returns The OTP response or an error.
   */
  async resend(credentials: {
    type: string;
    email?: string;
    phone?: string;
  }): Promise<AuthOtpResponse> {
    return this.http.post("/auth/resend", credentials);
  }

  // ── Identity Management ──────────────────────────────────────────

  /**
   * Get all identities linked to the current user.
   * @returns The user's identities or an error.
   */
  async getUserIdentities(): Promise<
    | { data: { identities: UserIdentity[] }; error: null }
    | { data: null; error: { message: string; status: number } }
  > {
    return this.http.get("/auth/user/identities");
  }

  /**
   * Link an identity from an external provider to the current user.
   * @param credentials - OAuth or ID token credentials.
   * @returns The OAuth redirect URL or token response.
   */
  async linkIdentity(
    credentials: SignInWithOAuthCredentials | SignInWithIdTokenCredentials
  ): Promise<OAuthResponse | AuthTokenResponse> {
    return this.http.post("/auth/user/identities", credentials);
  }

  /**
   * Unlink an identity from the current user.
   * @param identity - The identity to unlink.
   * @returns Empty data on success or an error.
   */
  async unlinkIdentity(
    identity: UserIdentity
  ): Promise<
    | { data: Record<string, never>; error: null }
    | { data: null; error: { message: string; status: number } }
  > {
    return this.http.delete(`/auth/user/identities/${identity.identityId}`);
  }

  // ── Auth State / Events ──────────────────────────────────────────

  /**
   * Register a callback for auth state change events.
   * In the server SDK this is a no-op; the returned subscription object
   * provides API consistency with the browser client.
   * @param _callback - Callback receiving the event type and session.
   * @returns A subscription object with an `unsubscribe` method.
   */
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

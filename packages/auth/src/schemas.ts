import { z } from "zod";

// ── Core Identity ──────────────────────────────────────────────────

/** Zod schema for a user identity linked to an external provider. */
export const UserIdentitySchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    identityId: z.string(),
    provider: z.string(),
    identityData: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.string().optional(),
    lastSignInAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .loose();

/** Zod schema for a multi-factor authentication factor. */
export const FactorSchema = z
  .object({
    id: z.string(),
    friendlyName: z.string().optional(),
    factorType: z.enum(["totp", "phone", "webauthn"]),
    status: z.enum(["verified", "unverified"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose();

export const UserSchema = z
  .object({
    id: z.string(),
    aud: z.string(),
    role: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    appMetadata: z.record(z.string(), z.unknown()).default({}),
    userMetadata: z.record(z.string(), z.unknown()).default({}),
    identities: z.array(UserIdentitySchema).optional(),
    factors: z.array(FactorSchema).optional(),
    isAnonymous: z.boolean().optional(),
    isSsoUser: z.boolean().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    confirmedAt: z.string().optional(),
    emailConfirmedAt: z.string().optional(),
    phoneConfirmedAt: z.string().optional(),
    lastSignInAt: z.string().optional(),
    invitedAt: z.string().optional(),
    actionLink: z.string().optional(),
    confirmationSentAt: z.string().optional(),
    recoverySentAt: z.string().optional(),
    emailChangeSentAt: z.string().optional(),
    newEmail: z.string().optional(),
    newPhone: z.string().optional(),
    deletedAt: z.string().optional(),
  })
  .loose();

// ── Sessions ───────────────────────────────────────────────────────

/** Zod schema for an authentication session containing tokens and user data. */
export const SessionSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
    expiresAt: z.number().optional(),
    tokenType: z.literal("bearer"),
    user: UserSchema,
    providerToken: z.string().nullable().optional(),
    providerRefreshToken: z.string().nullable().optional(),
  })
  .loose();

// ── Credentials ────────────────────────────────────────────────────

/** Zod schema for signing up with email/phone and password. */
export const SignUpWithPasswordCredentialsSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    password: z.string(),
    options: z
      .object({
        emailRedirectTo: z.string().optional(),
        data: z.record(z.string(), z.unknown()).optional(),
        captchaToken: z.string().optional(),
        channel: z.enum(["sms", "whatsapp"]).optional(),
      })
      .optional(),
  })
  .refine((v: { email?: string; phone?: string }) => v.email || v.phone, {
    message: "email or phone required",
  });

/** Zod schema for signing in with email/phone and password. */
export const SignInWithPasswordCredentialsSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    password: z.string(),
    options: z.object({ captchaToken: z.string().optional() }).optional(),
  })
  .refine((v: { email?: string; phone?: string }) => v.email || v.phone, {
    message: "email or phone required",
  });

/** Zod schema for signing in with a one-time password (OTP) sent via email or phone. */
export const SignInWithOtpCredentialsSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    options: z
      .object({
        emailRedirectTo: z.string().optional(),
        shouldCreateUser: z.boolean().optional(),
        data: z.record(z.string(), z.unknown()).optional(),
        captchaToken: z.string().optional(),
        channel: z.enum(["sms", "whatsapp"]).optional(),
      })
      .optional(),
  })
  .refine((v: { email?: string; phone?: string }) => v.email || v.phone, {
    message: "email or phone required",
  });

/** Zod schema for supported OAuth providers. */
export const ProviderSchema = z.enum([
  "apple",
  "azure",
  "bitbucket",
  "discord",
  "facebook",
  "figma",
  "github",
  "gitlab",
  "google",
  "kakao",
  "keycloak",
  "linkedin",
  "linkedin_oidc",
  "notion",
  "slack",
  "slack_oidc",
  "spotify",
  "twitch",
  "twitter",
  "workos",
  "zoom",
  "fly",
]);

/** Zod schema for signing in with an OAuth provider. */
export const SignInWithOAuthCredentialsSchema = z.object({
  provider: ProviderSchema,
  options: z
    .object({
      redirectTo: z.string().optional(),
      scopes: z.string().optional(),
      queryParams: z.record(z.string(), z.string()).optional(),
      skipBrowserRedirect: z.boolean().optional(),
    })
    .optional(),
});

/** Zod schema for signing in with a third-party ID token. */
export const SignInWithIdTokenCredentialsSchema = z.object({
  provider: z.string(),
  token: z.string(),
  accessToken: z.string().optional(),
  nonce: z.string().optional(),
  options: z.object({ captchaToken: z.string().optional() }).optional(),
});

/** Zod schema for signing in with SSO via a provider ID or domain. */
export const SignInWithSSOParamsSchema = z.union([
  z.object({
    providerId: z.string(),
    options: z
      .object({
        redirectTo: z.string().optional(),
        captchaToken: z.string().optional(),
      })
      .optional(),
  }),
  z.object({
    domain: z.string(),
    options: z
      .object({
        redirectTo: z.string().optional(),
        captchaToken: z.string().optional(),
      })
      .optional(),
  }),
]);

/** Zod schema for signing in anonymously. */
export const SignInAnonymouslyCredentialsSchema = z.object({
  options: z
    .object({
      data: z.record(z.string(), z.unknown()).optional(),
      captchaToken: z.string().optional(),
    })
    .optional(),
});

// ── Verification ───────────────────────────────────────────────────

/** Zod schema for email OTP types. */
export const EmailOtpTypeSchema = z.enum([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/** Zod schema for mobile OTP types. */
export const MobileOtpTypeSchema = z.enum(["sms", "phone_change"]);

/** Zod schema for verifying an OTP. */
export const VerifyOtpParamsSchema = z.union([
  z.object({
    phone: z.string(),
    token: z.string(),
    type: MobileOtpTypeSchema,
    options: z
      .object({
        redirectTo: z.string().optional(),
        captchaToken: z.string().optional(),
      })
      .optional(),
  }),
  z.object({
    email: z.string(),
    token: z.string(),
    type: EmailOtpTypeSchema,
    options: z
      .object({
        redirectTo: z.string().optional(),
        captchaToken: z.string().optional(),
      })
      .optional(),
  }),
  z.object({ tokenHash: z.string(), type: EmailOtpTypeSchema }),
]);

// ── User Attributes ────────────────────────────────────────────────

/** Zod schema for updating standard user attributes. */
export const UserAttributesSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  nonce: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

/** Zod schema for admin-only user attributes (includes metadata, ban, role, etc.). */
export const AdminUserAttributesSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  nonce: z.string().optional(),
  userMetadata: z.record(z.string(), z.unknown()).optional(),
  appMetadata: z.record(z.string(), z.unknown()).optional(),
  emailConfirm: z.boolean().optional(),
  phoneConfirm: z.boolean().optional(),
  banDuration: z.string().optional(),
  role: z.string().optional(),
  passwordHash: z.string().optional(),
  id: z.string().optional(),
});

// ── MFA ────────────────────────────────────────────────────────────

/** Zod schema for MFA enrollment parameters (TOTP, phone, or WebAuthn). */
export const MfaEnrollParamsSchema = z.union([
  z.object({
    factorType: z.literal("totp"),
    friendlyName: z.string().optional(),
    issuer: z.string().optional(),
  }),
  z.object({
    factorType: z.literal("phone"),
    friendlyName: z.string().optional(),
    phone: z.string(),
  }),
  z.object({
    factorType: z.literal("webauthn"),
    friendlyName: z.string().optional(),
  }),
]);

/** Zod schema for initiating an MFA challenge. */
export const MfaChallengeParamsSchema = z.object({ factorId: z.string() });

/** Zod schema for verifying an MFA challenge. */
export const MfaVerifyParamsSchema = z.object({
  factorId: z.string(),
  challengeId: z.string(),
  code: z.string(),
});

/** Zod schema for challenging and verifying in a single step. */
export const MfaChallengeAndVerifyParamsSchema = z.object({
  factorId: z.string(),
  code: z.string(),
});

/** Zod schema for unenrolling from an MFA factor. */
export const MfaUnenrollParamsSchema = z.object({ factorId: z.string() });

/** Zod schema for the MFA enrollment response. */
export const MfaEnrollResponseSchema = z.object({
  id: z.string(),
  type: z.enum(["totp", "phone", "webauthn"]),
  friendlyName: z.string().optional(),
  totp: z
    .object({ qrCode: z.string(), secret: z.string(), uri: z.string() })
    .optional(),
  phone: z.string().optional(),
});

/** Zod schema for the MFA challenge response. */
export const MfaChallengeResponseSchema = z.object({
  id: z.string(),
  type: z.enum(["totp", "phone", "webauthn"]),
  expiresAt: z.number(),
});

/** Zod schema for the MFA verification response containing a new session. */
export const MfaVerifyResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("bearer"),
  expiresIn: z.number(),
  refreshToken: z.string(),
  user: UserSchema,
});

/** Zod schema for the list of enrolled MFA factors. */
export const AuthMFAListFactorsResponseSchema = z.object({
  all: z.array(FactorSchema),
  totp: z.array(FactorSchema),
  phone: z.array(FactorSchema),
  webauthn: z.array(FactorSchema),
});

/** Zod schema for the authenticator assurance level (AAL). */
export const AuthenticatorAssuranceLevelSchema = z.object({
  currentLevel: z.enum(["aal1", "aal2"]).nullable(),
  nextLevel: z.enum(["aal1", "aal2"]).nullable(),
  currentAuthenticationMethods: z.array(
    z.object({ method: z.string(), timestamp: z.number() })
  ),
});

// ── Admin ──────────────────────────────────────────────────────────

/** Zod schema for pagination parameters. */
export const PageParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  perPage: z.number().int().positive().optional(),
});

/** Zod schema for pagination metadata. */
export const PaginationSchema = z.object({
  nextPage: z.number().nullable(),
  lastPage: z.number(),
  total: z.number(),
});

/** Zod schema for generating a magic link. */
export const GenerateLinkParamsSchema = z.object({
  type: z.enum([
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change_current",
    "email_change_new",
  ]),
  email: z.string().email(),
  newEmail: z.string().email().optional(),
  options: z
    .object({
      password: z.string().optional(),
      data: z.record(z.string(), z.unknown()).optional(),
      redirectTo: z.string().optional(),
    })
    .optional(),
});

// ── Auth Events ────────────────────────────────────────────────────

/** Zod schema for auth state change event types. */
export const AuthChangeEventSchema = z.enum([
  "INITIAL_SESSION",
  "PASSWORD_RECOVERY",
  "SIGNED_IN",
  "SIGNED_OUT",
  "TOKEN_REFRESHED",
  "USER_UPDATED",
  "MFA_CHALLENGE_VERIFIED",
]);

// ── Config ─────────────────────────────────────────────────────────

/** Zod schema for validating auth client configuration. */
export const authConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

// ── Inferred Types ─────────────────────────────────────────────────

/** A registered user. */
export type User = z.infer<typeof UserSchema>;
/** An authentication session with tokens. */
export type Session = z.infer<typeof SessionSchema>;
/** A user identity linked to an external provider. */
export type UserIdentity = z.infer<typeof UserIdentitySchema>;
/** An MFA factor. */
export type Factor = z.infer<typeof FactorSchema>;
/** Auth state change event type. */
export type AuthChangeEvent = z.infer<typeof AuthChangeEventSchema>;
/** Supported OAuth provider. */
export type Provider = z.infer<typeof ProviderSchema>;
/** Credentials for signing up with email/phone and password. */
export type SignUpWithPasswordCredentials = z.input<
  typeof SignUpWithPasswordCredentialsSchema
>;
/** Credentials for signing in with email/phone and password. */
export type SignInWithPasswordCredentials = z.input<
  typeof SignInWithPasswordCredentialsSchema
>;
/** Credentials for signing in with a one-time password. */
export type SignInWithOtpCredentials = z.input<
  typeof SignInWithOtpCredentialsSchema
>;
/** Credentials for signing in with OAuth. */
export type SignInWithOAuthCredentials = z.input<
  typeof SignInWithOAuthCredentialsSchema
>;
/** Credentials for signing in with an ID token. */
export type SignInWithIdTokenCredentials = z.input<
  typeof SignInWithIdTokenCredentialsSchema
>;
/** Parameters for signing in with SSO. */
export type SignInWithSSOParams = z.input<typeof SignInWithSSOParamsSchema>;
/** Credentials for anonymous sign-in. */
export type SignInAnonymouslyCredentials = z.input<
  typeof SignInAnonymouslyCredentialsSchema
>;
/** Parameters for verifying an OTP. */
export type VerifyOtpParams = z.input<typeof VerifyOtpParamsSchema>;
/** Standard user attributes for update. */
export type UserAttributes = z.input<typeof UserAttributesSchema>;
/** Admin-only user attributes for create/update. */
export type AdminUserAttributes = z.input<typeof AdminUserAttributesSchema>;
/** Parameters for MFA enrollment. */
export type MfaEnrollParams = z.input<typeof MfaEnrollParamsSchema>;
/** Parameters for MFA challenge. */
export type MfaChallengeParams = z.input<typeof MfaChallengeParamsSchema>;
/** Parameters for MFA verification. */
export type MfaVerifyParams = z.input<typeof MfaVerifyParamsSchema>;
/** Parameters for combined MFA challenge and verification. */
export type MfaChallengeAndVerifyParams = z.input<
  typeof MfaChallengeAndVerifyParamsSchema
>;
/** Parameters for MFA unenrollment. */
export type MfaUnenrollParams = z.input<typeof MfaUnenrollParamsSchema>;
/** Pagination query parameters. */
export type PageParams = z.input<typeof PageParamsSchema>;
/** Pagination metadata. */
export type Pagination = z.infer<typeof PaginationSchema>;
/** Parameters for generating a magic link. */
export type GenerateLinkParams = z.input<typeof GenerateLinkParamsSchema>;
/** Email OTP type. */
export type EmailOtpType = z.infer<typeof EmailOtpTypeSchema>;
/** Mobile OTP type. */
export type MobileOtpType = z.infer<typeof MobileOtpTypeSchema>;
/** Validated auth client configuration. */
export type AuthConfig = z.input<typeof authConfigSchema>;

// Response shapes
/** Standard authentication response containing user and session or an error. */
export type AuthResponse =
  | {
      data: { user: User; session: Session } | { user: null; session: null };
      error: null;
    }
  | {
      data: { user: null; session: null };
      error: { message: string; status: number };
    };
/** Token-based authentication response. */
export type AuthTokenResponse =
  | { data: { user: User; session: Session }; error: null }
  | {
      data: { user: null; session: null };
      error: { message: string; status: number };
    };
/** OTP-based authentication response. */
export type AuthOtpResponse =
  | { data: { user: null; session: null; messageId?: string }; error: null }
  | {
      data: { user: null; session: null };
      error: { message: string; status: number };
    };
/** User query/update response. */
export type UserResponse =
  | { data: { user: User }; error: null }
  | { data: { user: null }; error: { message: string; status: number } };
/** OAuth authorization response. */
export type OAuthResponse =
  | { data: { provider: string; url: string }; error: null }
  | {
      data: { provider: string; url: null };
      error: { message: string; status: number };
    };
/** SSO authorization response. */
export type SSOResponse =
  | { data: { url: string }; error: null }
  | { data: { url: null }; error: { message: string; status: number } };
/** Magic link generation response. */
export type GenerateLinkResponse =
  | {
      data: {
        properties: {
          actionLink: string;
          emailOtp: string;
          hashedToken: string;
          redirectTo: string;
          verificationType: string;
        };
        user: User;
      };
      error: null;
    }
  | {
      data: { properties: null; user: null };
      error: { message: string; status: number };
    };

import { z } from "zod";

// ── Core Identity ──────────────────────────────────────────────────

export const UserIdentitySchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    identity_id: z.string(),
    provider: z.string(),
    identity_data: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
    last_sign_in_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const FactorSchema = z
  .object({
    id: z.string(),
    friendly_name: z.string().optional(),
    factor_type: z.enum(["totp", "phone", "webauthn"]),
    status: z.enum(["verified", "unverified"]),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const UserSchema = z
  .object({
    id: z.string(),
    aud: z.string(),
    role: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    app_metadata: z.record(z.string(), z.unknown()).default({}),
    user_metadata: z.record(z.string(), z.unknown()).default({}),
    identities: z.array(UserIdentitySchema).optional(),
    factors: z.array(FactorSchema).optional(),
    is_anonymous: z.boolean().optional(),
    is_sso_user: z.boolean().optional(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    confirmed_at: z.string().optional(),
    email_confirmed_at: z.string().optional(),
    phone_confirmed_at: z.string().optional(),
    last_sign_in_at: z.string().optional(),
    invited_at: z.string().optional(),
    action_link: z.string().optional(),
    confirmation_sent_at: z.string().optional(),
    recovery_sent_at: z.string().optional(),
    email_change_sent_at: z.string().optional(),
    new_email: z.string().optional(),
    new_phone: z.string().optional(),
    deleted_at: z.string().optional(),
  })
  .passthrough();

// ── Sessions ───────────────────────────────────────────────────────

export const SessionSchema = z
  .object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_in: z.number(),
    expires_at: z.number().optional(),
    token_type: z.literal("bearer"),
    user: UserSchema,
    provider_token: z.string().nullable().optional(),
    provider_refresh_token: z.string().nullable().optional(),
  })
  .passthrough();

// ── Credentials ────────────────────────────────────────────────────

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

export const SignInWithIdTokenCredentialsSchema = z.object({
  provider: z.string(),
  token: z.string(),
  access_token: z.string().optional(),
  nonce: z.string().optional(),
  options: z.object({ captchaToken: z.string().optional() }).optional(),
});

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

export const SignInAnonymouslyCredentialsSchema = z.object({
  options: z
    .object({
      data: z.record(z.string(), z.unknown()).optional(),
      captchaToken: z.string().optional(),
    })
    .optional(),
});

// ── Verification ───────────────────────────────────────────────────

export const EmailOtpTypeSchema = z.enum([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export const MobileOtpTypeSchema = z.enum(["sms", "phone_change"]);

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
  z.object({ token_hash: z.string(), type: EmailOtpTypeSchema }),
]);

// ── User Attributes ────────────────────────────────────────────────

export const UserAttributesSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  nonce: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const AdminUserAttributesSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  nonce: z.string().optional(),
  user_metadata: z.record(z.string(), z.unknown()).optional(),
  app_metadata: z.record(z.string(), z.unknown()).optional(),
  email_confirm: z.boolean().optional(),
  phone_confirm: z.boolean().optional(),
  ban_duration: z.string().optional(),
  role: z.string().optional(),
  password_hash: z.string().optional(),
  id: z.string().optional(),
});

// ── MFA ────────────────────────────────────────────────────────────

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

export const MfaChallengeParamsSchema = z.object({ factorId: z.string() });

export const MfaVerifyParamsSchema = z.object({
  factorId: z.string(),
  challengeId: z.string(),
  code: z.string(),
});

export const MfaChallengeAndVerifyParamsSchema = z.object({
  factorId: z.string(),
  code: z.string(),
});

export const MfaUnenrollParamsSchema = z.object({ factorId: z.string() });

export const MfaEnrollResponseSchema = z.object({
  id: z.string(),
  type: z.enum(["totp", "phone", "webauthn"]),
  friendly_name: z.string().optional(),
  totp: z
    .object({ qr_code: z.string(), secret: z.string(), uri: z.string() })
    .optional(),
  phone: z.string().optional(),
});

export const MfaChallengeResponseSchema = z.object({
  id: z.string(),
  type: z.enum(["totp", "phone", "webauthn"]),
  expires_at: z.number(),
});

export const MfaVerifyResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("bearer"),
  expires_in: z.number(),
  refresh_token: z.string(),
  user: UserSchema,
});

export const AuthMFAListFactorsResponseSchema = z.object({
  all: z.array(FactorSchema),
  totp: z.array(FactorSchema),
  phone: z.array(FactorSchema),
  webauthn: z.array(FactorSchema),
});

export const AuthenticatorAssuranceLevelSchema = z.object({
  currentLevel: z.enum(["aal1", "aal2"]).nullable(),
  nextLevel: z.enum(["aal1", "aal2"]).nullable(),
  currentAuthenticationMethods: z.array(
    z.object({ method: z.string(), timestamp: z.number() })
  ),
});

// ── Admin ──────────────────────────────────────────────────────────

export const PageParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  perPage: z.number().int().positive().optional(),
});

export const PaginationSchema = z.object({
  nextPage: z.number().nullable(),
  lastPage: z.number(),
  total: z.number(),
});

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

export const authConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

// ── Inferred Types ─────────────────────────────────────────────────

export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type UserIdentity = z.infer<typeof UserIdentitySchema>;
export type Factor = z.infer<typeof FactorSchema>;
export type AuthChangeEvent = z.infer<typeof AuthChangeEventSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type SignUpWithPasswordCredentials = z.input<
  typeof SignUpWithPasswordCredentialsSchema
>;
export type SignInWithPasswordCredentials = z.input<
  typeof SignInWithPasswordCredentialsSchema
>;
export type SignInWithOtpCredentials = z.input<
  typeof SignInWithOtpCredentialsSchema
>;
export type SignInWithOAuthCredentials = z.input<
  typeof SignInWithOAuthCredentialsSchema
>;
export type SignInWithIdTokenCredentials = z.input<
  typeof SignInWithIdTokenCredentialsSchema
>;
export type SignInWithSSOParams = z.input<typeof SignInWithSSOParamsSchema>;
export type SignInAnonymouslyCredentials = z.input<
  typeof SignInAnonymouslyCredentialsSchema
>;
export type VerifyOtpParams = z.input<typeof VerifyOtpParamsSchema>;
export type UserAttributes = z.input<typeof UserAttributesSchema>;
export type AdminUserAttributes = z.input<typeof AdminUserAttributesSchema>;
export type MfaEnrollParams = z.input<typeof MfaEnrollParamsSchema>;
export type MfaChallengeParams = z.input<typeof MfaChallengeParamsSchema>;
export type MfaVerifyParams = z.input<typeof MfaVerifyParamsSchema>;
export type MfaChallengeAndVerifyParams = z.input<
  typeof MfaChallengeAndVerifyParamsSchema
>;
export type MfaUnenrollParams = z.input<typeof MfaUnenrollParamsSchema>;
export type PageParams = z.input<typeof PageParamsSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type GenerateLinkParams = z.input<typeof GenerateLinkParamsSchema>;
export type EmailOtpType = z.infer<typeof EmailOtpTypeSchema>;
export type MobileOtpType = z.infer<typeof MobileOtpTypeSchema>;
export type AuthConfig = z.input<typeof authConfigSchema>;

// Response shapes
export type AuthResponse =
  | {
      data: { user: User; session: Session } | { user: null; session: null };
      error: null;
    }
  | {
      data: { user: null; session: null };
      error: { message: string; status: number };
    };
export type AuthTokenResponse =
  | { data: { user: User; session: Session }; error: null }
  | {
      data: { user: null; session: null };
      error: { message: string; status: number };
    };
export type AuthOtpResponse =
  | { data: { user: null; session: null; messageId?: string }; error: null }
  | {
      data: { user: null; session: null };
      error: { message: string; status: number };
    };
export type UserResponse =
  | { data: { user: User }; error: null }
  | { data: { user: null }; error: { message: string; status: number } };
export type OAuthResponse =
  | { data: { provider: string; url: string }; error: null }
  | {
      data: { provider: string; url: null };
      error: { message: string; status: number };
    };
export type SSOResponse =
  | { data: { url: string }; error: null }
  | { data: { url: null }; error: { message: string; status: number } };
export type GenerateLinkResponse =
  | {
      data: {
        properties: {
          action_link: string;
          email_otp: string;
          hashed_token: string;
          redirect_to: string;
          verification_type: string;
        };
        user: User;
      };
      error: null;
    }
  | {
      data: { properties: null; user: null };
      error: { message: string; status: number };
    };

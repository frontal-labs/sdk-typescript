import { z } from "zod";

// ── Permission ─────────────────────────────────────────────────────

export const PermissionSchema = z
  .object({
    resource: z.string(),
    action: z.enum(["create", "read", "update", "delete", "admin"]),
    conditions: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// ── Organization ───────────────────────────────────────────────────

export const PlanSchema = z.enum(["free", "starter", "pro", "enterprise"]);

export const OrganizationStatusSchema = z.enum([
  "active",
  "suspended",
  "archived",
]);

export const OrganizationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    avatarUrl: z.string().url().optional(),
    plan: PlanSchema,
    status: OrganizationStatusSchema,
    billingEmail: z.string().email().optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

// ── Tenant ─────────────────────────────────────────────────────────

export const TenantSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

// ── Team ───────────────────────────────────────────────────────────

export const TeamSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    tenantId: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    memberCount: z.number().int(),
    createdAt: z.string(),
  })
  .passthrough();

// ── Member ─────────────────────────────────────────────────────────

export const MemberStatusSchema = z.enum(["active", "invited", "deactivated"]);

export const MemberSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    userId: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
    status: MemberStatusSchema,
    joinedAt: z.string(),
  })
  .passthrough();

// ── Role ───────────────────────────────────────────────────────────

export const RoleSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    permissions: z.array(PermissionSchema),
    isSystem: z.boolean(),
    createdAt: z.string(),
  })
  .passthrough();

// ── Invitation ─────────────────────────────────────────────────────

export const InvitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "expired",
  "cancelled",
]);

export const InvitationSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    email: z.string().email(),
    role: z.string(),
    invitedBy: z.string(),
    status: InvitationStatusSchema,
    expiresAt: z.string(),
    createdAt: z.string(),
  })
  .passthrough();

// ── Member Session ─────────────────────────────────────────────────

export const MemberSessionSchema = z
  .object({
    id: z.string(),
    memberId: z.string(),
    sessionId: z.string(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    lastActivityAt: z.string(),
    createdAt: z.string(),
  })
  .passthrough();

// ── Config ─────────────────────────────────────────────────────────

export const orgConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

// ── Inferred Types ─────────────────────────────────────────────────

export type Permission = z.infer<typeof PermissionSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type OrganizationStatus = z.infer<typeof OrganizationStatusSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type MemberStatus = z.infer<typeof MemberStatusSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;
export type Invitation = z.infer<typeof InvitationSchema>;
export type MemberSession = z.infer<typeof MemberSessionSchema>;
export type OrgConfig = z.input<typeof orgConfigSchema>;

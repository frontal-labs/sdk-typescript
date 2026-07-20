import { z } from "zod";

/** Zod schema for a billing plan. */
export const PlanSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    price: z.number(),
    currency: z.string(),
    interval: z.enum(["monthly", "annual"]),
    features: z.array(z.string()),
    createdAt: z.string(),
  })
  .loose();
/** Zod schema for a subscription. */
export const SubscriptionSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    tenantId: z.string().optional(),
    planId: z.string(),
    status: z.enum(["active", "past_due", "canceled", "trialing"]),
    currentPeriodStart: z.string(),
    currentPeriodEnd: z.string(),
    cancelAtPeriodEnd: z.boolean(),
    createdAt: z.string(),
  })
  .loose();
/** Zod schema for an invoice. */
export const InvoiceSchema = z
  .object({
    id: z.string(),
    subscriptionId: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.enum(["draft", "open", "paid", "void", "uncollectible"]),
    periodStart: z.string(),
    periodEnd: z.string(),
    paidAt: z.string().optional(),
    createdAt: z.string(),
  })
  .loose();
/** Zod schema for a payment method. */
export const PaymentMethodSchema = z
  .object({
    id: z.string(),
    type: z.enum(["card", "bank_transfer", "crypto"]),
    lastFour: z.string().optional(),
    brand: z.string().optional(),
    isDefault: z.boolean(),
    createdAt: z.string(),
  })
  .loose();
/** Zod schema for a usage record. */
export const UsageRecordSchema = z
  .object({
    id: z.string(),
    subscriptionId: z.string(),
    metric: z.string(),
    quantity: z.number(),
    recordedAt: z.string(),
  })
  .loose();
/** Zod schema for validating billing client configuration. */
export const billingConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

/** A billing plan. */
export type Plan = z.infer<typeof PlanSchema>;
/** A subscription to a plan. */
export type Subscription = z.infer<typeof SubscriptionSchema>;
/** An invoice for billing. */
export type Invoice = z.infer<typeof InvoiceSchema>;
/** A payment method. */
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
/** A usage record for metered billing. */
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
/** Validated billing client configuration. */
export type BillingConfig = z.input<typeof billingConfigSchema>;

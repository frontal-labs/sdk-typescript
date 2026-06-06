import { z } from "zod";

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
  .passthrough();
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
  .passthrough();
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
  .passthrough();
export const PaymentMethodSchema = z
  .object({
    id: z.string(),
    type: z.enum(["card", "bank_transfer", "crypto"]),
    lastFour: z.string().optional(),
    brand: z.string().optional(),
    isDefault: z.boolean(),
    createdAt: z.string(),
  })
  .passthrough();
export const UsageRecordSchema = z
  .object({
    id: z.string(),
    subscriptionId: z.string(),
    metric: z.string(),
    quantity: z.number(),
    recordedAt: z.string(),
  })
  .passthrough();
export const billingConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type Plan = z.infer<typeof PlanSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
export type BillingConfig = z.input<typeof billingConfigSchema>;

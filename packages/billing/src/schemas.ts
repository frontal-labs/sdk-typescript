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
    created_at: z.string(),
  })
  .passthrough();
export const SubscriptionSchema = z
  .object({
    id: z.string(),
    organization_id: z.string(),
    tenant_id: z.string().optional(),
    plan_id: z.string(),
    status: z.enum(["active", "past_due", "canceled", "trialing"]),
    current_period_start: z.string(),
    current_period_end: z.string(),
    cancel_at_period_end: z.boolean(),
    created_at: z.string(),
  })
  .passthrough();
export const InvoiceSchema = z
  .object({
    id: z.string(),
    subscription_id: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.enum(["draft", "open", "paid", "void", "uncollectible"]),
    period_start: z.string(),
    period_end: z.string(),
    paid_at: z.string().optional(),
    created_at: z.string(),
  })
  .passthrough();
export const PaymentMethodSchema = z
  .object({
    id: z.string(),
    type: z.enum(["card", "bank_transfer", "crypto"]),
    last_four: z.string().optional(),
    brand: z.string().optional(),
    is_default: z.boolean(),
    created_at: z.string(),
  })
  .passthrough();
export const UsageRecordSchema = z
  .object({
    id: z.string(),
    subscription_id: z.string(),
    metric: z.string(),
    quantity: z.number(),
    recorded_at: z.string(),
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

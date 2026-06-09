import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import { BillingService, createBillingClient, PlanSchema } from "../src/index";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http } = createTestHttpClient(routes);
  return { service: new BillingService(http) };
}

const mockPlan = {
  id: "plan_1",
  name: "Pro",
  price: 99,
  currency: "USD",
  interval: "monthly",
  features: ["unlimited"],
  createdAt: "2025-01-01T00:00:00Z",
};
const mockSub = {
  id: "sub_1",
  organization_id: "org_1",
  plan_id: "plan_1",
  status: "active",
  current_period_start: "2025-01-01T00:00:00Z",
  current_period_end: "2025-02-01T00:00:00Z",
  cancel_at_period_end: false,
  created_at: "2025-01-01T00:00:00Z",
};

function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

describe("BillingService", () => {
  it("lists plans", async () => {
    const { service } = createService([
      { method: "GET", path: "/billing/plans", body: { data: [mockPlan] } },
    ]);
    const result = await service.plans.list();
    expect(result.data).toHaveLength(1);
  });
  it("gets subscription", async () => {
    const { service } = createService([
      { method: "GET", path: "/billing/subscription", body: mockSub },
    ]);
    const result = await service.subscriptions.get();
    expect(result.id).toBe("sub_1");
  });
  it("cancels subscription", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/billing/subscription/cancel",
        body: { ...mockSub, status: "canceled" },
      },
    ]);
    const result = await service.subscriptions.cancel();
    expect(result.status).toBe("canceled");
  });
  it("lists invoices (paginated)", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/billing/invoices",
        body: pageWrap([
          {
            id: "inv_1",
            subscription_id: "sub_1",
            amount: 99,
            currency: "USD",
            status: "paid",
            period_start: "",
            period_end: "",
            created_at: "",
          },
        ]),
      },
    ]);
    const result = await service.invoices.list();
    expect(result.data).toHaveLength(1);
  });
  it("reports usage", async () => {
    const { service } = createService([
      { method: "POST", path: "/billing/usage", body: { ingested: 2 } },
    ]);
    const result = await service.usage.report([
      { metric: "api_calls", quantity: 100 },
    ]);
    expect(result.ingested).toBe(2);
  });
  it("adds payment method", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/billing/payment-methods",
        body: {
          id: "pm_1",
          type: "card",
          last_four: "4242",
          is_default: true,
          created_at: "",
        },
      },
    ]);
    const result = await service.paymentMethods.create({
      type: "card",
      token: "tok_xxx",
    });
    expect(result.id).toBe("pm_1");
  });
});

describe("Schemas", () => {
  it("validates Plan", () => {
    expect(PlanSchema.safeParse(mockPlan).success).toBe(true);
  });
});

describe("createBillingClient", () => {
  it("creates client", () => {
    expect(createBillingClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      BillingService
    );
  });
});

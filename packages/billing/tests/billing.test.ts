import { createTestHttpClient } from "frontal/testing";
import { describe, expect, it } from "vitest";
import { BillingSdk, createBillingClient, PlanSchema } from "../src/index";

function _createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http } = createTestHttpClient(routes);
  return { service: new BillingSdk(http) };
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

function createSvcMock(
  routes: Parameters<typeof createTestHttpClient>[0] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new BillingSdk(http), mock };
}

describe("BillingSdk", () => {
  it("customers: list/get + entitlements + portal", async () => {
    const { service, mock } = createSvcMock([
      {
        method: "GET",
        path: "/billing/customers",
        body: pageWrap([{ id: "cus_1" }]),
      },
      {
        method: "GET",
        path: "/billing/customers/cus_1",
        body: { id: "cus_1" },
      },
      {
        method: "GET",
        path: "/billing/customers/cus_1/entitlements",
        body: { data: [] },
      },
    ]);
    expect((await service.customers.list()).data).toHaveLength(1);
    expect((await service.customers.get("cus_1")).id).toBe("cus_1");
    await service.customers.entitlements("cus_1");
    mock.expectCalled("GET", "/billing/customers/cus_1/entitlements");
    expect(
      mock.requests.some((r: { path: string }) => r.path.includes("/v1/v1/"))
    ).toBe(false);
  });

  it("plans: list + clone", async () => {
    const { service, mock } = createSvcMock([
      { method: "GET", path: "/billing/plans", body: pageWrap([mockPlan]) },
      { method: "POST", path: "/billing/plans/plan_1/clone", body: mockPlan },
    ]);
    expect((await service.plans.list()).data).toHaveLength(1);
    await service.plans.clone("plan_1");
    mock.expectCalled("POST", "/billing/plans/plan_1/clone");
  });

  it("subscriptions: create + cancel/pause/resume (plural path)", async () => {
    const { service, mock } = createSvcMock([
      { method: "POST", path: "/billing/subscriptions", body: mockSub },
      {
        method: "POST",
        path: "/billing/subscriptions/sub_1/cancel",
        body: { ...mockSub, status: "canceled" },
      },
    ]);
    const created = await service.subscriptions.create({ planId: "plan_1" });
    expect(created.id).toBe("sub_1");
    const canceled = await service.subscriptions.cancel("sub_1");
    expect(canceled.status).toBe("canceled");
    mock.expectCalled("POST", "/billing/subscriptions");
    mock.expectCalled("POST", "/billing/subscriptions/sub_1/cancel");
  });

  it("invoices: list + finalize + void", async () => {
    const { service, mock } = createSvcMock([
      {
        method: "GET",
        path: "/billing/invoices",
        body: pageWrap([{ id: "inv_1", status: "draft" }]),
      },
      {
        method: "POST",
        path: "/billing/invoices/inv_1/finalize",
        body: { id: "inv_1", status: "open" },
      },
    ]);
    expect((await service.invoices.list()).data).toHaveLength(1);
    const f = await service.invoices.finalize("inv_1");
    expect(f.status).toBe("open");
    mock.expectCalled("POST", "/billing/invoices/inv_1/finalize");
  });

  it("wallets: top-up + real-time balance", async () => {
    const { service, mock } = createSvcMock([
      {
        method: "POST",
        path: "/billing/wallets/wal_1/top-up",
        body: { id: "wal_1" },
      },
      {
        method: "GET",
        path: "/billing/wallets/wal_1/balance/real-time",
        body: { balance: 100 },
      },
    ]);
    await service.wallets.topUp("wal_1", { amount: 50 });
    const bal = await service.wallets.realTimeBalance("wal_1");
    expect(bal.balance).toBe(100);
    mock.expectCalled("POST", "/billing/wallets/wal_1/top-up");
    mock.expectCalled("GET", "/billing/wallets/wal_1/balance/real-time");
  });

  it("meters/prices/addons resources resolve at /billing/*", async () => {
    const { service, mock } = createSvcMock([
      { method: "POST", path: "/billing/meters/met_1/disable", body: {} },
      {
        method: "GET",
        path: "/billing/prices/lookup/pro-monthly",
        body: { id: "price_1" },
      },
      { method: "GET", path: "/billing/addons", body: pageWrap([]) },
    ]);
    await service.meters.disable("met_1");
    const p = await service.prices.lookup("pro-monthly");
    expect(p.id).toBe("price_1");
    await service.addons.list();
    mock.expectCalled("GET", "/billing/prices/lookup/pro-monthly");
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
      BillingSdk
    );
  });
});

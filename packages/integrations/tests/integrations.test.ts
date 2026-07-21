import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  IntegrationsSdk,
  createIntegrationsClient,
  Integration,
  providerSlugSchema,
  installedIntegrationSchema,
  actionRunSchema,
  connectionTestSchema,
} from "../src/index";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new IntegrationsSdk(http), mock };
}

const mockIntegration = {
  id: "int_1",
  provider: "stripe",
  tenantId: "tnt_1",
  displayName: "Stripe Production",
  status: "active",
  config: { accountId: "acct_123" },
  auth: { scheme: "api_key", secretRef: "sec_1" },
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-02T00:00:00Z",
  version: 1,
};

const mockProvider = {
  slug: "stripe",
  displayName: "Stripe",
  description: "Payment processing",
  authScheme: "api_key",
  configSchema: {},
  supportedSurfaces: ["agents", "workflows"],
  capabilities: [
    {
      key: "stripe.create_payment",
      surface: "agents",
      mode: "write",
      title: "Create Payment",
      description: "Create a Stripe payment",
      inputSchema: {},
    },
  ],
};

const mockActionRun = {
  id: "ar_1",
  integrationId: "int_1",
  surface: "agents",
  action: "stripe.create_payment",
  status: "succeeded",
  input: { amount: 1000, currency: "usd" },
  output: { paymentId: "pi_123" },
  startedAt: "2025-01-03T00:00:00Z",
  finishedAt: "2025-01-03T00:00:01Z",
};

const mockConnectionTest = {
  id: "ct_1",
  integrationId: "int_1",
  status: "succeeded",
  message: "Connection successful",
  startedAt: "2025-01-03T00:00:00Z",
  finishedAt: "2025-01-03T00:00:02Z",
};

const mockCapability = {
  integrationId: "int_1",
  key: "stripe.create_payment",
  surface: "agents",
  enabled: true,
  mode: "write",
  updatedAt: "2025-01-03T00:00:00Z",
};

const mockSurface = {
  integrationId: "int_1",
  surface: "agents",
  enabled: true,
  updatedAt: "2025-01-03T00:00:00Z",
};

// ---------------------------------------------------------------------------
// IntegrationsSdk

describe("IntegrationsSdk", () => {
  describe("providers", () => {
    it("list() returns providers", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/providers",
          body: { providers: [mockProvider] },
        },
      ]);
      const result = await service.providers.list();
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("stripe");
    });

    it("get() returns a single provider", async () => {
      const { service } = createService([
        { method: "GET", path: "/providers/stripe", body: mockProvider },
      ]);
      const result = await service.providers.get("stripe");
      expect(result.slug).toBe("stripe");
    });
  });

  describe("create()", () => {
    it("returns an Integration handle", async () => {
      const { service } = createService([
        { method: "POST", path: "/integrations", body: mockIntegration },
      ]);
      const inst = await service.create({
        provider: "stripe",
        tenantId: "tnt_1",
        displayName: "Stripe Production",
        config: {},
        auth: { scheme: "api_key", secretRef: "sec_1" },
      });
      expect(inst).toBeInstanceOf(Integration);
      expect(inst.id).toBe("int_1");
    });
  });

  describe("get()", () => {
    it("returns an Integration handle", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/integrations/int_1",
          body: mockIntegration,
        },
      ]);
      const inst = await service.get("int_1");
      expect(inst).toBeInstanceOf(Integration);
    });
  });

  describe("list()", () => {
    it("returns PageResult", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/integrations",
          body: { integrations: [mockIntegration], total: 1 },
        },
      ]);
      const page = await service.list({ tenantId: "tnt_1" });
      expect(page.data).toHaveLength(1);
    });
  });

  describe("replay()", () => {
    it("replays an action run", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/action-runs/ar_1/replay",
          body: mockActionRun,
        },
      ]);
      const result = await service.replay("ar_1");
      expect(result.id).toBe("ar_1");
    });
  });

  describe("actionRun()", () => {
    it("gets an action run globally", async () => {
      const { service } = createService([
        { method: "GET", path: "/action-runs/ar_1", body: mockActionRun },
      ]);
      const result = await service.actionRun("ar_1");
      expect(result.id).toBe("ar_1");
    });
  });

  describe("test()", () => {
    it("gets a connection test globally", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/connection-tests/ct_1",
          body: mockConnectionTest,
        },
      ]);
      const result = await service.test("ct_1");
      expect(result.id).toBe("ct_1");
    });
  });

  describe("diagnostics()", () => {
    it("returns diagnostics", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/diagnostics",
          body: { repository: "postgres" },
        },
      ]);
      const result = await service.diagnostics();
      expect(result.repository).toBe("postgres");
    });
  });

  describe("governance()", () => {
    it("returns summary", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/governance/summary",
          body: { activeIntegrations: 10 },
        },
      ]);
      const result = await service.governance();
      expect(result.activeIntegrations).toBe(10);
    });
  });

  describe("policy", () => {
    it("simulate() checks scopes", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/policy/simulate",
          body: { allowed: true },
        },
      ]);
      const result = await service.policy.simulate(["integrations.read"]);
      expect(result.allowed).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Integration handle
// ---------------------------------------------------------------------------

describe("Integration", () => {
  function createInst(
    routes: {
      method: string;
      path: string | RegExp;
      status?: number;
      body?: unknown;
    }[] = []
  ) {
    const { http, mock } = createTestHttpClient(routes);
    const inst = new Integration(
      http,
      "int_1",
      "stripe",
      "tnt_1",
      "Stripe Prod",
      "active",
      {},
      { scheme: "api_key", secretRef: "sec_1" },
      1
    );
    return { inst, mock };
  }

  describe("lifecycle", () => {
    it("update()", async () => {
      const { inst } = createInst([
        {
          method: "PATCH",
          path: "/integrations/int_1",
          body: { ...mockIntegration, displayName: "New" },
        },
      ]);
      const result = await inst.update({ displayName: "New" });
      expect(result.displayName).toBe("New");
    });

    it("remove()", async () => {
      const { inst } = createInst([
        {
          method: "DELETE",
          path: "/integrations/int_1",
          body: { deleted: true },
        },
      ]);
      const result = await inst.remove();
      expect(result.deleted).toBe(true);
    });

    it("reload()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/integrations/int_1",
          body: { ...mockIntegration, status: "error" },
        },
      ]);
      const result = await inst.reload();
      expect(result.status).toBe("error");
    });

    it("validate()", async () => {
      const { inst } = createInst([
        {
          method: "POST",
          path: "/integrations/int_1/validate-configuration",
          body: { valid: true, message: "ok", integration: mockIntegration },
        },
      ]);
      const result = await inst.validate();
      expect(result.valid).toBe(true);
    });

    it("rotateSecret()", async () => {
      const { inst } = createInst([
        {
          method: "POST",
          path: "/integrations/int_1/rotate-secret",
          body: mockIntegration,
        },
      ]);
      const result = await inst.rotateSecret("sec_new");
      expect(result.id).toBe("int_1");
    });

    it("metrics()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/integrations/int_1/metrics",
          body: {
            integrationId: "int_1",
            connectionTestsByStatus: {},
            actionRunsByStatus: {},
            enabledCapabilities: 3,
            enabledSurfaces: 1,
          },
        },
      ]);
      const result = await inst.metrics();
      expect(result.enabledCapabilities).toBe(3);
    });
  });

  describe("run", () => {
    it("run.create()", async () => {
      const { inst } = createInst([
        {
          method: "POST",
          path: "/integrations/int_1/action-runs",
          body: mockActionRun,
        },
      ]);
      const result = await inst.run.create("stripe.create_payment", {
        amount: 1000,
      });
      expect(result.id).toBe("ar_1");
    });

    it("run.list()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/integrations/int_1/action-runs",
          body: { actionRuns: [mockActionRun], total: 1 },
        },
      ]);
      const page = await inst.run.list();
      expect(page.data).toHaveLength(1);
    });

    it("run.get()", async () => {
      const { inst } = createInst([
        { method: "GET", path: "/action-runs/ar_1", body: mockActionRun },
      ]);
      const result = await inst.run.get("ar_1");
      expect(result.id).toBe("ar_1");
    });
  });

  describe("test", () => {
    it("test.create()", async () => {
      const { inst } = createInst([
        {
          method: "POST",
          path: "/integrations/int_1/connection-tests",
          body: mockConnectionTest,
        },
      ]);
      const result = await inst.test.create();
      expect(result.status).toBe("succeeded");
    });

    it("test.list()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/integrations/int_1/connection-tests",
          body: { connectionTests: [mockConnectionTest], total: 1 },
        },
      ]);
      const page = await inst.test.list();
      expect(page.data).toHaveLength(1);
    });

    it("test.get()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/connection-tests/ct_1",
          body: mockConnectionTest,
        },
      ]);
      const result = await inst.test.get("ct_1");
      expect(result.id).toBe("ct_1");
    });
  });

  describe("capabilities", () => {
    it("list()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/integrations/int_1/capabilities",
          body: { capabilities: [mockCapability], total: 1 },
        },
      ]);
      const page = await inst.capabilities.list();
      expect(page.data).toHaveLength(1);
    });

    it("enable()", async () => {
      const { inst } = createInst([
        {
          method: "PUT",
          path: "/integrations/int_1/capabilities/stripe.create_payment",
          body: mockCapability,
        },
      ]);
      const result = await inst.capabilities.enable("stripe.create_payment");
      expect(result.enabled).toBe(true);
    });

    it("disable()", async () => {
      const disabled = { ...mockCapability, enabled: false };
      const { inst } = createInst([
        {
          method: "PUT",
          path: "/integrations/int_1/capabilities/stripe.create_payment",
          body: disabled,
        },
      ]);
      const result = await inst.capabilities.disable("stripe.create_payment");
      expect(result.enabled).toBe(false);
    });

    it("bulkSet()", async () => {
      const { inst } = createInst([
        {
          method: "PUT",
          path: "/integrations/int_1/capabilities:bulk",
          body: { capabilities: [mockCapability], total: 1 },
        },
      ]);
      const result = await inst.capabilities.bulkSet([
        { capabilityKey: "stripe.create_payment", enabled: true },
      ]);
      expect(result.total).toBe(1);
    });
  });

  describe("surfaces", () => {
    it("list()", async () => {
      const { inst } = createInst([
        {
          method: "GET",
          path: "/integrations/int_1/surfaces",
          body: { surfaces: [mockSurface] },
        },
      ]);
      const result = await inst.surfaces.list();
      expect(result).toHaveLength(1);
    });

    it("enable()", async () => {
      const { inst } = createInst([
        {
          method: "PUT",
          path: "/integrations/int_1/surfaces/agents",
          body: mockSurface,
        },
      ]);
      const result = await inst.surfaces.enable("agents");
      expect(result.enabled).toBe(true);
    });

    it("disable()", async () => {
      const disabled_ = { ...mockSurface, enabled: false };
      const { inst } = createInst([
        {
          method: "PUT",
          path: "/integrations/int_1/surfaces/agents",
          body: disabled_,
        },
      ]);
      const result = await inst.surfaces.disable("agents");
      expect(result.enabled).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

describe("Schemas", () => {
  it("validates provider slug", () => {
    expect(providerSlugSchema.safeParse("stripe").success).toBe(true);
    expect(providerSlugSchema.safeParse("linear").success).toBe(true);
  });

  it("validates installed integration", () => {
    expect(installedIntegrationSchema.safeParse(mockIntegration).success).toBe(
      true
    );
  });

  it("validates action run", () => {
    expect(actionRunSchema.safeParse(mockActionRun).success).toBe(true);
  });

  it("validates connection test", () => {
    expect(connectionTestSchema.safeParse(mockConnectionTest).success).toBe(
      true
    );
  });
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

describe("Factory", () => {
  it("creates IntegrationsSdk", () => {
    expect(createIntegrationsClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      IntegrationsSdk
    );
  });
});

import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  FlagsService,
  createFlagsClient,
  FlagSchema,
  RolloutSchema,
  ExperimentSchema,
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
  const service = new FlagsService(http);
  return { service, mock };
}

function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

const mockFlag: Record<string, unknown> = {
  id: "flag_1",
  key: "new-dashboard",
  name: "New Dashboard",
  type: "boolean",
  defaultValue: false,
  status: "active",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const mockRollout: Record<string, unknown> = {
  id: "roll_1",
  flagId: "flag_1",
  percentage: 50,
  value: true,
  status: "active",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const mockExperiment: Record<string, unknown> = {
  id: "exp_1",
  flagId: "flag_1",
  name: "Dashboard A/B Test",
  variants: [
    { name: "control", value: false, percentage: 50 },
    { name: "treatment", value: true, percentage: 50 },
  ],
  status: "draft",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("FlagsService", () => {
  describe("evaluate", () => {
    it("evaluates a single flag", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/flags/evaluate",
          body: { value: true, reason: "targeting_match" },
        },
      ]);
      const result = await service.evaluate("new-dashboard", {
        userId: "usr_1",
      });
      expect(result.value).toBe(true);
    });

    it("evaluates multiple flags", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/flags/evaluate/bulk",
          body: {
            "new-dashboard": {
              flag_key: "new-dashboard",
              value: true,
              reason: "default",
              source: "default",
            },
          },
        },
      ]);
      const result = await service.evaluateBulk(["new-dashboard"], {
        userId: "usr_1",
      });
      expect(result["new-dashboard"].value).toBe(true);
    });
  });

  describe("flags", () => {
    it("lists flags (paginated)", async () => {
      const { service } = createService([
        {
          method: "GET",
          path: "/v1/flags",
          body: pageWrap([mockFlag]),
        },
      ]);
      const result = await service.list();
      expect(result.data).toHaveLength(1);
    });

    it("creates a flag", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/flags",
          body: mockFlag,
        },
      ]);
      const result = await service.create({
        key: "new-dashboard",
        name: "New Dashboard",
        type: "boolean",
        defaultValue: false,
      });
      expect(result.key).toBe("new-dashboard");
    });

    it("toggles a flag", async () => {
      const disabled = { ...mockFlag, status: "inactive" };
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/flags/flag_1/toggle",
          body: disabled,
        },
      ]);
      const result = await service.toggle("flag_1", false);
      expect(result.status).toBe("inactive");
    });
  });

  describe("rollouts", () => {
    it("creates a rollout", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/flags/flag_1/rollouts",
          body: mockRollout,
        },
      ]);
      const result = await service.rollouts.create("flag_1", {
        percentage: 50,
        value: true,
      });
      expect(result.percentage).toBe(50);
    });

    it("pauses a rollout", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/flags/flag_1/rollouts/roll_1/pause",
          body: { ...mockRollout, status: "paused" },
        },
      ]);
      const result = await service.rollouts.pause("flag_1", "roll_1");
      expect(result.status).toBe("paused");
    });
  });

  describe("experiments", () => {
    it("starts an experiment", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/flags/experiments/exp_1/start",
          body: { ...mockExperiment, status: "running" },
        },
      ]);
      const result = await service.experiments.start("exp_1");
      expect(result.status).toBe("running");
    });

    it("stops an experiment", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/v1/flags/experiments/exp_1/stop",
          body: { ...mockExperiment, status: "stopped" },
        },
      ]);
      const result = await service.experiments.stop("exp_1");
      expect(result.status).toBe("stopped");
    });
  });
});

describe("Schemas validation", () => {
  it("validates Flag schema", () => {
    expect(FlagSchema.safeParse(mockFlag).success).toBe(true);
  });

  it("validates Rollout schema", () => {
    expect(RolloutSchema.safeParse(mockRollout).success).toBe(true);
  });

  it("validates Experiment schema", () => {
    expect(ExperimentSchema.safeParse(mockExperiment).success).toBe(true);
  });
});

describe("createFlagsClient factory", () => {
  it("creates client from config", () => {
    const client = createFlagsClient({
      apiKey: "frt_test-key-1234567890",
    });
    expect(client).toBeInstanceOf(FlagsService);
  });
});

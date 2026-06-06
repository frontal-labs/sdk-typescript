import { describe, expect, it } from "vitest";
import {
  evaluateFlag,
  evaluateFlagWithRollout,
  hashContext,
  matchesRule,
} from "../src/evaluator";
import type { Flag, EvaluationContext, TargetingRule } from "../src/schemas";

const mockFlag: Flag = {
  id: "flag_1",
  key: "test-flag",
  name: "Test Flag",
  type: "boolean",
  defaultValue: false,
  status: "active",
  createdAt: "",
  updatedAt: "",
};

const context: EvaluationContext = {
  userId: "usr_1",
  attributes: { region: "us-east", beta: true, plan: "enterprise" },
};

describe("hashContext", () => {
  it("returns a deterministic value 0-99", () => {
    const h1 = hashContext("flag1", context);
    const h2 = hashContext("flag1", context);
    expect(h1).toBe(h2);
    expect(h1).toBeGreaterThanOrEqual(0);
    expect(h1).toBeLessThan(100);
  });

  it("produces different hashes for different keys", () => {
    const h1 = hashContext("flag-a", context);
    const h2 = hashContext("flag-b", context);
    expect(h1).not.toBe(h2);
  });
});

describe("matchesRule", () => {
  it("matches eq operator", () => {
    const rule: TargetingRule = {
      id: "r1",
      flagId: "f1",
      attribute: "region",
      operator: "eq",
      value: "us-east",
      priority: 1,
    };
    expect(matchesRule(rule, context)).toBe(true);
  });

  it("rejects ne operator on match", () => {
    const rule: TargetingRule = {
      id: "r1",
      flagId: "f1",
      attribute: "region",
      operator: "ne",
      value: "us-west",
      priority: 1,
    };
    expect(matchesRule(rule, context)).toBe(true);
  });

  it("matches in operator", () => {
    const rule: TargetingRule = {
      id: "r1",
      flagId: "f1",
      attribute: "plan",
      operator: "in",
      value: ["enterprise", "pro"],
      priority: 1,
    };
    expect(matchesRule(rule, context)).toBe(true);
  });

  it("matches starts_with operator", () => {
    const rule: TargetingRule = {
      id: "r1",
      flagId: "f1",
      attribute: "region",
      operator: "starts_with",
      value: "us-",
      priority: 1,
    };
    expect(matchesRule(rule, context)).toBe(true);
  });

  it("rejects missing attribute", () => {
    const rule: TargetingRule = {
      id: "r1",
      flagId: "f1",
      attribute: "nonexistent",
      operator: "eq",
      value: "x",
      priority: 1,
    };
    expect(matchesRule(rule, context)).toBe(false);
  });
});

describe("evaluateFlag", () => {
  it("returns default when no rules match", () => {
    const result = evaluateFlag(mockFlag, context, []);
    expect(result.value).toBe(false);
    expect(result.source).toBe("default");
  });

  it("matches highest priority rule", () => {
    const rules: TargetingRule[] = [
      {
        id: "r1",
        flagId: "f1",
        attribute: "region",
        operator: "eq",
        value: "us-east",
        priority: 1,
      },
      {
        id: "r2",
        flagId: "f1",
        attribute: "plan",
        operator: "eq",
        value: "enterprise",
        priority: 10,
      },
    ];
    const result = evaluateFlag(mockFlag, context, rules);
    expect(result.reason).toBe("matched_rule:r2");
    expect(result.source).toBe("targeting");
  });
});

describe("evaluateFlagWithRollout", () => {
  it("respects rollout percentage", () => {
    const flag: Flag = { ...mockFlag, key: "always-true-flag" };
    const result = evaluateFlagWithRollout(flag, context, [], 100, true);
    expect(result.value).toBe(true);
    expect(result.source).toBe("rollout");
  });

  it("falls back to rules when rollout is 0", () => {
    const rules: TargetingRule[] = [
      {
        id: "r1",
        flagId: "f1",
        attribute: "region",
        operator: "eq",
        value: "us-east",
        priority: 1,
      },
    ];
    const result = evaluateFlagWithRollout(mockFlag, context, rules, 0);
    expect(result.source).toBe("targeting");
  });
});

describe("FlagCache", () => {
  it("stores and retrieves flags", async () => {
    const { FlagCache } = await import("../src/cache");
    const cache = new FlagCache({ ttlMs: 60_000 });
    cache.set(mockFlag, []);
    expect(cache.get("test-flag")).toBeDefined();
    expect(cache.size).toBe(1);
  });

  it("invalidates expired entries", async () => {
    const { FlagCache } = await import("../src/cache");
    const cache = new FlagCache({ ttlMs: 1 });
    cache.set(mockFlag, []);
    await new Promise((r) => setTimeout(r, 2));
    expect(cache.get("test-flag")).toBeUndefined();
  });
});

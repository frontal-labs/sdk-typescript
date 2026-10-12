import { describe, expect, it } from "vitest";
import {
  allowRule,
  commonPolicies,
  conditions,
  definePolicy,
  denyRule,
  LocalPolicyEngine,
  PolicyViolationError,
} from "../src/index";

const engine = new LocalPolicyEngine();

describe("LocalPolicyEngine", () => {
  describe("path resolution", () => {
    it("resolves nested dot paths", () => {
      const policy = definePolicy({
        id: "p",
        name: "p",
        rules: [
          denyRule(
            "r",
            "function",
            "create",
            conditions.equals("body.name", "bad")
          ),
        ],
      });
      expect(engine.evaluate(policy, { body: { name: "bad" } }).passed).toBe(
        false
      );
      expect(engine.evaluate(policy, { body: { name: "good" } }).passed).toBe(
        true
      );
    });

    it("supports the input. prefix", () => {
      const policy = definePolicy({
        id: "p",
        name: "p",
        rules: [
          denyRule(
            "r",
            "function",
            "create",
            conditions.equals("input.body.env", "prod")
          ),
        ],
      });
      expect(engine.evaluate(policy, { body: { env: "prod" } }).passed).toBe(
        false
      );
    });

    it("matches any element with the [_] wildcard", () => {
      const policy = commonPolicies.aiBudgetLimit(10);
      const input = {
        capabilities: [
          { name: "kv", kind: { kv: {} } },
          { name: "chat", kind: { ai: true }, budget: { maxCostUsd: 25 } },
        ],
      };
      expect(engine.evaluate(policy, input).passed).toBe(false);
    });

    it("does not match the wildcard when no element qualifies", () => {
      const policy = commonPolicies.aiBudgetLimit(10);
      const input = {
        capabilities: [
          { name: "chat", kind: { ai: true }, budget: { maxCostUsd: 5 } },
        ],
      };
      expect(engine.evaluate(policy, input).passed).toBe(true);
    });
  });

  describe("matchers", () => {
    const policyFor = (cond: Record<string, unknown>) =>
      definePolicy({
        id: "p",
        name: "p",
        rules: [denyRule("r", "function", "create", cond)],
      });

    it("$gt / $gte / $lt / $lte compare numbers", () => {
      const gt = policyFor(conditions.gt("body.n", 10));
      expect(engine.evaluate(gt, { body: { n: 11 } }).passed).toBe(false);
      expect(engine.evaluate(gt, { body: { n: 10 } }).passed).toBe(true);
      const lte = policyFor(conditions.lte("body.n", 10));
      expect(engine.evaluate(lte, { body: { n: 10 } }).passed).toBe(false);
    });

    it("coerces numeric strings", () => {
      const gt = policyFor(conditions.gt("body.n", 10));
      expect(engine.evaluate(gt, { body: { n: "42" } }).passed).toBe(false);
    });

    it("$in / $nin check membership", () => {
      const inP = policyFor(conditions.in("body.env", ["prod", "staging"]));
      expect(engine.evaluate(inP, { body: { env: "prod" } }).passed).toBe(
        false
      );
      expect(engine.evaluate(inP, { body: { env: "dev" } }).passed).toBe(true);
    });

    it("$contains checks substring", () => {
      const p = policyFor(
        conditions.contains("body.secrets[_]", "PRODUCTION_")
      );
      expect(
        engine.evaluate(p, { body: { secrets: ["PRODUCTION_DB"] } }).passed
      ).toBe(false);
      expect(engine.evaluate(p, { body: { secrets: ["DEV_DB"] } }).passed).toBe(
        true
      );
    });

    it("$matches checks regex", () => {
      const p = policyFor(conditions.matches("body.name", "^payment-.*"));
      expect(
        engine.evaluate(p, { body: { name: "payment-charge" } }).passed
      ).toBe(false);
      expect(engine.evaluate(p, { body: { name: "other" } }).passed).toBe(true);
    });

    it("$exists checks presence and absence", () => {
      const present = policyFor(conditions.exists("body.token", true));
      expect(engine.evaluate(present, { body: { token: "x" } }).passed).toBe(
        false
      );
      expect(engine.evaluate(present, { body: {} }).passed).toBe(true);
      const absent = policyFor(conditions.exists("body.idempotencyKey", false));
      expect(engine.evaluate(absent, { body: {} }).passed).toBe(false);
      expect(
        engine.evaluate(absent, { body: { idempotencyKey: "k" } }).passed
      ).toBe(true);
    });

    it("bare true/false are truthy/falsy", () => {
      const t = policyFor({ "body.enabled": true });
      expect(engine.evaluate(t, { body: { enabled: true } }).passed).toBe(
        false
      );
      expect(engine.evaluate(t, { body: { enabled: false } }).passed).toBe(
        true
      );
    });
  });

  describe("decision model", () => {
    it("guardrail policy (only deny rules) allows everything else", () => {
      const policy = commonPolicies.memoryLimit(512);
      expect(engine.evaluate(policy, { body: { memory: 64 } }).passed).toBe(
        true
      );
      expect(engine.evaluate(policy, { body: { memory: 9999 } }).passed).toBe(
        false
      );
    });

    it("allow-list policy denies when no allow rule matches", () => {
      const policy = definePolicy({
        id: "p",
        name: "p",
        rules: [
          allowRule(
            "a",
            "ai",
            "chat",
            conditions.equals("body.action", "chat")
          ),
        ],
      });
      expect(engine.evaluate(policy, { body: { action: "chat" } }).passed).toBe(
        true
      );
      expect(
        engine.evaluate(policy, { body: { action: "delete" } }).passed
      ).toBe(false);
    });

    it("deny wins over allow in a mixed policy", () => {
      const policy = definePolicy({
        id: "p",
        name: "p",
        rules: [
          allowRule("a", "ai", "chat"),
          denyRule("d", "ai", "chat", conditions.equals("body.blocked", true)),
        ],
      });
      expect(engine.evaluate(policy, { body: { blocked: true } }).passed).toBe(
        false
      );
      expect(engine.evaluate(policy, { body: {} }).passed).toBe(true);
    });

    it("a rule with no conditions always fires", () => {
      const policy = definePolicy({
        id: "p",
        name: "p",
        rules: [denyRule("r", "*", "*")],
      });
      expect(engine.evaluate(policy, { anything: 1 }).passed).toBe(false);
    });
  });

  describe("evaluateAll", () => {
    it("passes only when every policy passes", () => {
      const a = commonPolicies.memoryLimit(512);
      const b = commonPolicies.timeoutLimit(30);
      expect(
        engine.evaluateAll([a, b], { body: { memory: 100, timeout: 10 } })
          .passed
      ).toBe(true);
      expect(
        engine.evaluateAll([a, b], { body: { memory: 100, timeout: 90 } })
          .passed
      ).toBe(false);
    });
  });

  describe("warmup", () => {
    it("validates regex patterns and rejects invalid ones", async () => {
      const good = definePolicy({
        id: "p",
        name: "p",
        rules: [
          denyRule(
            "r",
            "function",
            "create",
            conditions.matches("body.name", "^ok")
          ),
        ],
      });
      await expect(engine.warmup(good)).resolves.toBeUndefined();

      const bad = definePolicy({
        id: "p",
        name: "p",
        rules: [
          denyRule("r", "function", "create", {
            "body.name": { $matches: "(" },
          }),
        ],
      });
      await expect(engine.warmup(bad)).rejects.toThrow();
    });
  });
});

describe("PolicyViolationError", () => {
  it("carries policyId and failed rule reasons", () => {
    const policy = commonPolicies.memoryLimit(10);
    const result = engine.evaluate(policy, { body: { memory: 999 } });
    expect(result.passed).toBe(false);
    const error = new PolicyViolationError(result.policyId, result.ruleResults);
    expect(error).toBeInstanceOf(Error);
    expect(error.policyId).toBe("memory-limit");
    expect(error.message).toContain("Memory limit of 10MB exceeded");
  });
});

import { describe, expect, it } from "vitest";
import { validateCronLocal, nextCronRunsLocal } from "../src/cron";

describe("validateCronLocal", () => {
  it("validates standard cron expressions", () => {
    expect(validateCronLocal("0 9 * * 1-5").valid).toBe(true);
    expect(validateCronLocal("*/5 * * * *").valid).toBe(true);
    expect(validateCronLocal("0 0 1 * *").valid).toBe(true);
    expect(validateCronLocal("30 14 * * 0").valid).toBe(true);
    expect(validateCronLocal("* * * * *").valid).toBe(true);
    expect(validateCronLocal("0 */6 * * *").valid).toBe(true);
    expect(validateCronLocal("0 9,17 * * 1-5").valid).toBe(true);
  });

  it("rejects invalid expressions", () => {
    const invalid = validateCronLocal("60 * * * *");
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toContain("minute");

    const tooFew = validateCronLocal("* * * *");
    expect(tooFew.valid).toBe(false);
    expect(tooFew.error).toContain("5 fields");

    const empty = validateCronLocal("");
    expect(empty.valid).toBe(false);
  });

  it("provides a human-readable description", () => {
    const everyMin = validateCronLocal("* * * * *");
    expect(everyMin.description).toBe("Every minute");

    const daily = validateCronLocal("0 9 * * *");
    expect(daily.description).toContain("hour 9");
  });
});

describe("nextCronRunsLocal", () => {
  it("returns next run times for a cron expression", () => {
    const runs = nextCronRunsLocal("*/30 * * * *", 3);
    expect(runs).toHaveLength(3);
    const first = runs[0];
    expect(first.getSeconds()).toBe(0);
  });

  it("returns empty array for invalid expression", () => {
    expect(nextCronRunsLocal("invalid", 3)).toHaveLength(0);
  });
});

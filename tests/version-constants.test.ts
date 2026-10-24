import { describe, expect, it } from "vitest";
import { readVersionConstants } from "../scripts/sync-versions";

describe("package version constants", () => {
  const constants = readVersionConstants();

  it("finds the version constant in every package that defines one", () => {
    expect(constants.length).toBeGreaterThan(0);
  });

  for (const c of constants) {
    it(`${c.packageName} ${c.constantName} matches package.json`, () => {
      expect(c.current).toBe(c.expected);
    });
  }
});

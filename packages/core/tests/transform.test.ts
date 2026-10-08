import { describe, expect, it } from "vitest";
import { camelToSnake } from "../src/transform";

describe("camelToSnake", () => {
  it.each([
    ["camelCase", "camel_case"],
    ["ssoUser", "sso_user"],
    ["SSOUser", "sso_user"],
    ["FOOBar", "foo_bar"],
  ])("converts %s to %s", (input, expected) => {
    expect(camelToSnake(input)).toBe(expected);
  });

  it("handles long uppercase input", () => {
    const input = "A".repeat(50_000);

    expect(camelToSnake(input)).toBe("a".repeat(50_000));
  });
});

import { describe, expect, it } from "vitest";
import { redactRequestInit } from "../src/http";

const SECRET = "Bearer sk_live_1234567890abcdef";

function authOf(init: RequestInit): string | null {
  const headers = init.headers;
  if (!headers || Array.isArray(headers) || headers instanceof Headers) {
    throw new Error("expected a plain header object after redaction");
  }
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "authorization"
  );
  return entry?.[1] ?? null;
}

describe("redactRequestInit", () => {
  it("masks the bearer token in a plain header object, keeping the scheme", () => {
    const out = redactRequestInit({ headers: { Authorization: SECRET } });
    expect(authOf(out)).toBe("Bearer [REDACTED]");
  });

  it("masks the bearer token in a header tuple list", () => {
    const out = redactRequestInit({
      headers: [["Authorization", SECRET]],
    });
    expect(authOf(out)).toBe("Bearer [REDACTED]");
  });

  it("masks the bearer token in a Headers instance", () => {
    const out = redactRequestInit({
      headers: new Headers({ Authorization: SECRET }),
    });
    expect(authOf(out)).toBe("Bearer [REDACTED]");
  });

  it("masks a non-bearer credential entirely", () => {
    const out = redactRequestInit({
      headers: [["authorization", "Basic dXNlcjpwYXNz"]],
    });
    expect(authOf(out)).toBe("[REDACTED]");
  });

  it("leaves a request without headers unchanged", () => {
    const init: RequestInit = { method: "GET" };
    expect(redactRequestInit(init)).toBe(init);
  });
});

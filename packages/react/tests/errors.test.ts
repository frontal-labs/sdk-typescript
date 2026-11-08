import { describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_FALLBACK, getPublicMessage } from "../src/errors";

describe("getPublicMessage", () => {
  it("returns the server-approved public message", () => {
    const error = Object.assign(new Error("API key frt_live_LEAK is wrong"), {
      public: { message: "Too many requests." },
    });
    expect(getPublicMessage(error)).toBe("Too many requests.");
  });

  it("never returns the developer message when no public message is set", () => {
    const error = new Error("API key frt_live_LEAK is wrong");
    expect(getPublicMessage(error)).toBe(DEFAULT_PUBLIC_FALLBACK);
    expect(getPublicMessage(error)).not.toContain("LEAK");
  });

  it("uses a caller-supplied fallback", () => {
    expect(getPublicMessage(undefined, "Try again.")).toBe("Try again.");
    expect(getPublicMessage("plain string", "Try again.")).toBe("Try again.");
  });

  it("treats a blank public message as absent", () => {
    expect(getPublicMessage({ public: { message: "   " } })).toBe(
      DEFAULT_PUBLIC_FALLBACK
    );
  });
});

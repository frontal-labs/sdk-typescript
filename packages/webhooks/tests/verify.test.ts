import { describe, expect, it } from "vitest";
import { verifyWebhookSignature, extractWebhookEvent } from "../src/verify";

const secret = "whsec_test_12345";
const payload = JSON.stringify({ event: "test", id: 1 });

function sign(payload: string, secret: string, timestamp?: number): string {
  const crypto = require("crypto") as typeof import("crypto");
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signed = `${payload}.${ts}`;
  const sig = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  return `t=${ts},v1=${sig}`;
}

describe("verifyWebhookSignature", () => {
  it("verifies a valid signature", () => {
    const header = sign(payload, secret);
    const result = verifyWebhookSignature(payload, header, secret);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid signature", () => {
    const header = sign(payload, "wrong_secret");
    const result = verifyWebhookSignature(payload, header, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Signature mismatch");
  });

  it("rejects expired timestamp", () => {
    const oldTs = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const header = sign(payload, secret, oldTs);
    const result = verifyWebhookSignature(payload, header, secret, 300_000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Timestamp outside tolerance");
  });

  it("rejects missing signature", () => {
    const result = verifyWebhookSignature(payload, "", secret);
    expect(result.valid).toBe(false);
  });

  it("accepts raw hex signature without timestamp", () => {
    const crypto = require("crypto") as typeof import("crypto");
    const sig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const result = verifyWebhookSignature(payload, sig, secret);
    expect(result.valid).toBe(true);
  });
});

describe("extractWebhookEvent", () => {
  it("verifies and parses payload", () => {
    const header = sign(payload, secret);
    const result = extractWebhookEvent<{ event: string; id: number }>(
      payload,
      header,
      secret
    );
    expect(result.valid).toBe(true);
    expect(result.event?.event).toBe("test");
    expect(result.event?.id).toBe(1);
  });

  it("returns error on invalid JSON", () => {
    const header = sign("not json", secret);
    const result = extractWebhookEvent("not json", header, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid JSON payload");
  });
});

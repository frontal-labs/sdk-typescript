import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { extractWebhookEvent, verifyWebhookSignature } from "../src/verify";

const secret = "whsec_test_12345";
const payload = JSON.stringify({ event: "test", id: 1 });

function sign(payload: string, secret: string, timestamp?: number): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signed = `${payload}.${ts}`;
  const sig = createHmac("sha256", secret).update(signed).digest("hex");
  return `t=${ts},v1=${sig}`;
}

describe("verifyWebhookSignature", () => {
  it("verifies a valid signature", async () => {
    const header = sign(payload, secret);
    const result = await verifyWebhookSignature(payload, header, secret);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid signature", async () => {
    const header = sign(payload, "wrong_secret");
    const result = await verifyWebhookSignature(payload, header, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Signature mismatch");
  });

  it("rejects expired timestamp", async () => {
    const oldTs = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const header = sign(payload, secret, oldTs);
    const result = await verifyWebhookSignature(
      payload,
      header,
      secret,
      300_000
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Timestamp outside tolerance");
  });

  it("rejects missing signature", async () => {
    const result = await verifyWebhookSignature(payload, "", secret);
    expect(result.valid).toBe(false);
  });

  it("accepts raw hex signature without timestamp", async () => {
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    const result = await verifyWebhookSignature(payload, sig, secret);
    expect(result.valid).toBe(true);
  });

  it("rejects malformed signatures and partial timestamps", async () => {
    await expect(
      verifyWebhookSignature(payload, "v1=not-hex", secret)
    ).resolves.toMatchObject({ valid: false });
    await expect(
      verifyWebhookSignature(payload, `t=123x,v1=${"0".repeat(64)}`, secret)
    ).resolves.toMatchObject({ valid: false, error: "Invalid timestamp" });
  });
});

describe("extractWebhookEvent", () => {
  it("verifies and parses payload", async () => {
    const header = sign(payload, secret);
    const result = await extractWebhookEvent<{ event: string; id: number }>(
      payload,
      header,
      secret
    );
    expect(result.valid).toBe(true);
    expect(result.event?.event).toBe("test");
    expect(result.event?.id).toBe(1);
  });

  it("returns error on invalid JSON", async () => {
    const header = sign("not json", secret);
    const result = await extractWebhookEvent("not json", header, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid JSON payload");
  });
});

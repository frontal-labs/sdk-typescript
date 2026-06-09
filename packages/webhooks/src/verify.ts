/**
 * Verifies an incoming webhook payload signature using HMAC-SHA256.
 *
 * Supports the standard webhook signing pattern:
 *   HMAC-SHA256(payload + "." + timestamp, secret)
 *
 * The signature header is expected to be "t=<timestamp>,v1=<signature>" format,
 * or a raw hex-encoded HMAC.
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceMs = 300_000
): { valid: boolean; error?: string } {
  if (!(payload && signatureHeader && secret)) {
    return { valid: false, error: "Missing payload, signature, or secret" };
  }

  // Parse standard "t=<ts>,v1=<sig>" format
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) {
      parts.v1 = part.trim();
    } else {
      parts[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
  }

  const signature = parts.v1;
  const timestamp = parts.t;

  if (!signature) {
    return { valid: false, error: "No signature found in header" };
  }

  // Timestamp tolerance check (anti-replay)
  if (timestamp) {
    const ts = Number.parseInt(timestamp, 10);
    if (Number.isNaN(ts)) {
      return { valid: false, error: `Invalid timestamp: ${timestamp}` };
    }
    if (Math.abs(Date.now() - ts * 1000) > toleranceMs) {
      return {
        valid: false,
        error: `Timestamp outside tolerance (${toleranceMs}ms)`,
      };
    }
  }

  const crypto = require("crypto") as typeof import("crypto");
  const signedPayload = timestamp ? `${payload}.${timestamp}` : payload;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  const valid = timingSafeEqual(expected, signature);

  return valid
    ? { valid: true }
    : { valid: false, error: "Signature mismatch" };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies and extracts a typed event from an incoming webhook payload.
 * Combines signature verification with JSON parsing in one call.
 */
export function extractWebhookEvent<T = Record<string, unknown>>(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceMs?: number
): { valid: boolean; event?: T; error?: string } {
  const verify = verifyWebhookSignature(
    payload,
    signatureHeader,
    secret,
    toleranceMs
  );
  if (!verify.valid) {
    return verify;
  }

  try {
    const event = JSON.parse(payload) as T;
    return { valid: true, event };
  } catch {
    return { valid: false, error: "Invalid JSON payload" };
  }
}

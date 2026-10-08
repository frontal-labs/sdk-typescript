/**
 * Verifies an incoming webhook payload signature using Web Crypto HMAC-SHA256.
 *
 * Supports the timestamped format `t=<unix-seconds>,v1=<hex-signature>` and
 * legacy raw hex signatures. Timestamped signatures include the timestamp after
 * the payload, separated by a period. Raw signatures do not provide replay
 * protection.
 *
 * @param payload - The raw webhook request body as a string.
 * @param signatureHeader - The `Signature` header value.
 * @param secret - The shared signing secret.
 * @param toleranceMs - Timestamp tolerance in milliseconds (default 300s).
 * @returns A promise with the signature verification result.
 */
export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceMs = 300_000
): Promise<{ valid: boolean; error?: string }> {
  if (!(payload && signatureHeader && secret)) {
    return { valid: false, error: "Missing payload, signature, or secret" };
  }

  const parts = new Map<string, string>();
  for (const part of signatureHeader.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      parts.set("v1", part.trim());
    } else {
      parts.set(
        part.slice(0, separator).trim(),
        part.slice(separator + 1).trim()
      );
    }
  }

  const signature = parts.get("v1");
  const timestamp = parts.get("t");
  if (!signature) {
    return { valid: false, error: "No signature found in header" };
  }

  if (timestamp !== undefined) {
    if (!/^\d+$/.test(timestamp)) {
      return { valid: false, error: "Invalid timestamp" };
    }
    const timestampMs = Number(timestamp) * 1000;
    if (
      !Number.isSafeInteger(timestampMs) ||
      Math.abs(Date.now() - timestampMs) > toleranceMs
    ) {
      return {
        valid: false,
        error: `Timestamp outside tolerance (${toleranceMs}ms)`,
      };
    }
  }

  const signatureBytes = decodeHexSignature(signature);
  if (!signatureBytes) {
    return { valid: false, error: "Signature must be 64-character hex" };
  }

  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle) {
    return { valid: false, error: "Web Crypto is unavailable in this runtime" };
  }

  const key = await webCrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signedPayload = timestamp ? `${payload}.${timestamp}` : payload;
  const valid = await webCrypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(signedPayload)
  );

  return valid
    ? { valid: true }
    : { valid: false, error: "Signature mismatch" };
}

function decodeHexSignature(
  signature: string
): Uint8Array<ArrayBuffer> | undefined {
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return undefined;

  const bytes = new Uint8Array(new ArrayBuffer(32));
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(
      signature.slice(index * 2, index * 2 + 2),
      16
    );
  }
  return bytes;
}

/**
 * Verifies a webhook signature and parses the JSON event.
 *
 * @param payload - The raw webhook request body as a string.
 * @param signatureHeader - The `Signature` header value.
 * @param secret - The shared signing secret.
 * @param toleranceMs - Timestamp tolerance in milliseconds (default 300s).
 * @returns A promise with the validity result and, on success, the parsed event.
 */
export async function extractWebhookEvent<T = Record<string, unknown>>(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceMs?: number
): Promise<{ valid: boolean; event?: T; error?: string }> {
  const verify = await verifyWebhookSignature(
    payload,
    signatureHeader,
    secret,
    toleranceMs
  );
  if (!verify.valid) return verify;

  try {
    const event = JSON.parse(payload) as T;
    return { valid: true, event };
  } catch {
    return { valid: false, error: "Invalid JSON payload" };
  }
}

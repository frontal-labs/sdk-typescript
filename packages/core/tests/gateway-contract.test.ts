/**
 * Behaviour the AI gateway's contract requires: its nested error envelope, its
 * plain-text auth refusals, the `Idempotency-Key` header on writes, and response
 * keys that must come back exactly as sent.
 */

import { describe, expect, it } from "vitest";
import { FrontalError } from "../src/errors";
import { HttpClient } from "../src/http";

const base = {
  apiKey: "frt_test1234567890",
  baseUrl: "https://api.test/v1",
  timeout: 1000,
  maxRetries: 0,
  retryDelay: 0,
  headers: {},
  environment: "test",
  debug: false,
};

function clientReturning(
  response: () => Response,
  seen?: { headers?: Headers }
) {
  return new HttpClient({
    ...base,
    fetch: async (_input, init) => {
      if (seen) seen.headers = new Headers(init?.headers);
      return response();
    },
  });
}

describe("nested gateway error envelope", () => {
  it("maps {error:{message,code}} to the typed error with its code", async () => {
    const http = clientReturning(
      () =>
        new Response(
          JSON.stringify({
            error: {
              message: "vocabulary is not served",
              type: "invalid_request_error",
              param: null,
              code: "unknown_vocabulary",
            },
          }),
          { status: 400, headers: { "x-request-id": "req_9" } }
        )
    );
    const error = (await http
      .post("/x", {})
      .catch((e: unknown) => e)) as FrontalError;
    expect(error).toBeInstanceOf(FrontalError);
    expect(error.code).toBe("unknown_vocabulary");
    expect(error.message).toBe("vocabulary is not served");
    expect(error.requestId).toBe("req_9");
  });

  it("keeps the message of a plain-text refusal instead of a generic one", async () => {
    const http = clientReturning(
      () => new Response("missing credential", { status: 401 })
    );
    const error = (await http
      .get("/x")
      .catch((e: unknown) => e)) as FrontalError;
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("missing credential");
  });
});

describe("Idempotency-Key header", () => {
  it("is sent when the call supplies a key", async () => {
    const seen: { headers?: Headers } = {};
    const http = clientReturning(() => Response.json({ ok: true }), seen);
    await http.post("/x", {}, undefined, { idempotencyKey: "key-123" });
    expect(seen.headers?.get("Idempotency-Key")).toBe("key-123");
  });

  it("is absent when no key is supplied", async () => {
    const seen: { headers?: Headers } = {};
    const http = clientReturning(() => Response.json({ ok: true }), seen);
    await http.post("/x", {});
    expect(seen.headers?.get("Idempotency-Key")).toBeNull();
  });
});

describe("preserveKeys", () => {
  it("copies named top-level keys through exactly, and camelCases the rest", async () => {
    const http = clientReturning(() =>
      Response.json({
        request_id: "r1",
        parameters: { invoice_id: "INV-1", order_total: 9 },
      })
    );
    const result = await http.post<{
      requestId: string;
      parameters: Record<string, unknown>;
    }>("/x", {}, undefined, { preserveKeys: ["parameters"] });
    expect(result.requestId).toBe("r1");
    expect(result.parameters).toEqual({ invoice_id: "INV-1", order_total: 9 });
  });

  it("camelCases a top-level key that is not preserved", async () => {
    const http = clientReturning(() =>
      Response.json({ parameters: { invoice_id: "INV-1" } })
    );
    const result = await http.post<{ parameters: Record<string, unknown> }>(
      "/x",
      {}
    );
    expect(result.parameters).toEqual({ invoiceId: "INV-1" });
  });
});

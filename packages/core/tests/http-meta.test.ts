/**
 * Behaviour the ontology layer relies on: a 412 maps to its own error class,
 * `detail` becomes the message when a code is present, response headers can
 * be read, and a response body can be returned exactly as sent.
 */

import { describe, expect, it } from "vitest";
import { type FrontalError, PreconditionFailedError } from "../src/errors";
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

function clientReturning(response: () => Response) {
  return new HttpClient({
    ...base,
    fetch: async () => response(),
  });
}

describe("412 Precondition Failed", () => {
  it("maps to PreconditionFailedError with status 412 and its code", async () => {
    const http = clientReturning(
      () =>
        new Response(
          JSON.stringify({
            code: "PRECONDITION_FAILED",
            detail: "revision changed",
            current_revision: 4,
          }),
          { status: 412 }
        )
    );
    const error = (await http
      .put("/x", {})
      .catch((e: unknown) => e)) as FrontalError;
    expect(error).toBeInstanceOf(PreconditionFailedError);
    expect(PreconditionFailedError.isInstance(error)).toBe(true);
    expect(error.statusCode).toBe(412);
    expect(error.code).toBe("PRECONDITION_FAILED");
    expect(error.message).toBe("revision changed");
  });
});

describe("error message from detail", () => {
  it("uses detail when the body has a code but no message", async () => {
    const http = clientReturning(
      () =>
        new Response(
          JSON.stringify({ code: "UNKNOWN_PROPERTY", detail: "no field 'x'" }),
          { status: 422 }
        )
    );
    const error = (await http
      .post("/x", {})
      .catch((e: unknown) => e)) as FrontalError;
    expect(error.code).toBe("UNKNOWN_PROPERTY");
    expect(error.message).toBe("no field 'x'");
  });

  it("keeps message over detail when both are present", async () => {
    const http = clientReturning(
      () =>
        new Response(
          JSON.stringify({
            code: "X_CODE",
            message: "from message",
            detail: "from detail",
          }),
          { status: 400 }
        )
    );
    const error = (await http
      .post("/x", {})
      .catch((e: unknown) => e)) as FrontalError;
    expect(error.message).toBe("from message");
  });
});

describe("onResponse", () => {
  it("receives the response headers, including ETag", async () => {
    const http = clientReturning(
      () =>
        new Response(JSON.stringify({ object_id: "a" }), {
          status: 200,
          headers: { "content-type": "application/json", ETag: '"3"' },
        })
    );
    let etag: string | null = null;
    await http.get(
      "/x",
      undefined,
      undefined,
      {},
      {
        onResponse: (headers) => {
          etag = headers.get("etag");
        },
      }
    );
    expect(etag).toBe('"3"');
  });

  it("is not called when the request fails", async () => {
    const http = clientReturning(
      () => new Response(JSON.stringify({ detail: "missing" }), { status: 404 })
    );
    let called = false;
    await http
      .get(
        "/x",
        undefined,
        undefined,
        {},
        {
          onResponse: () => {
            called = true;
          },
        }
      )
      .catch(() => undefined);
    expect(called).toBe(false);
  });
});

describe("untransformed", () => {
  it("returns keys exactly as sent", async () => {
    const http = clientReturning(
      () =>
        new Response(
          JSON.stringify({
            results: [{ object_id: "a", properties: { externalRef: 1 } }],
            next_cursor: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    );
    const body = await http.post<unknown>("/x", {}, undefined, {
      untransformed: true,
    });
    expect(body).toEqual({
      results: [{ object_id: "a", properties: { externalRef: 1 } }],
      next_cursor: null,
    });
  });
});

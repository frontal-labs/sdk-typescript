import {
  FrontalError,
  NetworkError,
  parseFrontalError,
} from "@frontal-labs/core";
import { describe, expect, it } from "vitest";
import { expectFrontalError, mockError } from "../src/errors";

describe("mockError", () => {
  it("round-trips through the SDK's parser with code, status and request id", async () => {
    const response = mockError({
      status: 404,
      code: "NOT_FOUND",
      message: "gone",
      requestId: "req_9",
    });
    const body = await response.json();
    const error = parseFrontalError(body, response.status);
    expect(error).toBeInstanceOf(FrontalError);
    expectFrontalError(error, {
      code: "NOT_FOUND",
      statusCode: 404,
      retryable: false,
    });
    expect(error.requestId).toBe("req_9");
  });

  it("defaults to a retryable 500 with UNKNOWN_ERROR", async () => {
    const response = mockError();
    expect(response.status).toBe(500);
    const error = parseFrontalError(await response.json(), response.status);
    expectFrontalError(error, {
      code: "UNKNOWN_ERROR",
      statusCode: 500,
      retryable: true,
    });
  });
});

describe("expectFrontalError", () => {
  it("passes for matching fields and fails for a mismatched code", () => {
    expectFrontalError(new NetworkError("x"), {
      code: "NETWORK_ERROR",
      retryable: true,
    });
    expect(() =>
      expectFrontalError(new NetworkError("x"), { code: "TIMEOUT" })
    ).toThrow();
  });
});

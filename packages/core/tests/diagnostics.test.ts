import { describe, expect, it } from "vitest";
import { describeSdkError, redactSecrets } from "../src/diagnostics";
import {
  FrontalError,
  NetworkError,
  parseFrontalError,
  TimeoutError,
} from "../src/errors";

describe("describeSdkError", () => {
  it("builds a fingerprint from scope and code for API errors", () => {
    const error = parseFrontalError(
      { error: { code: "NOT_FOUND", message: "missing" }, requestId: "req_9" },
      404
    );
    const diagnostics = describeSdkError(error);
    expect(diagnostics).toMatchObject({
      name: "NotFoundError",
      code: "NOT_FOUND",
      scope: "frontal",
      statusCode: 404,
      requestId: "req_9",
      retryable: false,
      fingerprint: "frontal/NOT_FOUND",
    });
  });

  it("uses the transport codes for network and timeout errors", () => {
    expect(describeSdkError(new NetworkError("x"))).toMatchObject({
      code: "NETWORK_ERROR",
      fingerprint: "frontal/NETWORK_ERROR",
      retryable: true,
    });
    expect(describeSdkError(new TimeoutError())).toMatchObject({
      code: "TIMEOUT",
      fingerprint: "frontal/TIMEOUT",
    });
  });

  it("never includes the cause or the stack", () => {
    const error = new NetworkError(new Error("internal detail"));
    const serialized = JSON.stringify(describeSdkError(error));
    expect(serialized).not.toContain("internal detail");
    expect(serialized).not.toContain("stack");
  });

  it("redacts API keys from the message, request id and metadata", () => {
    const error = new FrontalError(
      {
        code: "INVALID_API_KEY",
        message: "Key frt_live_ABC123 is not valid",
        requestId: "req_frt_live_XYZ",
      },
      401
    );
    error.metadata = {
      header: "Bearer frt_live_ABC123",
      nested: { keys: ["frt_test_QQ-1", "safe"] },
      count: 3,
    };

    const diagnostics = describeSdkError(error);
    expect(diagnostics.message).toBe("Key [REDACTED] is not valid");
    expect(diagnostics.requestId).toBe("req_[REDACTED]");
    expect(diagnostics.metadata).toEqual({
      header: "Bearer [REDACTED]",
      nested: { keys: ["[REDACTED]", "safe"] },
      count: 3,
    });
    expect(JSON.stringify(diagnostics)).not.toContain("ABC123");
  });

  it("accepts any thrown value without a cast", () => {
    expect(describeSdkError(new Error("plain boom"))).toMatchObject({
      name: "Error",
      code: "Error",
      fingerprint: "unscoped/Error",
      retryable: false,
    });
    expect(describeSdkError("bad frt_live_SECRET")).toEqual({
      name: "NonError",
      code: "UNKNOWN_ERROR",
      message: "bad [REDACTED]",
      retryable: false,
      fingerprint: "unscoped/UNKNOWN_ERROR",
    });
  });

  it("omits the unknown request id placeholder", () => {
    const error = parseFrontalError({ code: "X", message: "m" }, 500);
    expect(describeSdkError(error).requestId).toBeUndefined();
  });
});

describe("redactSecrets", () => {
  it("leaves strings without keys unchanged", () => {
    expect(redactSecrets("nothing to hide")).toBe("nothing to hide");
  });
});

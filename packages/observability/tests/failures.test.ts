import { NetworkError, parseFrontalError } from "@frontal-labs/core";
import { describe, expect, it, vi } from "vitest";
import { logSdkFailure } from "../src/failures";

describe("logSdkFailure", () => {
  it("logs a redacted record with the scope/code fingerprint", () => {
    const logger = { error: vi.fn() };
    const error = parseFrontalError(
      {
        error: { code: "NOT_FOUND", message: "key frt_live_SECRET123 missing" },
        requestId: "req_7",
      },
      404
    );

    const record = logSdkFailure(error, logger);

    expect(logger.error).toHaveBeenCalledWith("[frontal] SDK failure", record);
    expect(record).toMatchObject({
      fingerprint: "frontal/NOT_FOUND",
      statusCode: 404,
      requestId: "req_7",
    });
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("SECRET123");
  });

  it("never includes the cause of a network failure", () => {
    const logger = { error: vi.fn() };
    logSdkFailure(
      new NetworkError(new Error("token frt_live_CAUSE1 leaked")),
      logger
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("CAUSE1");
    expect(logger.error.mock.calls[0]?.[1]).toMatchObject({
      fingerprint: "frontal/NETWORK_ERROR",
    });
  });

  it("defaults to the console", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      logSdkFailure(new Error("plain"));
      expect(spy).toHaveBeenCalledWith(
        "[frontal] SDK failure",
        expect.objectContaining({ fingerprint: "unscoped/Error" })
      );
    } finally {
      spy.mockRestore();
    }
  });
});

import { isFrontalError as isLibraryFrontalError } from "@frontal-labs/error";
import { errorResponse } from "@frontal-labs/error/server";
import { describe, expect, it } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  FrontalError,
  isFrontalError,
  NetworkError,
  NotFoundError,
  PayloadTooLargeError,
  PaymentRequiredError,
  PreconditionFailedError,
  parseFrontalError,
  RateLimitError,
  ServiceError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
} from "../src/errors";

/** Flat response for constructors that take an `ErrorResponseInput`. */
const flat = (overrides: Record<string, unknown> = {}) => ({
  code: "NOT_FOUND",
  message: "Developer detail that must not reach clients",
  requestId: "req_123",
  docs: "https://docs.test.com/errors/not-found",
  ...overrides,
});

const body = (overrides: Record<string, unknown> = {}) => ({
  error: {
    code: "NOT_FOUND",
    message: "Developer detail that must not reach clients",
    link: "https://docs.test.com/errors/not-found",
    fix: "Check the resource id.",
    ...overrides,
  },
  requestId: "req_123",
});

describe("@frontal-labs/error integration", () => {
  describe("recognition", () => {
    it("recognises every SDK error with the library's isFrontalError", () => {
      const errors = [
        parseFrontalError(body(), 400),
        parseFrontalError(body(), 401),
        parseFrontalError(body(), 402),
        parseFrontalError(body(), 403),
        parseFrontalError(body(), 404),
        parseFrontalError(body(), 409),
        parseFrontalError(body(), 412),
        parseFrontalError(body(), 413),
        parseFrontalError(body(), 429, "5"),
        parseFrontalError(body(), 503),
        new NetworkError(new Error("socket hang up")),
        new TimeoutError(),
      ];
      for (const error of errors) {
        expect(isLibraryFrontalError(error)).toBe(true);
      }
    });

    it("keeps core's isFrontalError limited to core's own brand", () => {
      expect(isFrontalError(new NetworkError("x"))).toBe(false);
      expect(isFrontalError(new TimeoutError())).toBe(false);
      expect(isFrontalError(new NotFoundError(flat(), undefined))).toBe(true);
    });

    it("returns false from the library guard for plain errors", () => {
      expect(isLibraryFrontalError(new Error("plain"))).toBe(false);
    });

    it("extends the library's base class for every status subclass", () => {
      const subclasses = [
        new ValidationError(flat()),
        new UnauthorizedError(flat()),
        new PaymentRequiredError(flat()),
        new ForbiddenError(flat()),
        new NotFoundError(flat()),
        new ConflictError(flat()),
        new PreconditionFailedError(flat()),
        new PayloadTooLargeError(flat()),
        new RateLimitError(flat(), 1),
        new ServiceError(flat(), 502),
      ];
      for (const error of subclasses) {
        expect(error).toBeInstanceOf(FrontalError);
        expect(error.scope).toBe("frontal");
        expect(isLibraryFrontalError(error)).toBe(true);
      }
    });
  });

  describe("disclosure", () => {
    it("sends only scope, code and the generic message through errorResponse()", () => {
      const error = parseFrontalError(body(), 404);
      const result = errorResponse(error);

      expect(result.status).toBe(404);
      expect(JSON.parse(String(result.body))).toEqual({
        error: {
          scope: "frontal",
          code: "NOT_FOUND",
          message: "An error occurred.",
        },
      });
      const serialized = String(result.body);
      expect(serialized).not.toContain("Developer detail");
      expect(serialized).not.toContain("docs.test.com");
      expect(serialized).not.toContain("Check the resource id");
      expect(serialized).not.toContain("req_123");
    });

    it("never sets public details on SDK errors", () => {
      expect(parseFrontalError(body(), 404).public).toBeUndefined();
      expect(new NetworkError("x").public).toBeUndefined();
      expect(new TimeoutError().public).toBeUndefined();
    });
  });

  describe("status bounds", () => {
    it.each([0, 302, 399, 600])(
      "clamps status %i to a ServiceError with status 500 and records rawStatus",
      (status) => {
        const error = new ServiceError(flat(), status);
        expect(error).toBeInstanceOf(ServiceError);
        expect(error.statusCode).toBe(500);
        expect(error.metadata).toEqual({ rawStatus: status });
        expect(errorResponse(error).status).toBe(500);
      }
    );

    it("keeps in-range statuses unchanged and adds no metadata", () => {
      const error = parseFrontalError(body(), 404);
      expect(error.statusCode).toBe(404);
      expect(error.metadata).toBeUndefined();
    });
  });

  describe("response parsing", () => {
    it("parses the nested gateway envelope with the top-level requestId", () => {
      const error = parseFrontalError(body(), 404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.requestId).toBe("req_123");
      expect(error.docs).toBe("https://docs.test.com/errors/not-found");
      // Core derives `fix` from the code and status; the body's `fix` is not used.
      expect(error.fix).toBe(
        "Verify the resource id and that it belongs to this workspace/environment."
      );
    });

    it("keeps the message of a nested envelope without a code as UNKNOWN_ERROR", () => {
      const error = parseFrontalError(
        { error: { message: "Gateway said no" } },
        502
      );
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.message).toBe("Gateway said no");
    });

    it("never throws for a blank code and falls back to UNKNOWN_ERROR", () => {
      const error = new NotFoundError(
        { code: "   ", message: "m", requestId: "r" },
        undefined
      );
      expect(error.code).toBe("UNKNOWN_ERROR");
    });

    it("falls back to a generic message for malformed bodies", () => {
      const error = parseFrontalError("<html>", 503);
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.message).toBe("An unknown error occurred");
      expect(error.requestId).toBe("unknown");
    });
  });

  describe("serialization and strings", () => {
    it("keeps the SDK's toJSON shape for FrontalError", () => {
      const error = parseFrontalError(body(), 404);
      expect(error.toJSON()).toEqual({
        name: "NotFoundError",
        code: "NOT_FOUND",
        message: "Developer detail that must not reach clients",
        requestId: "req_123",
        statusCode: 404,
        retryable: false,
        docs: "https://docs.test.com/errors/not-found",
        fix: "Verify the resource id and that it belongs to this workspace/environment.",
      });
      expect(JSON.parse(JSON.stringify(error))).not.toHaveProperty("stack");
    });

    it("serializes NetworkError and TimeoutError without the cause or stack", () => {
      const network = new NetworkError(new Error("secret internal cause"));
      expect(JSON.parse(JSON.stringify(network))).toEqual({
        name: "NetworkError",
        code: "NETWORK_ERROR",
        message: "Network error — could not reach Frontal API",
        retryable: true,
        fix: "Check network connectivity and FRONTAL_API_URL; the request never reached the API.",
      });
      expect(JSON.stringify(network)).not.toContain("secret internal cause");

      const timeout = JSON.parse(JSON.stringify(new TimeoutError("slow")));
      expect(timeout).toMatchObject({ name: "TimeoutError", code: "TIMEOUT" });
      expect(timeout).not.toHaveProperty("stack");
    });

    it("keeps String(error) in the native Name: message form", () => {
      expect(String(parseFrontalError(body(), 404))).toBe(
        "NotFoundError: Developer detail that must not reach clients"
      );
      expect(String(new TimeoutError("slow"))).toBe("TimeoutError: slow");
    });

    it("keeps the network cause available through cause", () => {
      const cause = new Error("ECONNRESET");
      expect(new NetworkError(cause).cause).toBe(cause);
    });
  });
});

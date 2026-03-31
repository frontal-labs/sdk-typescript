/**
 * Comprehensive tests for error classes and error handling
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	ConflictError,
	ForbiddenError,
	FrontalError,
	NetworkError,
	NotFoundError,
	parseFrontalError,
	RateLimitError,
	ServiceError,
	UnauthorizedError,
	ValidationError,
} from "../src/errors";
import { cleanupMocks, createMockErrorResponse } from "./setup";

describe("Error Classes", () => {
	beforeEach(() => {
		cleanupMocks();
	});

	afterEach(() => {
		cleanupMocks();
	});

	describe("FrontalError (Base Class)", () => {
		it("should create a base FrontalError with required properties", () => {
			const errorResponse = createMockErrorResponse({
				code: "TEST_ERROR",
				message: "Test error message",
				requestId: "req_123",
				docs: "https://docs.test.com/errors/test",
			});

			const error = new FrontalError(errorResponse, 400);

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(FrontalError);
			expect(error.name).toBe("FrontalError");
			expect(error.message).toBe("Test error message");
			expect(error.code).toBe("TEST_ERROR");
			expect(error.requestId).toBe("req_123");
			expect(error.statusCode).toBe(400);
			expect(error.docs).toBe("https://docs.test.com/errors/test");
		});

		it("should handle error response without optional docs field", () => {
			const errorResponse = createMockErrorResponse({
				code: "SIMPLE_ERROR",
				message: "Simple error message",
				requestId: "req_456",
			});
			delete errorResponse.docs;

			const error = new FrontalError(errorResponse, 500);

			expect(error.docs).toBeUndefined();
		});

		it("should maintain proper error inheritance chain", () => {
			const errorResponse = createMockErrorResponse();
			const error = new FrontalError(errorResponse, 400);

			expect(error instanceof Error).toBe(true);
			expect(error instanceof FrontalError).toBe(true);
			expect(error.name).toBe("FrontalError");
		});

		it("should have correct stack trace", () => {
			const errorResponse = createMockErrorResponse();
			const error = new FrontalError(errorResponse, 400);

			expect(error.stack).toContain("FrontalError");
			expect(error.stack).toContain("at new FrontalError");
		});
	});

	describe("NotFoundError", () => {
		it("should create NotFoundError with 404 status code", () => {
			const errorResponse = createMockErrorResponse({
				code: "NOT_FOUND",
				message: "Resource not found",
				requestId: "req_404",
			});

			const error = new NotFoundError(errorResponse);

			expect(error).toBeInstanceOf(FrontalError);
			expect(error).toBeInstanceOf(NotFoundError);
			expect(error.name).toBe("NotFoundError");
			expect(error.statusCode).toBe(404);
			expect(error.code).toBe("NOT_FOUND");
			expect(error.message).toBe("Resource not found");
			expect(error.requestId).toBe("req_404");
		});

		it("should be identifiable as NotFoundError", () => {
			const errorResponse = createMockErrorResponse();
			const error = new NotFoundError(errorResponse);

			expect(error instanceof NotFoundError).toBe(true);
			expect(error instanceof FrontalError).toBe(true);
			expect(error instanceof Error).toBe(true);
		});
	});

	describe("UnauthorizedError", () => {
		it("should create UnauthorizedError with 401 status code", () => {
			const errorResponse = createMockErrorResponse({
				code: "UNAUTHORIZED",
				message: "Authentication failed",
				requestId: "req_401",
			});

			const error = new UnauthorizedError(errorResponse);

			expect(error).toBeInstanceOf(FrontalError);
			expect(error).toBeInstanceOf(UnauthorizedError);
			expect(error.name).toBe("UnauthorizedError");
			expect(error.statusCode).toBe(401);
			expect(error.code).toBe("UNAUTHORIZED");
			expect(error.message).toBe("Authentication failed");
			expect(error.requestId).toBe("req_401");
		});

		it("should be identifiable as UnauthorizedError", () => {
			const errorResponse = createMockErrorResponse();
			const error = new UnauthorizedError(errorResponse);

			expect(error instanceof UnauthorizedError).toBe(true);
			expect(error instanceof FrontalError).toBe(true);
			expect(error instanceof Error).toBe(true);
		});
	});

	describe("ForbiddenError", () => {
		it("should create ForbiddenError with 403 status code", () => {
			const errorResponse = createMockErrorResponse({
				code: "FORBIDDEN",
				message: "Access denied",
				requestId: "req_403",
			});

			const error = new ForbiddenError(errorResponse);

			expect(error).toBeInstanceOf(FrontalError);
			expect(error).toBeInstanceOf(ForbiddenError);
			expect(error.name).toBe("ForbiddenError");
			expect(error.statusCode).toBe(403);
			expect(error.code).toBe("FORBIDDEN");
			expect(error.message).toBe("Access denied");
			expect(error.requestId).toBe("req_403");
		});

		it("should be identifiable as ForbiddenError", () => {
			const errorResponse = createMockErrorResponse();
			const error = new ForbiddenError(errorResponse);

			expect(error instanceof ForbiddenError).toBe(true);
			expect(error instanceof FrontalError).toBe(true);
			expect(error instanceof Error).toBe(true);
		});
	});

	describe("ValidationError", () => {
		it("should create ValidationError with 400 status code", () => {
			const errorResponse = createMockErrorResponse({
				code: "VALIDATION_ERROR",
				message: "Invalid input data",
				requestId: "req_400",
				fields: [
					{
						field: "email",
						code: "INVALID_FORMAT",
						message: "Invalid email format",
					},
					{ field: "age", code: "TOO_LOW", message: "Age must be at least 18" },
				],
			});

			const error = new ValidationError(errorResponse);

			expect(error).toBeInstanceOf(FrontalError);
			expect(error).toBeInstanceOf(ValidationError);
			expect(error.name).toBe("ValidationError");
			expect(error.statusCode).toBe(400);
			expect(error.code).toBe("VALIDATION_ERROR");
			expect(error.message).toBe("Invalid input data");
			expect(error.requestId).toBe("req_400");
		});

		it("should include field validation details", () => {
			const errorResponse = createMockErrorResponse({
				code: "VALIDATION_ERROR",
				message: "Invalid input",
				requestId: "req_400",
				fields: [
					{ field: "email", code: "INVALID_FORMAT", message: "Invalid email" },
					{
						field: "password",
						code: "TOO_SHORT",
						message: "Password too short",
					},
				],
			});

			const error = new ValidationError(errorResponse);

			expect(error.fields).toHaveLength(2);
			expect(error.fields[0]).toEqual({
				field: "email",
				code: "INVALID_FORMAT",
				message: "Invalid email",
			});
			expect(error.fields[1]).toEqual({
				field: "password",
				code: "TOO_SHORT",
				message: "Password too short",
			});
		});

		it("should handle validation error without fields", () => {
			const errorResponse = createMockErrorResponse({
				code: "VALIDATION_ERROR",
				message: "Invalid input",
				requestId: "req_400",
			});
			delete errorResponse.fields;

			const error = new ValidationError(errorResponse);

			expect(error.fields).toEqual([]);
		});

		it("should be identifiable as ValidationError", () => {
			const errorResponse = createMockErrorResponse();
			const error = new ValidationError(errorResponse);

			expect(error instanceof ValidationError).toBe(true);
			expect(error instanceof FrontalError).toBe(true);
			expect(error instanceof Error).toBe(true);
		});
	});

	describe("ConflictError", () => {
		it("should create ConflictError with 409 status code", () => {
			const errorResponse = createMockErrorResponse({
				code: "CONFLICT",
				message: "Resource conflict",
				requestId: "req_409",
			});

			const error = new ConflictError(errorResponse);

			expect(error).toBeInstanceOf(FrontalError);
			expect(error).toBeInstanceOf(ConflictError);
			expect(error.name).toBe("ConflictError");
			expect(error.statusCode).toBe(409);
			expect(error.code).toBe("CONFLICT");
			expect(error.message).toBe("Resource conflict");
			expect(error.requestId).toBe("req_409");
		});

		it("should be identifiable as ConflictError", () => {
			const errorResponse = createMockErrorResponse();
			const error = new ConflictError(errorResponse);

			expect(error instanceof ConflictError).toBe(true);
			expect(error instanceof FrontalError).toBe(true);
			expect(error instanceof Error).toBe(true);
		});
	});

	describe("RateLimitError", () => {
		it("should create RateLimitError with 429 status code", () => {
			const errorResponse = createMockErrorResponse({
				code: "RATE_LIMITED",
				message: "Rate limit exceeded",
				requestId: "req_429",
			});

			const error = new RateLimitError(errorResponse, 120);

			expect(error).toBeInstanceOf(FrontalError);
			expect(error).toBeInstanceOf(RateLimitError);
			expect(error.name).toBe("RateLimitError");
			expect(error.statusCode).toBe(429);
			expect(error.code).toBe("RATE_LIMITED");
			expect(error.message).toBe("Rate limit exceeded");
			expect(error.requestId).toBe("req_429");
			expect(error.retryAfter).toBe(120);
		});

		it("should include retry after information", () => {
			const errorResponse = createMockErrorResponse();
			const error = new RateLimitError(errorResponse, 60);

			expect(error.retryAfter).toBe(60);
		});

		it("should be identifiable as RateLimitError", () => {
			const errorResponse = createMockErrorResponse();
			const error = new RateLimitError(errorResponse, 30);

			expect(error instanceof RateLimitError).toBe(true);
			expect(error instanceof FrontalError).toBe(true);
			expect(error instanceof Error).toBe(true);
		});
	});

	describe("ServiceError", () => {
		it("should create ServiceError with custom status code", () => {
			const errorResponse = createMockErrorResponse({
				code: "INTERNAL_ERROR",
				message: "Internal server error",
				requestId: "req_500",
			});

			const error = new ServiceError(errorResponse, 500);

			expect(error).toBeInstanceOf(FrontalError);
			expect(error).toBeInstanceOf(ServiceError);
			expect(error.name).toBe("ServiceError");
			expect(error.statusCode).toBe(500);
			expect(error.code).toBe("INTERNAL_ERROR");
			expect(error.message).toBe("Internal server error");
			expect(error.requestId).toBe("req_500");
		});

		it("should handle different server error status codes", () => {
			const errorResponse = createMockErrorResponse();

			const error502 = new ServiceError(errorResponse, 502);
			const error503 = new ServiceError(errorResponse, 503);
			const error504 = new ServiceError(errorResponse, 504);

			expect(error502.statusCode).toBe(502);
			expect(error503.statusCode).toBe(503);
			expect(error504.statusCode).toBe(504);
		});

		it("should be identifiable as ServiceError", () => {
			const errorResponse = createMockErrorResponse();
			const error = new ServiceError(errorResponse, 500);

			expect(error instanceof ServiceError).toBe(true);
			expect(error instanceof FrontalError).toBe(true);
			expect(error instanceof Error).toBe(true);
		});
	});

	describe("NetworkError", () => {
		it("should create NetworkError with cause", () => {
			const cause = new Error("Connection timeout");
			const error = new NetworkError(cause);

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(NetworkError);
			expect(error.name).toBe("NetworkError");
			expect(error.message).toBe("Network error — could not reach Frontal API");
			expect(error.cause).toBe(cause);
		});

		it("should handle different types of causes", () => {
			const stringCause = "Network unreachable";
			const errorCause = new TypeError("Failed to fetch");
			const objectCause = {
				code: "ENOTFOUND",
				message: "DNS resolution failed",
			};

			const error1 = new NetworkError(stringCause);
			const error2 = new NetworkError(errorCause);
			const error3 = new NetworkError(objectCause);

			expect(error1.cause).toBe(stringCause);
			expect(error2.cause).toBe(errorCause);
			expect(error3.cause).toBe(objectCause);
		});

		it("should be identifiable as NetworkError", () => {
			const error = new NetworkError(new Error("Network issue"));

			expect(error instanceof NetworkError).toBe(true);
			expect(error instanceof Error).toBe(true);
			expect(error instanceof FrontalError).toBe(false); // NetworkError doesn't extend FrontalError
		});
	});

	describe("parseFrontalError", () => {
		describe("HTTP Status Code Mapping", () => {
			it("should map 400 to ValidationError", () => {
				const errorBody = createMockErrorResponse({
					code: "BAD_REQUEST",
					message: "Invalid request",
					requestId: "req_400",
				});

				const error = parseFrontalError(errorBody, 400);

				expect(error).toBeInstanceOf(ValidationError);
				expect(error.statusCode).toBe(400);
				expect(error.code).toBe("BAD_REQUEST");
			});

			it("should map 401 to UnauthorizedError", () => {
				const errorBody = createMockErrorResponse({
					code: "UNAUTHORIZED",
					message: "Authentication failed",
					requestId: "req_401",
				});

				const error = parseFrontalError(errorBody, 401);

				expect(error).toBeInstanceOf(UnauthorizedError);
				expect(error.statusCode).toBe(401);
				expect(error.code).toBe("UNAUTHORIZED");
			});

			it("should map 403 to ForbiddenError", () => {
				const errorBody = createMockErrorResponse({
					code: "FORBIDDEN",
					message: "Access denied",
					requestId: "req_403",
				});

				const error = parseFrontalError(errorBody, 403);

				expect(error).toBeInstanceOf(ForbiddenError);
				expect(error.statusCode).toBe(403);
				expect(error.code).toBe("FORBIDDEN");
			});

			it("should map 404 to NotFoundError", () => {
				const errorBody = createMockErrorResponse({
					code: "NOT_FOUND",
					message: "Resource not found",
					requestId: "req_404",
				});

				const error = parseFrontalError(errorBody, 404);

				expect(error).toBeInstanceOf(NotFoundError);
				expect(error.statusCode).toBe(404);
				expect(error.code).toBe("NOT_FOUND");
			});

			it("should map 409 to ConflictError", () => {
				const errorBody = createMockErrorResponse({
					code: "CONFLICT",
					message: "Resource conflict",
					requestId: "req_409",
				});

				const error = parseFrontalError(errorBody, 409);

				expect(error).toBeInstanceOf(ConflictError);
				expect(error.statusCode).toBe(409);
				expect(error.code).toBe("CONFLICT");
			});

			it("should map 429 to RateLimitError", () => {
				const errorBody = createMockErrorResponse({
					code: "RATE_LIMITED",
					message: "Rate limit exceeded",
					requestId: "req_429",
				});

				const error = parseFrontalError(errorBody, 429, "120");

				expect(error).toBeInstanceOf(RateLimitError);
				expect(error.statusCode).toBe(429);
				expect(error.code).toBe("RATE_LIMITED");
				expect((error as RateLimitError).retryAfter).toBe(120);
			});

			it("should map 5xx to ServiceError", () => {
				const errorBody = createMockErrorResponse({
					code: "INTERNAL_ERROR",
					message: "Internal server error",
					requestId: "req_500",
				});

				const error500 = parseFrontalError(errorBody, 500);
				const error502 = parseFrontalError(errorBody, 502);
				const error503 = parseFrontalError(errorBody, 503);
				const error504 = parseFrontalError(errorBody, 504);

				expect(error500).toBeInstanceOf(ServiceError);
				expect(error500.statusCode).toBe(500);

				expect(error502).toBeInstanceOf(ServiceError);
				expect(error502.statusCode).toBe(502);

				expect(error503).toBeInstanceOf(ServiceError);
				expect(error503.statusCode).toBe(503);

				expect(error504).toBeInstanceOf(ServiceError);
				expect(error504.statusCode).toBe(504);
			});

			it("should map unknown status codes to ServiceError", () => {
				const errorBody = createMockErrorResponse({
					code: "UNKNOWN_ERROR",
					message: "Unknown error",
					requestId: "req_418",
				});

				const error = parseFrontalError(errorBody, 418);

				expect(error).toBeInstanceOf(ServiceError);
				expect(error.statusCode).toBe(418);
				expect(error.code).toBe("UNKNOWN_ERROR");
			});
		});

		describe("Error Body Handling", () => {
			it("should handle valid error response", () => {
				const errorBody = createMockErrorResponse({
					code: "VALID_ERROR",
					message: "Valid error message",
					requestId: "req_valid",
					docs: "https://docs.test.com/valid",
					fields: [
						{ field: "test", code: "INVALID", message: "Test field invalid" },
					],
				});

				const error = parseFrontalError(errorBody, 400);

				expect(error.code).toBe("VALID_ERROR");
				expect(error.message).toBe("Valid error message");
				expect(error.requestId).toBe("req_valid");
				expect(error.docs).toBe("https://docs.test.com/valid");
			});

			it("should handle invalid error body gracefully", () => {
				const invalidBodies = [
					null,
					undefined,
					"string error",
					123,
					[],
					{},
					{ message: "Missing required fields" },
				];

				invalidBodies.forEach((body) => {
					const error = parseFrontalError(body, 500);

					expect(error).toBeInstanceOf(ServiceError);
					expect(error.statusCode).toBe(500);
					expect(error.code).toBe("UNKNOWN_ERROR");
					expect(error.message).toBe("An unknown error occurred");
					expect(error.requestId).toBe("unknown");
				});
			});

			it("should handle partial error response", () => {
				const partialBody = {
					code: "PARTIAL_ERROR",
					message: "Partial error",
					// Missing requestId
				};

				const error = parseFrontalError(partialBody, 400);

				expect(error.code).toBe("PARTIAL_ERROR");
				expect(error.message).toBe("Partial error");
				expect(error.requestId).toBe("unknown"); // Should use default
			});
		});

		describe("Retry-After Header Handling", () => {
			it("should parse Retry-After header as number", () => {
				const errorBody = createMockErrorResponse({
					code: "RATE_LIMITED",
					message: "Rate limited",
					requestId: "req_429",
				});

				const error = parseFrontalError(errorBody, 429, "60");

				expect(error).toBeInstanceOf(RateLimitError);
				expect((error as RateLimitError).retryAfter).toBe(60);
			});

			it("should use default retry-after when header is missing", () => {
				const errorBody = createMockErrorResponse({
					code: "RATE_LIMITED",
					message: "Rate limited",
					requestId: "req_429",
				});

				const error = parseFrontalError(errorBody, 429);

				expect(error).toBeInstanceOf(RateLimitError);
				expect((error as RateLimitError).retryAfter).toBe(60); // Default value
			});

			it("should handle invalid Retry-After header", () => {
				const errorBody = createMockErrorResponse({
					code: "RATE_LIMITED",
					message: "Rate limited",
					requestId: "req_429",
				});

				const error = parseFrontalError(errorBody, 429, "invalid");

				expect(error).toBeInstanceOf(RateLimitError);
				expect((error as RateLimitError).retryAfter).toBe(60); // Should fallback to default
			});
		});

		describe("Error Consistency", () => {
			it("should create errors with consistent structure", () => {
				const errorBody = createMockErrorResponse();
				const errors = [
					parseFrontalError(errorBody, 400),
					parseFrontalError(errorBody, 401),
					parseFrontalError(errorBody, 403),
					parseFrontalError(errorBody, 404),
					parseFrontalError(errorBody, 409),
					parseFrontalError(errorBody, 429),
					parseFrontalError(errorBody, 500),
				];

				errors.forEach((error) => {
					expect(error).toBeInstanceOf(FrontalError);
					expect(error).toBeInstanceOf(Error);
					expect(typeof error.name).toBe("string");
					expect(typeof error.message).toBe("string");
					expect(typeof error.code).toBe("string");
					expect(typeof error.requestId).toBe("string");
					expect(typeof error.statusCode).toBe("number");
				});
			});

			it("should maintain error inheritance for type checking", () => {
				const errorBody = createMockErrorResponse();

				const notFoundError = parseFrontalError(errorBody, 404);
				const validationError = parseFrontalError(errorBody, 400);
				const serviceError = parseFrontalError(errorBody, 500);

				expect(notFoundError instanceof NotFoundError).toBe(true);
				expect(notFoundError instanceof FrontalError).toBe(true);

				expect(validationError instanceof ValidationError).toBe(true);
				expect(validationError instanceof FrontalError).toBe(true);

				expect(serviceError instanceof ServiceError).toBe(true);
				expect(serviceError instanceof FrontalError).toBe(true);
			});
		});
	});

	describe("Error Usage Patterns", () => {
		it("should support try-catch error handling", () => {
			const errorBody = createMockErrorResponse({
				code: "NOT_FOUND",
				message: "User not found",
				requestId: "req_user_404",
			});

			try {
				throw parseFrontalError(errorBody, 404);
			} catch (error) {
				expect(error).toBeInstanceOf(NotFoundError);
				expect((error as NotFoundError).message).toBe("User not found");
				expect((error as NotFoundError).requestId).toBe("req_user_404");
			}
		});

		it("should support instanceof checks for error handling", () => {
			const errorBody = createMockErrorResponse();

			const errors = [
				{ status: 400, expectedClass: ValidationError },
				{ status: 401, expectedClass: UnauthorizedError },
				{ status: 403, expectedClass: ForbiddenError },
				{ status: 404, expectedClass: NotFoundError },
				{ status: 409, expectedClass: ConflictError },
				{ status: 429, expectedClass: RateLimitError },
				{ status: 500, expectedClass: ServiceError },
			];

			errors.forEach(({ status, expectedClass }) => {
				const error = parseFrontalError(errorBody, status);
				expect(error).toBeInstanceOf(expectedClass);
				expect(error).toBeInstanceOf(FrontalError);
			});
		});

		it("should support error logging with proper information", () => {
			const errorBody = createMockErrorResponse({
				code: "VALIDATION_ERROR",
				message: "Multiple validation errors",
				requestId: "req_validation",
				fields: [
					{ field: "email", code: "INVALID", message: "Invalid email" },
					{
						field: "password",
						code: "TOO_SHORT",
						message: "Password too short",
					},
				],
			});

			const error = parseFrontalError(errorBody, 400);

			// Simulate error logging
			const logData = {
				name: error.name,
				message: error.message,
				code: error.code,
				requestId: error.requestId,
				statusCode: error.statusCode,
				stack: error.stack,
			};

			if (error instanceof ValidationError) {
				logData.fields = error.fields;
			}

			expect(logData).toEqual({
				name: "ValidationError",
				message: "Multiple validation errors",
				code: "VALIDATION_ERROR",
				requestId: "req_validation",
				statusCode: 400,
				stack: expect.stringContaining("ValidationError"),
				fields: [
					{ field: "email", code: "INVALID", message: "Invalid email" },
					{
						field: "password",
						code: "TOO_SHORT",
						message: "Password too short",
					},
				],
			});
		});
	});
});

import type { z } from "zod";
import { type ErrorField, errorResponseSchema } from "./schemas";

type ErrorResponseInput = z.infer<typeof errorResponseSchema>;

/**
 * Base error class for all Frontal API errors.
 * Extends the native Error class with additional API-specific properties.
 *
 * @example
 * ```typescript
 * try {
 *   await client.get('/users/123')
 * } catch (error) {
 *   if (error instanceof FrontalError) {
 *     console.log('Error code:', error.code)
 *     console.log('Request ID:', error.requestId)
 *     console.log('Status code:', error.statusCode)
 *   }
 * }
 * ```
 */
export class FrontalError extends Error {
	/**
	 * Error code returned by the API.
	 * @example 'USER_NOT_FOUND'
	 */
	readonly code: string;
	/**
	 * Unique identifier for the request that failed.
	 * @example 'req_123456789'
	 */
	readonly requestId: string;
	/**
	 * HTTP status code of the response.
	 * @example 404
	 */
	readonly statusCode: number;
	/**
	 * Optional URL to documentation for this error.
	 * @example 'https://docs.frontal.dev/errors/user-not-found'
	 */
	readonly docs?: string;

	/**
	 * Creates a new FrontalError instance.
	 * @param response - Parsed error response from the API
	 * @param statusCode - HTTP status code
	 */
	constructor(response: ErrorResponseInput, statusCode: number) {
		super(response.message);
		this.name = "FrontalError";
		this.code = response.code;
		this.requestId = response.requestId;
		this.statusCode = statusCode;
		this.docs = response.docs;
		// Modern approach: Error handling works correctly without setPrototypeOf
	}
}

/**
 * Error thrown when a requested resource is not found.
 * Maps to HTTP 404 status code.
 *
 * @example
 * ```typescript
 * try {
 *   await client.get('/users/999')
 * } catch (error) {
 *   if (error instanceof NotFoundError) {
 *     console.log('User not found')
 *   }
 * }
 * ```
 */
export class NotFoundError extends FrontalError {
	constructor(r: ErrorResponseInput) {
		super(r, 404);
		this.name = "NotFoundError";
	}
}

/**
 * Error thrown when authentication fails.
 * Maps to HTTP 401 status code.
 *
 * @example
 * ```typescript
 * try {
 *   await client.get('/protected')
 * } catch (error) {
 *   if (error instanceof UnauthorizedError) {
 *     console.log('Invalid API key')
 *   }
 * }
 * ```
 */
export class UnauthorizedError extends FrontalError {
	constructor(r: ErrorResponseInput) {
		super(r, 401);
		this.name = "UnauthorizedError";
	}
}

/**
 * Error thrown when the client lacks permission to access a resource.
 * Maps to HTTP 403 status code.
 *
 * @example
 * ```typescript
 * try {
 *   await client.delete('/admin/users/123')
 * } catch (error) {
 *   if (error instanceof ForbiddenError) {
 *     console.log('Insufficient permissions')
 *   }
 * }
 * ```
 */
export class ForbiddenError extends FrontalError {
	constructor(r: ErrorResponseInput) {
		super(r, 403);
		this.name = "ForbiddenError";
	}
}

/**
 * Error thrown when request validation fails.
 * Maps to HTTP 400 status code and includes field-specific error details.
 *
 * @example
 * ```typescript
 * try {
 *   await client.post('/users', { email: 'invalid-email' })
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log('Validation errors:', error.fields)
 *   }
 * }
 * ```
 */
export class ValidationError extends FrontalError {
	/**
	 * Array of field-specific validation errors.
	 * @example [{ field: 'email', code: 'INVALID_FORMAT', message: 'Invalid email format' }]
	 */
	readonly fields: ErrorField[];
	constructor(r: ErrorResponseInput) {
		super(r, 400);
		this.name = "ValidationError";
		this.fields = r.fields ?? [];
	}
}

/**
 * Error thrown when a resource conflict occurs.
 * Maps to HTTP 409 status code.
 *
 * @example
 * ```typescript
 * try {
 *   await client.post('/users', { email: 'existing@example.com' })
 * } catch (error) {
 *   if (error instanceof ConflictError) {
 *     console.log('User already exists')
 *   }
 * }
 * ```
 */
export class ConflictError extends FrontalError {
	constructor(r: ErrorResponseInput) {
		super(r, 409);
		this.name = "ConflictError";
	}
}

/**
 * Error thrown when rate limits are exceeded.
 * Maps to HTTP 429 status code and includes retry information.
 *
 * @example
 * ```typescript
 * try {
 *   await client.get('/data')
 * } catch (error) {
 *   if (error instanceof RateLimitError) {
 *     console.log(`Retry after ${error.retryAfter} seconds`)
 *   }
 * }
 * ```
 */
export class RateLimitError extends FrontalError {
	/**
	 * Number of seconds to wait before retrying the request.
	 * @example 60
	 */
	readonly retryAfter: number;
	constructor(r: ErrorResponseInput, retryAfter: number) {
		super(r, 429);
		this.name = "RateLimitError";
		this.retryAfter = retryAfter;
	}
}

/**
 * Error thrown for server-side errors (5xx status codes).
 * Represents internal server errors or service unavailability.
 *
 * @example
 * ```typescript
 * try {
 *   await client.get('/data')
 * } catch (error) {
 *   if (error instanceof ServiceError) {
 *     console.log('Server error:', error.statusCode)
 *   }
 * }
 * ```
 */
export class ServiceError extends FrontalError {
	constructor(r: ErrorResponseInput, status: number) {
		super(r, status);
		this.name = "ServiceError";
	}
}

/**
 * Error thrown when network connectivity fails.
 * Represents connection timeouts, DNS failures, or other network issues.
 *
 * @example
 * ```typescript
 * try {
 *   await client.get('/data')
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     console.log('Network error:', error.cause)
 *   }
 * }
 * ```
 */
export class NetworkError extends Error {
	/**
	 * Creates a new NetworkError instance.
	 * @param cause - The underlying cause of the network error
	 */
	constructor(readonly cause: unknown) {
		super("Network error — could not reach Frontal API");
		this.name = "NetworkError";
	}
}

/**
 * Error thrown when an operation exceeds its time limit.
 * Used by polling utilities and async operation helpers.
 *
 * @example
 * ```typescript
 * try {
 *   await pollUntil(() => checkStatus(id), { timeout: 30000 })
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.log('Operation timed out')
 *   }
 * }
 * ```
 */
export class TimeoutError extends Error {
	constructor(message = "Operation timed out") {
		super(message);
		this.name = "TimeoutError";
	}
}

/**
 * Parses an HTTP response body and status code into an appropriate FrontalError.
 * This function maps HTTP status codes to specific error classes.
 *
 * @param body - Response body from the failed request
 * @param status - HTTP status code
 * @param retryAfter - Optional Retry-After header value (seconds)
 * @returns Appropriate FrontalError instance
 *
 * @example
 * ```typescript
 * const error = parseFrontalError(responseBody, 404)
 * console.log(error instanceof NotFoundError) // true
 *
 * const rateLimitError = parseFrontalError(responseBody, 429, '120')
 * console.log(rateLimitError.retryAfter) // 120
 * ```
 */
export function parseFrontalError(
	body: unknown,
	status: number,
	retryAfter?: string,
): FrontalError {
	const parsed = errorResponseSchema.safeParse(body);
	const r = parsed.success
		? parsed.data
		: {
				code: "UNKNOWN_ERROR",
				message: "An unknown error occurred",
				requestId: "unknown",
			};
	switch (status) {
		case 400:
			return new ValidationError(r);
		case 401:
			return new UnauthorizedError(r);
		case 403:
			return new ForbiddenError(r);
		case 404:
			return new NotFoundError(r);
		case 409:
			return new ConflictError(r);
		case 429:
			return new RateLimitError(r, parseInt(retryAfter ?? "60", 10));
		default:
			return new ServiceError(r, status);
	}
}

import { z } from "zod";
import { BACKOFF_STRATEGIES, DEFAULT_RETRY_ON } from "./constants";

/**
 * Zod schema for timestamp.
 * Transforms a Date object to a Date object (no-op, but ensures type safety).
 */
export const timestampSchema = z
	.date()
	.transform((date: Date) => new Date(date));

/**
 * Zod schema for response metadata.
 */
export const responseMetaSchema = z.object({
	/**
	 * Unique request identifier.
	 */
	requestId: z.string(),
	/**
	 * Timestamp of the response.
	 */
	timestamp: timestampSchema,
	/**
	 * API version.
	 */
	version: z.string().optional(),
	/**
	 * Substrate identifier.
	 */
	substrate: z.string().optional(),
	/**
	 * Latency information.
	 */
	latency: z
		.object({
			/**
			 * Total latency in milliseconds.
			 */
			total: z.number().int(),
			/**
			 * Substrate latency in milliseconds.
			 */
			substrate: z.number().int(),
		})
		.optional(),
});

/**
 * Type for response metadata.
 */
export type ResponseMeta = z.infer<typeof responseMetaSchema>;

/**
 * Zod schema for pagination metadata.
 */
export const paginationMetaSchema = z.object({
	/**
	 * Cursor for pagination.
	 */
	cursor: z.string().nullable(),
	/**
	 * Whether there are more items.
	 */
	hasMore: z.boolean(),
	/**
	 * Total number of items.
	 */
	total: z.number().int().optional(),
});

/**
 * Type for pagination metadata.
 */
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/**
 * Zod schema for error field.
 */
export const errorFieldSchema = z.object({
	/**
	 * Field name.
	 */
	field: z.string().min(1).describe("Field name"),
	/**
	 * Error code.
	 */
	code: z.string().min(1).describe("Error code"),
	/**
	 * Error message.
	 */
	message: z.string().min(1).describe("Error message"),
});

/**
 * Zod schema for error response.
 */
export const errorResponseSchema = z.object({
	/**
	 * Error code.
	 */
	code: z.string().min(1).describe("Error code"),
	/**
	 * Error message.
	 */
	message: z.string().min(1).describe("Error message"),
	/**
	 * Request ID.
	 */
	requestId: z.string().min(1).describe("Request ID"),
	/**
	 * Documentation URL.
	 */
	docs: z.url().optional().describe("Documentation URL"),
	/**
	 * Array of error fields.
	 */
	fields: z
		.array(errorFieldSchema)
		.optional()
		.describe("Array of error fields"),
});

/**
 * Type for error response.
 */
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Type for error field.
 */
export type ErrorField = z.infer<typeof errorFieldSchema>;

/**
 * Zod schema for retry configuration.
 * Validates retry behavior settings including backoff strategy and retry conditions.
 *
 * @example
 * ```typescript
 * const retryConfig = retryConfigSchema.parse({
 *   maxRetries: 5,
 *   retryDelay: 2000,
 *   backoff: 'exponential',
 *   retryOn: [429, 500, 502, 503, 504]
 * })
 * ```
 */
export const retryConfigSchema = z
	.object({
		/**
		 * Maximum number of retries.
		 */
		maxRetries: z
			.number()
			.int()
			.min(0)
			.default(3)
			.describe("Maximum number of retries"),
		/**
		 * Initial delay between retries in milliseconds.
		 */
		retryDelay: z
			.number()
			.int()
			.positive()
			.default(1_000)
			.describe("Initial delay between retries in milliseconds"),
		/**
		 * Backoff strategy.
		 */
		backoff: z
			.enum(BACKOFF_STRATEGIES)
			.default("exponential")
			.describe("Backoff strategy"),
		/**
		 * HTTP status codes to retry on.
		 */
		retryOn: z
			.array(z.number().int())
			.default(DEFAULT_RETRY_ON)
			.describe("HTTP status codes to retry on"),
	})
	.default({
		maxRetries: 3,
		retryDelay: 1000,
		backoff: "exponential",
		retryOn: DEFAULT_RETRY_ON,
	});

/**
 * Type for retry configuration.
 * Represents validated retry settings with all defaults applied.
 *
 * @example
 * ```typescript
 * const config: RetryConfig = {
 *   maxRetries: 3,
 *   retryDelay: 1000,
 *   backoff: 'exponential',
 *   retryOn: [429, 500, 502, 503, 504]
 * }
 * ```
 */
export type RetryConfig = z.infer<typeof retryConfigSchema>;

/**
 * Zod schema for scalar values (string, number, boolean, or null).
 * Used as the base type for filter values.
 *
 * @example
 * ```typescript
 * const scalar: Scalar = 'hello'
 * const scalar: Scalar = 42
 * const scalar: Scalar = true
 * const scalar: Scalar = null
 * ```
 */
const scalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/**
 * Scalar type for filter values.
 * Union of string, number, boolean, and null.
 */
export type Scalar = z.infer<typeof scalarSchema>;

/**
 * Filter value types for API queries.
 * Supports various comparison operators and string operations.
 *
 * @example
 * ```typescript
 * // Simple equality
 * const filter: FilterValue = 'some-value'
 *
 * // Operators
 * const filter: FilterValue = { eq: 'value' }
 * const filter: FilterValue = { ne: 'value' }
 * const filter: FilterValue = { gt: 100 }
 * const filter: FilterValue = { gte: 100 }
 * const filter: FilterValue = { lt: 100 }
 * const filter: FilterValue = { lte: 100 }
 *
 * // Array operations
 * const filter: FilterValue = { in: ['a', 'b', 'c'] }
 * const filter: FilterValue = { nin: ['a', 'b', 'c'] }
 *
 * // String operations
 * const filter: FilterValue = { contains: 'substring' }
 * const filter: FilterValue = { startsWith: 'prefix' }
 * const filter: FilterValue = { endsWith: 'suffix' }
 *
 * // Date operations
 * const filter: FilterValue = { before: '2023-01-01' }
 * const filter: FilterValue = { after: new Date() }
 *
 * // Null check
 * const filter: FilterValue = { isNull: true }
 * ```
 */
export type FilterValue =
	| Scalar
	| { eq: Scalar }
	| { ne: Scalar }
	| { gt: number }
	| { gte: number }
	| { lt: number }
	| { lte: number }
	| { in: Scalar[] }
	| { nin: Scalar[] }
	| { contains: string }
	| { startsWith: string }
	| { endsWith: string }
	| { within: string }
	| { before: string | Date }
	| { after: string | Date }
	| { isNull: boolean };

/**
 * Zod schema for filter values.
 * Validates the structure of filter conditions.
 * Uses lazy evaluation to support recursive references.
 *
 * @example
 * ```typescript
 * const validFilter = filterValueSchema.parse({ eq: 'value' })
 * const validFilter = filterValueSchema.parse({ in: [1, 2, 3] })
 * ```
 */
export const filterValueSchema: z.ZodType<FilterValue> = z.lazy(() =>
	z.union([
		scalarSchema,
		z.object({ eq: scalarSchema }),
		z.object({ ne: scalarSchema }),
		z.object({ gt: z.number() }),
		z.object({ gte: z.number() }),
		z.object({ lt: z.number() }),
		z.object({ lte: z.number() }),
		z.object({ in: z.array(scalarSchema) }),
		z.object({ nin: z.array(scalarSchema) }),
		z.object({ contains: z.string() }),
		z.object({ startsWith: z.string() }),
		z.object({ endsWith: z.string() }),
		z.object({ within: z.string() }),
		z.object({ before: z.union([z.string().datetime(), z.date()]) }),
		z.object({ after: z.union([z.string().datetime(), z.date()]) }),
		z.object({ isNull: z.boolean() }),
	]),
);

/**
 * Zod schema for filter conditions.
 * Maps field names to their filter values.
 *
 * @example
 * ```typescript
 * const filters = filterConditionsSchema.parse({
 *   name: { contains: 'john' },
 *   age: { gte: 18 },
 *   status: { in: ['active', 'pending'] }
 * })
 * ```
 */
export const filterConditionsSchema = z.record(z.string(), filterValueSchema);

/**
 * Type for filter conditions.
 * Represents a mapping of field names to their filter criteria.
 *
 * @example
 * ```typescript
 * const conditions: FilterConditions = {
 *   name: { startsWith: 'John' },
 *   age: { between: [18, 65] },
 *   email: { isNull: false }
 * }
 * ```
 */
export type FilterConditions = z.infer<typeof filterConditionsSchema>;

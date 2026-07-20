import { z } from "zod";
import { BACKOFF_STRATEGIES, DEFAULT_RETRY_ON } from "./constants";

/**
 * Zod schema that accepts a Date and returns a new Date instance.
 * Used as the base for all timestamp fields.
 */
export const timestampSchema = z
  .date()
  .transform((date: Date) => new Date(date));

/**
 * Zod schema for standard API response metadata (request ID, timestamp, version, etc.).
 */
export const responseMetaSchema = z
  .object({
    requestId: z.string().min(1),
    timestamp: timestampSchema,
    version: z.string().optional(),
    substrate: z.string().optional(),
    latency: z
      .object({
        total: z.number().int().min(0),
        substrate: z.number().int().min(0).optional(),
      })
      .optional(),
  })
  .strict();

/** Inferred type for response metadata. */
export type ResponseMeta = z.infer<typeof responseMetaSchema>;

/**
 * Zod schema for pagination metadata returned by cursor-based list endpoints.
 */
export const paginationMetaSchema = z
  .object({
    cursor: z.string().min(1),
    hasMore: z.boolean(),
    limit: z.number().int().positive().optional(),
    total: z.number().int().min(0).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .strict();

/** Inferred type for pagination metadata. */
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/**
 * Zod schema for a single field-level validation error.
 */
export const errorFieldSchema = z
  .object({
    field: z.string().describe("Field name"),
    code: z.string().describe("Error code"),
    message: z.string().describe("Error message"),
  })
  .strict();

const docsUrlSchema = z
  .string()
  .url()
  .refine((url) => /^https?:\/\//.test(url), {
    message: "docs must be an http or https URL",
  });

/**
 * Zod schema for a standard API error response body.
 */
export const errorResponseSchema = z
  .object({
    code: z.string().min(1).describe("Error code"),
    message: z.string().min(1).describe("Error message"),
    requestId: z.string().min(1).describe("Request ID"),
    docs: docsUrlSchema.optional().describe("Documentation URL"),
    fields: z
      .array(errorFieldSchema)
      .optional()
      .describe("Array of error fields"),
  })
  .strict();

/** Inferred type for a standard API error response. */
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
/** Inferred type for a field-level validation error. */
export type ErrorField = z.infer<typeof errorFieldSchema>;

const retryStatusCodeSchema = z
  .number()
  .int()
  .refine((status) => status === 429 || (status >= 500 && status <= 599), {
    message: "Retry status codes must be 429 or 5xx",
  });

/**
 * Zod schema for retry configuration with defaults.
 * Controls max attempts, base delay, backoff strategy, retry-on status codes,
 * and jitter randomization.
 */
export const retryConfigSchema = z
  .object({
    maxAttempts: z.number().int().positive().default(3),
    baseDelay: z.number().int().positive().default(1000),
    strategy: z.enum(BACKOFF_STRATEGIES).default("exponential"),
    on: z.array(retryStatusCodeSchema).default(DEFAULT_RETRY_ON),
    jitter: z.boolean().default(true),
  })
  .strict()
  .default({
    maxAttempts: 3,
    baseDelay: 1000,
    strategy: "exponential",
    on: DEFAULT_RETRY_ON,
    jitter: true,
  });

/** Inferred type for retry configuration. */
export type RetryConfig = z.infer<typeof retryConfigSchema>;

const numericValueSchema = z.union([
  z.number(),
  z.literal(Number.POSITIVE_INFINITY),
  z.literal(Number.NEGATIVE_INFINITY),
]);
const arrayFilterValueSchema = z.union([
  z.array(z.string()),
  z.array(numericValueSchema),
]);
const scalarFilterValueSchema = z.union([
  z.string(),
  numericValueSchema,
  z.boolean(),
  z.date(),
  z.null(),
  arrayFilterValueSchema,
]);

const comparableValueSchema = z.union([numericValueSchema, z.date()]);

const filterOperatorSchema = z
  .object({
    eq: scalarFilterValueSchema.optional(),
    ne: scalarFilterValueSchema.optional(),
    gt: comparableValueSchema.optional(),
    gte: comparableValueSchema.optional(),
    lt: comparableValueSchema.optional(),
    lte: comparableValueSchema.optional(),
    in: arrayFilterValueSchema.optional(),
    nin: arrayFilterValueSchema.optional(),
    contains: z.string().optional(),
    startsWith: z.string().optional(),
    endsWith: z.string().optional(),
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    {
      message: "At least one filter operator is required",
    }
  );

/**
 * Union of scalar values and filter operator objects used in query filters.
 * A filter value is either a direct scalar/array value or an operator object
 * like `{ eq: "value" }`, `{ gt: 100 }`, `{ contains: "foo" }`, etc.
 */
export type FilterValue =
  | z.infer<typeof scalarFilterValueSchema>
  | z.infer<typeof filterOperatorSchema>;

/**
 * Zod schema for a single filter value — either a scalar or an operator object.
 */
export const filterValueSchema: z.ZodType<FilterValue> = z.union([
  scalarFilterValueSchema,
  filterOperatorSchema,
]);

/**
 * Zod schema for a set of filter conditions keyed by field name.
 * Each field maps to either a direct value or an operator object.
 */
export const filterConditionsSchema = z.record(z.string(), filterValueSchema);
/** Inferred type for filter conditions (record of field → filter value). */
export type FilterConditions = z.infer<typeof filterConditionsSchema>;

/**
 * Zod schema for a paginated API response containing an array of data,
 * optional response metadata, and pagination info.
 */
export const pageResultSchema = z
  .object({
    data: z.array(z.unknown()),
    meta: responseMetaSchema.optional(),
    pagination: paginationMetaSchema,
  })
  .strict();

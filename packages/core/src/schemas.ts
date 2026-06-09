import { z } from "zod";
import { BACKOFF_STRATEGIES, DEFAULT_RETRY_ON } from "./constants";

export const timestampSchema = z
  .date()
  .transform((date: Date) => new Date(date));

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

export type ResponseMeta = z.infer<typeof responseMetaSchema>;

export const paginationMetaSchema = z
  .object({
    cursor: z.string().min(1),
    hasMore: z.boolean(),
    limit: z.number().int().positive().optional(),
    total: z.number().int().min(0).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .strict();

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

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

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type ErrorField = z.infer<typeof errorFieldSchema>;

const retryStatusCodeSchema = z
  .number()
  .int()
  .refine((status) => status === 429 || (status >= 500 && status <= 599), {
    message: "Retry status codes must be 429 or 5xx",
  });

export const retryConfigSchema = z
  .object({
    maxAttempts: z.number().int().positive().default(3),
    baseDelay: z.number().int().positive().default(1_000),
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

export type FilterValue =
  | z.infer<typeof scalarFilterValueSchema>
  | z.infer<typeof filterOperatorSchema>;

export const filterValueSchema: z.ZodType<FilterValue> = z.union([
  scalarFilterValueSchema,
  filterOperatorSchema,
]);

export const filterConditionsSchema = z.record(z.string(), filterValueSchema);
export type FilterConditions = z.infer<typeof filterConditionsSchema>;

export const pageResultSchema = z
  .object({
    data: z.array(z.unknown()),
    meta: responseMetaSchema.optional(),
    pagination: paginationMetaSchema,
  })
  .strict();

import { z } from "zod";
import { API_KEY_PREFIX, DEFAULT_BASE_URL } from "./constants";

// Keys are `frt_<base64url>`; base64url includes `-` and `_`.
const API_KEY_PATTERN = new RegExp(`^${API_KEY_PREFIX}[A-Za-z0-9_-]+$`);

const loggerFnSchema = z.custom<(...args: unknown[]) => void>(
  (value) => typeof value === "function",
  "Expected function"
);

const headersSchema = z
  .record(z.string(), z.string())
  .superRefine((headers, ctx) => {
    for (const key of Object.keys(headers)) {
      if (key.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Header names must be non-empty",
          path: [],
        });
        return;
      }
    }
  })
  .default({});

/**
 * Zod schema for client configuration.
 * Validates and provides defaults for all configuration options.
 */
export const clientConfigSchema = z
  .object({
    apiKey: z
      .string()
      .min(9, "apiKey is required")
      .regex(API_KEY_PATTERN, `apiKey must start with "${API_KEY_PREFIX}"`),
    baseUrl: z
      .string()
      .url()
      .refine(
        (value) => value.startsWith("https://") || value.startsWith("http://"),
        {
          message: "baseUrl must use http or https",
        }
      )
      .default(DEFAULT_BASE_URL),
    timeout: z.number().int().positive().default(30_000),
    maxRetries: z.number().int().min(0).max(10).default(3),
    retryDelay: z.number().int().positive().default(1000),
    headers: headersSchema,
    environment: z.string().default("production"),
    debug: z.boolean().default(false),
    fetch: z
      .custom<typeof fetch>((value) => typeof value === "function")
      .optional(),
    logger: z
      .object({
        request: loggerFnSchema.optional(),
        response: loggerFnSchema.optional(),
        error: loggerFnSchema.optional(),
      })
      .optional(),
    circuitBreaker: z
      .object({
        failureThreshold: z.number().int().positive().default(5),
        resetTimeoutMs: z.number().int().positive().default(30_000),
      })
      .optional(),
  })
  .strict();

export type ClientConfigInput = z.input<typeof clientConfigSchema>;
export type ClientConfigOutput = z.output<typeof clientConfigSchema>;

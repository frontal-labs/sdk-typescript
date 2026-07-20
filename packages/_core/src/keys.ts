import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const apiKeySchema = z
  .string()
  .min(9, "FRONTAL_API_KEY must be at least 9 characters")
  .max(128, "FRONTAL_API_KEY must be at most 128 characters")
  .refine(
    (val: string) =>
      /^frt_[A-Za-z0-9_]+$/.test(val) || /^fr_typed[A-Za-z0-9_]+$/.test(val),
    "FRONTAL_API_KEY must start with frt_"
  );

const debugSchema = z
  .union([
    z.literal("true"),
    z.literal("false"),
    z.literal("1"),
    z.literal("0"),
  ])
  .optional()
  .default("false")
  .transform((val) => val === "true" || val === "1");

/**
 * Parsed runtime environment used by all packages.
 * Access via `import { env } from "@frontal-labs/_core"`.
 *
 * Validation runs at module import time. Set environment variables
 * before importing this module.
 */
export const env = createEnv({
  server: {
    FRONTAL_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    FRONTAL_API_KEY: apiKeySchema.optional(),

    FRONTAL_API_URL: z.url("FRONTAL_API_URL must be a valid URL").optional(),

    FRONTAL_DEBUG: debugSchema,
  },
  runtimeEnv: {
    FRONTAL_ENV: process.env.FRONTAL_ENV,
    FRONTAL_API_KEY: process.env.FRONTAL_API_KEY,
    FRONTAL_API_URL: process.env.FRONTAL_API_URL,
    FRONTAL_DEBUG: process.env.FRONTAL_DEBUG,
  },
  emptyStringAsUndefined: true,
});

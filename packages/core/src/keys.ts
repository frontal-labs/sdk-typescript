import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Parsed runtime environment used by all packages.
 * Access via `import { env } from "@frontal-labs/core"`.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    FRONTAL_API_URL: z.url().optional(),
    FRONTAL_API_KEY: z.string().min(1).optional(),
    FRONTAL_DEBUG: z.boolean().optional().default(false),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    FRONTAL_API_URL: process.env.FRONTAL_API_URL,
    FRONTAL_API_KEY: process.env.FRONTAL_API_KEY,
    FRONTAL_DEBUG: process.env.FRONTAL_DEBUG,
  },
  emptyStringAsUndefined: true,
});

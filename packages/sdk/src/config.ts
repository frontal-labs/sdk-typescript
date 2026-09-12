import {
  type ClientConfigInput,
  type ClientConfigOutput,
  clientConfigSchema,
  env,
} from "@frontal-labs/core";
import {
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";

/**
 * Runtime environment the SDK is running in.
 * Read from `FRONTAL_ENV` when not passed explicitly.
 */
export type FrontalEnvironment = "development" | "test" | "production";

/**
 * Configuration accepted by `new Frontal(config)` and
 * {@link createFrontalClient}.
 *
 * This is the same shape a future `frontal.jsonc` file will use; the SDK
 * reads environment variables today and never touches the filesystem.
 *
 * @example
 * ```ts
 * const f = new Frontal({
 *   apiKey: process.env.FRONTAL_API_KEY!,
 *   env: "development",
 * });
 * ```
 */
export interface SdkConfig {
  /** Frontal API key (`frt_...`). Required. */
  apiKey: string;
  /** Base URL for the API. Falls back to `FRONTAL_API_URL`, then {@link DEFAULT_BASE_URL}. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT}. */
  timeout?: number;
  /** Maximum number of retries for failed requests. Defaults to {@link DEFAULT_MAX_RETRIES}. */
  maxRetries?: number;
  /** Base delay between retries in milliseconds. Defaults to {@link DEFAULT_RETRY_DELAY}. */
  retryDelay?: number;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /** Runtime environment. Falls back to `FRONTAL_ENV`. */
  env?: FrontalEnvironment;
  /** Enable verbose request/response logging. Falls back to `FRONTAL_DEBUG`. */
  debug?: boolean;
  /** Custom `fetch` implementation (tests, edge runtimes). */
  fetch?: ClientConfigInput["fetch"];
  /** Request/response/error hooks. */
  logger?: ClientConfigInput["logger"];
  /** Circuit-breaker configuration. */
  circuitBreaker?: ClientConfigInput["circuitBreaker"];
}

/**
 * @deprecated Use {@link SdkConfig}. Kept as an alias for back-compat.
 */
export type FrontalClientConfig = SdkConfig;

/**
 * Zod schema for the fully-resolved client configuration. Re-exported from
 * `@frontal-labs/core` so config-file tooling has a single source of truth.
 */
export const sdkConfigSchema = clientConfigSchema;

/**
 * Merges an {@link SdkConfig} with environment variables and package
 * defaults, then validates it. Throws a `ZodError` on invalid input
 * (for example an API key without the `frt_` prefix).
 */
export function resolveSdkConfig(config: SdkConfig): ClientConfigOutput {
  return clientConfigSchema.parse({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_BASE_URL,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: config.retryDelay ?? DEFAULT_RETRY_DELAY,
    headers: config.headers ?? {},
    environment: config.env ?? env.FRONTAL_ENV,
    debug: config.debug ?? env.FRONTAL_DEBUG ?? false,
    fetch: config.fetch,
    logger: config.logger,
    circuitBreaker: config.circuitBreaker,
  });
}

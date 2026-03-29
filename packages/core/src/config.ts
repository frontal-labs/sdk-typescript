import { z } from "zod";
import { DEFAULT_BASE_URL, API_KEY_PREFIX } from "./constants";

/**
 * Zod schema for client configuration.
 * Validates and provides defaults for all configuration options.
 *
 * @example
 * ```typescript
 * const config = clientConfigSchema.parse({
 *   apiKey: 'your-api-key',
 *   environment: 'development',
 *   timeout: 10000
 * })
 * ```
 */
export const clientConfigSchema = z
	.object({
		/**
		 * Frontal API authentication key.
		 * @example 'frl_1234567890abcdef'
		 */
		apiKey: z
			.string()
			.regex(
				new RegExp(`^${API_KEY_PREFIX}`),
				`apiKey must start with "${API_KEY_PREFIX}"`,
			)
			.min(5, "apiKey is required"),
		/**
		 * Frontal API base URL.
		 * @example 'https://api.frontal.dev/v1'
		 */
		baseUrl: z.url().default(DEFAULT_BASE_URL),
		/**
		 * Request timeout in milliseconds.
		 * @default 30000 (30 seconds)
		 */
		timeout: z.number().int().positive().default(30_000),
		/**
		 * Maximum number of retry attempts for failed requests.
		 * @default 3
		 */
		maxRetries: z.number().int().min(0).max(10).default(3),
		/**
		 * Delay between retry attempts in milliseconds.
		 * @default 1000 (1 second)
		 */
		retryDelay: z.number().int().positive().default(1_000),
		/**
		 * Additional headers to include in all requests.
		 * @default {}
		 */
		headers: z.record(z.string(), z.string()).default({}),
		/**
		 * Environment name (e.g., 'development', 'staging', 'production').
		 * @default 'production'
		 */
		environment: z.string().default("production"),
		/**
		 * Enable debug logging.
		 * @default false
		 */
		debug: z.boolean().default(false),
		/**
		 * Custom fetch implementation.
		 * @default global fetch
		 */
		fetch: z.custom<typeof fetch>().optional(),
		/**
		 * Logger functions for request, response, and error events.
		 */
		logger: z
			.object({
				/**
				 * Function to log request events.
				 */
				request: z.function().optional(),
				/**
				 * Function to log response events.
				 */
				response: z.function().optional(),
				/**
				 * Function to log error events.
				 */
				error: z.function().optional(),
			})
			.optional(),
	})
	.strict();

/**
 * Input type for client configuration.
 * Allows partial configuration with defaults applied by Zod validation.
 *
 * @example
 * ```typescript
 * const input: ClientConfigInput = {
 *   apiKey: 'your-api-key',
 *   environment: 'development'
 * }
 * ```
 */
export type ClientConfigInput = z.input<typeof clientConfigSchema>;

/**
 * Output type for client configuration.
 * Represents the fully validated configuration with all defaults applied.
 *
 * @example
 * ```typescript
 * const config: ClientConfig = {
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.frontal.dev/v1',
 *   timeout: 30000,
 *   maxRetries: 3,
 *   retryDelay: 1000,
 *   headers: {},
 *   environment: 'production',
 *   debug: false,
 *   fetch: undefined,
 *   logger: undefined
 * }
 * ```
 */
export type ClientConfigOutput = z.output<typeof clientConfigSchema>;

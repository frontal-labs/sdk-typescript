import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { ValidationError } from "./errors";

/**
 * Creates and validates environment variables for the Frontal Core.
 * Uses T3 Env for type-safe environment variable handling.
 *
 * @example
 * ```typescript
 * import { keys } from '@frontal/core'
 *
 * const env = keys()
 * console.log('API URL:', env.FRONTAL_API_URL)
 * console.log('API Key:', env.FRONTAL_API_KEY)
 * ```
 *
 * @returns Validated environment variables object
 *
 * @throws {Error} When required environment variables are missing in production
 */
export const keys = () =>
	createEnv({
		/**
		 * Server-side environment variables schema.
		 * Defines validation rules for all supported environment variables.
		 */
		server: {
			/**
			 * Node.js environment (development, test, production).
			 * Defaults to 'development' when not specified.
			 */
			NODE_ENV: z
				.enum(["development", "test", "production"])
				.default("development"),
			/**
			 * Frontal API base URL.
			 * Optional in non-production environments, required in production.
			 * @example 'https://api.frontal.dev/v1'
			 */
			FRONTAL_API_URL: z
				.url()
				.optional()
				.refine((val) => !(process.env.NODE_ENV === "production") || !!val, {
					message: "FRONTAL_API_URL is required in production",
				}),
			/**
			 * Frontal API authentication key.
			 * Optional in non-production environments, required in production.
			 * @example 'frl_1234567890abcdef'
			 */
			FRONTAL_API_KEY: z
				.string()
				.min(1)
				.optional()
				.refine((val) => !(process.env.NODE_ENV === "production") || !!val, {
					message: "FRONTAL_API_KEY is required in production",
				}),
		},
		/**
		 * Runtime environment variables mapping.
		 * Connects the schema to actual process.env values.
		 */
		runtimeEnv: {
			NODE_ENV: process.env.NODE_ENV,
			FRONTAL_API_URL: process.env.FRONTAL_API_URL,
			FRONTAL_API_KEY: process.env.FRONTAL_API_KEY,
		},
		/**
		 * Skip validation in production for performance.
		 * Set to true to bypass validation checks.
		 */
		skipValidation: process.env.NODE_ENV === "production",
		/**
		 * Treat empty strings as undefined.
		 * Useful when environment variables might be set but empty.
		 */
		emptyStringAsUndefined: true,
		onValidationError: (error) => {
			throw new ValidationError({
				code: "VALIDATION_ERROR",
				message: `Environment validation error: ${error.map((e) => e.message).join(", ")}`,
				requestId: "env-validation",
				fields: [
					{
						field: "environment",
						code: "VALIDATION_ERROR",
						message: error.map((e) => e.message).join(", "),
					},
				],
			});
		},
	});

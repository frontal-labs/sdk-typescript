import { z } from "zod";

const apiKeySchema = z
	.string()
	.min(9)
	.max(128, "FRONTAL_API_KEY is too long")
	.refine(
		(value) =>
			/^frt_[A-Za-z0-9_]+$/.test(value) ||
			/^fr_typed[A-Za-z0-9_]+$/.test(value),
		"FRONTAL_API_KEY must start with frt_",
	)
	.refine((value) => value.length >= 9, "FRONTAL_API_KEY is too short");

const debugSchema = z.preprocess((value) => {
	if (typeof value === "boolean") return value;
	if (typeof value !== "string") return value;

	const normalized = value.toLowerCase();
	if (normalized === "true" || normalized === "1") return true;
	if (normalized === "false" || normalized === "0") return false;
	return value;
}, z.boolean().optional());

/**
 * Shared env schemas used by packages.
 */
export const keys = {
	client: z
		.object({
			FRONTAL_API_KEY: apiKeySchema,
			FRONTAL_ENVIRONMENT: z.string().optional(),
			FRONTAL_DEBUG: debugSchema,
		})
		.strip(),
};

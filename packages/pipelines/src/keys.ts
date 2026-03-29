import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		FRONTAL_API_URL: z
			.url()
			.optional()
			.refine((val) => !(process.env.NODE_ENV === "production") || !!val, {
				message: "FRONTAL_API_URL is required in production",
			}),
		FRONTAL_API_KEY: z
			.string()
			.min(1)
			.optional()
			.refine((val) => !(process.env.NODE_ENV === "production") || !!val, {
				message: "FRONTAL_API_KEY is required in production",
			}),
	},
	runtimeEnv: {
		NODE_ENV: process.env.NODE_ENV,
		FRONTAL_API_URL: process.env.FRONTAL_API_URL,
		FRONTAL_API_KEY: process.env.FRONTAL_API_KEY,
	},
	emptyStringAsUndefined: true,
});

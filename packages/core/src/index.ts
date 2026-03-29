// Core client
export { FrontalClient } from "./client";

// Default client factory
export { getDefaultClient } from "./client";

// Configuration schemas
export { clientConfigSchema } from "./config";
export type { ClientConfigOutput, ClientConfigInput } from "./config";

// Environment variable management
export { keys } from "./keys";

// HTTP client for API requests
export { HttpClient } from "./http";

// Error handling
export {
	FrontalError,
	NotFoundError,
	UnauthorizedError,
	ForbiddenError,
	ValidationError,
	ConflictError,
	RateLimitError,
	ServiceError,
	NetworkError,
	TimeoutError,
	parseFrontalError,
} from "./errors";

// Polling utilities
export { pollUntil, withTimeout } from "./polling";
export type { PollOptions } from "./polling";

// Pagination utilities
export { pageResultSchema, createPageResult } from "./pagination";

// Retry logic
export { calculateDelay } from "./retry";

// Schema validation and types
export {
	timestampSchema,
	responseMetaSchema,
	paginationMetaSchema,
	errorFieldSchema,
	errorResponseSchema,
	retryConfigSchema,
	filterValueSchema,
	filterConditionsSchema,
} from "./schemas";

export type {
	ResponseMeta,
	PaginationMeta,
	ErrorResponse,
	ErrorField,
	RetryConfig,
	FilterConditions,
	FilterValue,
	Scalar,
} from "./schemas";

// Core types and interfaces
export type {
	APIResponse,
	PageResult,
	QueryBuilder,
} from "./types";

// Constants
export {
	DEFAULT_BASE_URL,
	API_KEY_PREFIX,
	BACKOFF_STRATEGIES,
	DEFAULT_RETRY_ON,
	EXPONENTIAL_BASE,
	JITTER_MAX,
} from "./constants";

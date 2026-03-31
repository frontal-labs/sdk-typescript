/**
 * Test setup and utilities for @frontal/core
 */

import { expect, vi } from "vitest";

// Mock console methods to avoid noise in tests
Object.defineProperty(console, "log", {
	value: vi.fn(),
	writable: true,
});

Object.defineProperty(console, "warn", {
	value: vi.fn(),
	writable: true,
});

Object.defineProperty(console, "error", {
	value: vi.fn(),
	writable: true,
});

// Global test utilities
declare global {
	namespace Vi {
		interface JestAssertion<T = any> extends JestMatchers<T> {
			toBeValidFrontalError(): T;
			toBeValidPageResult(): T;
		}
	}
}

// Custom matchers
expect.extend({
	toBeValidFrontalError(received) {
		const pass =
			received &&
			typeof received === "object" &&
			"code" in received &&
			"requestId" in received &&
			"statusCode" in received &&
			"name" in received &&
			"message" in received;

		return {
			message: () =>
				pass
					? `expected ${received} not to be a valid FrontalError`
					: `expected ${received} to be a valid FrontalError with code, requestId, statusCode, name, and message properties`,
			pass,
		};
	},

	toBeValidPageResult(received) {
		const pass =
			received &&
			typeof received === "object" &&
			"data" in received &&
			Array.isArray(received.data) &&
			"pagination" in received &&
			typeof received.nextPage === "function" &&
			typeof received.all === "function" &&
			Symbol.asyncIterator in received;

		return {
			message: () =>
				pass
					? `expected ${received} not to be a valid PageResult`
					: `expected ${received} to be a valid PageResult with data array, pagination object, nextPage(), all(), and async iterator`,
			pass,
		};
	},
});

// Test data factories
export const createMockConfig = (overrides = {}) => ({
	apiKey: "frt_test1234567890abcdef",
	baseUrl: "https://api.test.com/v1",
	timeout: 5000,
	maxRetries: 2,
	retryDelay: 100,
	headers: {},
	environment: "test",
	debug: false,
	...overrides,
});

export const createMockResponse = (overrides = {}) => ({
	data: { id: "123", name: "Test" },
	error: null,
	headers: { "content-type": "application/json" },
	...overrides,
});

export const createMockErrorResponse = (overrides = {}) => ({
	code: "TEST_ERROR",
	message: "Test error message",
	requestId: "req_test123",
	docs: "https://docs.test.com/errors/test-error",
	fields: [{ field: "email", code: "INVALID", message: "Invalid email" }],
	...overrides,
});

export const createMockPaginationMeta = (overrides = {}) => ({
	cursor: "cursor_123",
	hasMore: true,
	total: 100,
	limit: 10,
	offset: 0,
	...overrides,
});

export const createMockResponseMeta = (overrides = {}) => ({
	requestId: "req_test123",
	timestamp: new Date(),
	version: "1.0.0",
	substrate: "test",
	latency: { total: 100, substrate: 50 },
	...overrides,
});

// Mock fetch implementation
export const createMockFetch = (responses: any[] = []) => {
	let callCount = 0;
	return vi
		.fn()
		.mockImplementation(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const response = responses[callCount] ||
					responses[0] || {
						ok: true,
						status: 200,
						headers: new Headers({ "content-type": "application/json" }),
						json: async () => ({ data: "test" }),
					};

				callCount++;
				return response;
			},
		);
};

// Mock server for SSE
export const createMockSSEStream = (events: any[] = []) => {
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			events.forEach((event) => {
				const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
				controller.enqueue(encoder.encode(data));
			});
			controller.close();
		},
	});
	return stream;
};

// Test schemas
export const testUserSchema = {
	parse: vi.fn((data) => data),
	safeParse: vi.fn((data) => ({ success: true, data })),
};

export const testPaginationSchema = {
	parse: vi.fn((data) => data),
	safeParse: vi.fn((data) => ({ success: true, data })),
};

// Environment variable mocks
export const mockEnv = {
	FRONTAL_API_KEY: "frt_env1234567890abcdef",
	FRONTAL_ENVIRONMENT: "test",
	FRONTAL_DEBUG: "true",
};

// Type helpers for tests
export type MockConfig = ReturnType<typeof createMockConfig>;
export type MockResponse = ReturnType<typeof createMockResponse>;
export type MockErrorResponse = ReturnType<typeof createMockErrorResponse>;

// Cleanup utilities
export const cleanupMocks = () => {
	vi.clearAllMocks();
	vi.restoreAllMocks();
};

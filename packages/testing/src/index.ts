/**
 * Frontal Testing Package
 * Shared testing utilities for all Frontal Core packages
 */

import { FrontalClient, HttpClient, deepSnakeToCamel } from "frontal/core";
import { vi } from "vitest";

// ============================================================================
// Configuration
// ============================================================================

/** Configuration for mock SDK client. */
export interface MockConfig {
  /** API key to use in tests. */
  apiKey: string;
  /** Base URL for the mock API. */
  baseUrl: string;
  /** Request timeout in milliseconds. */
  timeout: number;
}

/** Creates a default mock configuration for testing. */
export const createMockConfig = (): MockConfig => {
  return {
    apiKey: "frt_test-api-key-1234567890",
    baseUrl: "https://api.test.frontal.dev",
    timeout: 10_000,
  };
};

// ============================================================================
// Environment
// ============================================================================

/** Set up environment variables for testing. */
export const setupTestEnvironment = () => {
  process.env.NODE_ENV = "test";
  process.env.CI = "true";
  process.env.FRONTAL_API_KEY = "frt_test-api-key-1234567890";
};

/** Clean up test environment variables. */
export const cleanupTestEnvironment = () => {
  delete process.env.NODE_ENV;
  delete process.env.CI;
  delete process.env.FRONTAL_API_KEY;
};

// ============================================================================
// HTTP Mocking
// ============================================================================

/** A mock API route definition for testing. */
export interface MockRoute {
  /** HTTP method to match (e.g. "GET", "POST"). */
  method: string;
  /** URL path or pattern to match. */
  path: string | RegExp;
  /** HTTP status code to return (default 200). */
  status?: number;
  /** Response body to return. */
  body?: unknown;
  /** Optional response headers. */
  headers?: Record<string, string>;
}

/** A recorded mock request for test assertions. */
export interface RequestLog {
  /** HTTP method used. */
  method: string;
  /** Full request URL. */
  url: string;
  /** Request pathname. */
  path: string;
  /** Parsed request body. */
  body: unknown;
  /** Request headers. */
  headers: Record<string, string>;
}

/**
 * Creates a mock fetch function that matches routes and records requests.
 * Use this to inject into FrontalClient / HttpClient via the `fetch` config option.
 */
/**
 * Creates a mock fetch function that matches routes and records requests.
 * Use this to inject into FrontalClient / HttpClient via the `fetch` config option.
 *
 * @param routes - Initial set of mock routes to match against.
 * @returns An object with `fetch`, `requests` array, and assertion helpers.
 */
export function createMockFetch(routes: MockRoute[] = []) {
  const requests: RequestLog[] = [];

  const mockFetch = vi.fn(
    async (
      input: string | URL | Request,
      init?: RequestInit
    ): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = init?.method ?? "GET";
      const parsedUrl = new URL(url);
      const _path = parsedUrl.pathname + parsedUrl.search;

      let reqBody: unknown;
      if (init?.body && typeof init.body === "string") {
        try {
          const parsed = JSON.parse(init.body);
          reqBody =
            typeof parsed === "object" && parsed !== null
              ? deepSnakeToCamel(parsed)
              : parsed;
        } catch {
          reqBody = init.body;
        }
      }

      const reqHeaders: Record<string, string> = {};
      if (init?.headers) {
        const h = new Headers(init.headers as HeadersInit);
        h.forEach((v, k) => {
          reqHeaders[k] = v;
        });
      }

      requests.push({
        method,
        url,
        path: parsedUrl.pathname,
        body: reqBody,
        headers: reqHeaders,
      });

      const route = routes.find((r) => {
        if (r.method.toUpperCase() !== method.toUpperCase()) return false;
        if (typeof r.path === "string")
          return parsedUrl.pathname.endsWith(r.path);
        return r.path.test(parsedUrl.pathname);
      });

      if (!route) {
        return new Response(
          JSON.stringify({
            code: "NOT_FOUND",
            message: `No mock for ${method} ${parsedUrl.pathname}`,
            requestId: "mock",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const status = route.status ?? 200;
      const headers = new Headers({
        "Content-Type": "application/json",
        ...route.headers,
      });

      if (status === 204) {
        return new Response(null, { status, headers });
      }

      return new Response(JSON.stringify(route.body ?? {}), {
        status,
        headers,
      });
    }
  );

  return {
    fetch: mockFetch as unknown as typeof fetch,
    requests,
    /** Assert a specific endpoint was called */
    expectCalled(method: string, pathSubstring: string) {
      const found = requests.find(
        (r) => r.method === method && r.path.includes(pathSubstring)
      );
      if (!found) {
        throw new Error(
          `Expected ${method} ${pathSubstring} to have been called.\nActual calls: ${requests.map((r) => `${r.method} ${r.path}`).join(", ") || "none"}`
        );
      }
      return found;
    },
    /** Assert endpoint was called with specific body */
    expectCalledWith(
      method: string,
      pathSubstring: string,
      body: Record<string, unknown>
    ) {
      const req = this.expectCalled(method, pathSubstring);
      const requestBody = req.body as Record<string, unknown> | undefined;
      for (const [key, value] of Object.entries(body)) {
        const actualValue = requestBody?.[key];
        if (JSON.stringify(actualValue) !== JSON.stringify(value)) {
          throw new Error(
            `Expected ${method} ${pathSubstring} body.${key} to be ${JSON.stringify(value)}, got ${JSON.stringify(actualValue)}`
          );
        }
      }
      return req;
    },
    /** Get number of calls to a specific endpoint */
    callCount(method: string, pathSubstring: string) {
      return requests.filter(
        (r) => r.method === method && r.path.includes(pathSubstring)
      ).length;
    },
    /** Reset recorded requests */
    reset() {
      requests.length = 0;
      mockFetch.mockClear();
    },
  };
}

// ============================================================================
// Test Client Factory
// ============================================================================

/**
 * Creates a FrontalClient with a mock fetch injected.
 * Returns the client + mock handle so tests can set up routes and assert calls.
 */
/**
 * Creates a FrontalClient with a mock fetch injected.
 * Returns the client + mock handle so tests can set up routes and assert calls.
 *
 * @param routes - Initial set of mock routes.
 * @returns An object with `client` (FrontalClient) and `mock` (mock fetch handle).
 */
export function createTestClient(routes: MockRoute[] = []) {
  const mock = createMockFetch(routes);
  const client = new FrontalClient({
    apiKey: "frt_test-api-key-1234567890",
    baseUrl: "https://api.test.frontal.dev/v1",
    timeout: 5000,
    maxRetries: 0,
    retryDelay: 0,
    headers: {},
    environment: "test",
    debug: false,
    fetch: mock.fetch,
  });
  return { client, mock };
}

/**
 * Creates just an HttpClient with a mock fetch. Useful for service-level tests.
 */
/**
 * Creates just an HttpClient with a mock fetch. Useful for service-level tests.
 *
 * @param routes - Initial set of mock routes.
 * @returns An object with `http` (HttpClient) and `mock` (mock fetch handle).
 */
export function createTestHttpClient(routes: MockRoute[] = []) {
  const mock = createMockFetch(routes);
  const http = new HttpClient({
    apiKey: "frt_test-api-key-1234567890",
    baseUrl: "https://api.test.frontal.dev/v1",
    timeout: 5000,
    maxRetries: 0,
    retryDelay: 0,
    headers: {},
    environment: "test",
    debug: false,
    fetch: mock.fetch,
  });
  return { http, mock };
}

// ============================================================================
// Response Factories
// ============================================================================

/**
 * Creates a paginated response body matching the SDK's expected format.
 *
 * @param data - Array of items for the current page.
 * @param opts - Pagination options (cursor, hasMore, total).
 * @returns A paginated response object.
 */
export function mockPageResponse<T>(
  data: T[],
  opts: { cursor?: string | null; hasMore?: boolean; total?: number } = {}
) {
  return {
    data,
    pagination: {
      cursor: opts.cursor ?? null,
      hasMore: opts.hasMore ?? false,
      total: opts.total ?? data.length,
    },
    meta: {
      requestId: `req_test_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
  };
}

/**
 * Creates an error response body matching the SDK's expected format.
 *
 * @param code - Error code string.
 * @param message - Human-readable error message.
 * @param _status - HTTP status code (default 400).
 * @returns An error response object.
 */
export function mockErrorResponse(
  code: string,
  message: string,
  _status = 400
) {
  return {
    code,
    message,
    requestId: `req_err_${Math.random().toString(36).slice(2, 8)}`,
  };
}

// ============================================================================
// Entity Fixtures
// ============================================================================

/** Factory functions for creating test entity fixtures with random IDs. */
export const fixtures = {
  entity: (overrides: Record<string, unknown> = {}) => ({
    id: `ent_${Math.random().toString(36).slice(2, 8)}`,
    type: "user",
    fields: { name: "Test User", email: "test@example.com" },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  agent: (overrides: Record<string, unknown> = {}) => ({
    id: `agt_${Math.random().toString(36).slice(2, 8)}`,
    name: "test-agent",
    status: "active",
    version: 1,
    environment: "test",
    triggers: [{ event: "entity.created" }],
    scope: {
      read: [],
      write: [],
      actions: [],
      escalate: [],
      invokeAgents: [],
      invokeFunctions: [],
    },
    confidence: {
      autoExecuteAbove: 0.85,
      escalateBelow: 0.6,
      requireReviewBetween: true,
    },
    memory: { type: "working" },
    retry: {
      maxRetries: 3,
      retryDelay: 1000,
      backoff: "exponential",
      retryOn: [429, 500, 502, 503, 504],
    },
    timeout: "30s",
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  workflow: (overrides: Record<string, unknown> = {}) => ({
    id: `wfl_${Math.random().toString(36).slice(2, 8)}`,
    name: "test-workflow",
    status: "draft",
    version: "1.0.0",
    triggers: [],
    steps: [],
    variables: {},
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  pipeline: (overrides: Record<string, unknown> = {}) => ({
    id: `ppl_${Math.random().toString(36).slice(2, 8)}`,
    name: "test-pipeline",
    status: "draft",
    source: { type: "manual" },
    steps: [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  model: (overrides: Record<string, unknown> = {}) => ({
    id: `mdl_${Math.random().toString(36).slice(2, 8)}`,
    name: "test-model",
    status: "draft",
    version: 1,
    fields: [
      { name: "id", type: "uuid" },
      { name: "name", type: "string" },
    ],
    relationships: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  functionEntry: (overrides: Record<string, unknown> = {}) => ({
    id: `fn_${Math.random().toString(36).slice(2, 8)}`,
    name: "test-function",
    runtime: "nodejs20",
    handler: "index.handler",
    memory: 256,
    timeout: 30,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),
};

export {
  createIntegrationHarness,
  integrationPage,
  dataEnvelope,
} from "./integration";
export type { IntegrationHarness } from "./integration";

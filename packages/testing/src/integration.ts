import { HttpClient } from "@frontal-labs/core";
import { createMockFetch, type MockRoute, type RequestLog } from "./index";

export interface IntegrationHarness {
  /** Shared mock fetch — all services route through this */
  fetch: ReturnType<typeof createMockFetch>["fetch"];
  /** All recorded requests across all services */
  requests: RequestLog[];
  /** Create an HttpClient connected to the shared mock */
  createHttp(routes?: MockRoute[]): { http: HttpClient };
  /** Assert an endpoint was called by any service */
  expectCalled(method: string, pathSubstring: string): RequestLog;
  /** Reset recorded requests */
  reset(): void;
}

/**
 * Creates an integration test harness with shared mock state.
 * Multiple services can be created within the harness and they all
 * share the same mock fetch and request log.
 */
export function createIntegrationHarness(
  initialRoutes: MockRoute[] = []
): IntegrationHarness {
  const mock = createMockFetch(initialRoutes);

  const harness: IntegrationHarness = {
    fetch: mock.fetch,
    requests: mock.requests,

    createHttp(_extraRoutes: MockRoute[] = []) {
      // Add any extra routes to the shared mock by pushing into initial routes
      for (const route of _extraRoutes) {
        initialRoutes.push(route);
      }
      return {
        http: new HttpClient({
          apiKey: "frt_test-api-key-1234567890",
          baseUrl: "https://api.test.frontal.dev/v1",
          timeout: 5000,
          maxRetries: 0,
          retryDelay: 0,
          headers: {},
          environment: "test",
          debug: false,
          fetch: mock.fetch,
        }),
      };
    },

    expectCalled(method: string, pathSubstring: string) {
      const found = mock.requests.find(
        (r) => r.method === method && r.path.includes(pathSubstring)
      );
      if (!found) {
        const calls = mock.requests
          .map((r) => `${r.method} ${r.path}`)
          .join(", ");
        throw new Error(
          `Expected ${method} ${pathSubstring} to have been called.\n` +
            `Actual calls: ${calls || "none"}`
        );
      }
      return found;
    },

    reset() {
      mock.reset();
    },
  };

  return harness;
}

/**
 * Standard paginated response wrapper for integration test fixtures.
 */
export function integrationPage<T>(
  data: T[],
  overrides: Partial<{
    cursor: string | null;
    hasMore: boolean;
    total: number;
  }> = {}
) {
  return {
    data,
    pagination: {
      cursor: overrides.cursor ?? null,
      hasMore: overrides.hasMore ?? false,
      total: overrides.total ?? data.length,
    },
  };
}

/**
 * Wraps a response body in the standard `{ data, error }` envelope
 * used by GoTrue-style APIs (auth, potentially others).
 */
export function dataEnvelope<T>(payload: T) {
  return { data: payload, error: null };
}

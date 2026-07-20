/**
 * Comprehensive tests for HttpClient
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { NetworkError } from "../src/errors";
import { HttpClient } from "../src/http";
import {
  cleanupMocks,
  createMockConfig,
  createMockErrorResponse,
  createMockFetch,
} from "./setup";

describe("HttpClient", () => {
  let httpClient: HttpClient;
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch();
    global.fetch = mockFetch;
    httpClient = new HttpClient(createMockConfig());
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe("Constructor", () => {
    it("should create an HTTP client with valid configuration", () => {
      expect(httpClient).toBeInstanceOf(HttpClient);
    });

    it("should store configuration privately", () => {
      const privateHttpClient = httpClient as unknown as { config: unknown };
      expect(privateHttpClient.config).toBeDefined();
    });
  });

  describe("Request Headers", () => {
    it("should include default headers in requests", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "test" }),
      });

      await httpClient.get("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer frt_test1234567890abcdef",
            "Content-Type": "application/json",
            "User-Agent": expect.stringContaining("@frontal-labs/_core"),
          }),
        })
      );
    });

    it("should include custom headers from configuration", async () => {
      const customConfig = createMockConfig({
        headers: {
          "X-Client-Version": "1.0.0",
          "X-Request-ID": "req_123",
        },
      });
      const customClient = new HttpClient(customConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "test" }),
      });

      await customClient.get("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer frt_test1234567890abcdef",
            "Content-Type": "application/json",
            "X-Client-Version": "1.0.0",
            "X-Request-ID": "req_123",
          }),
        })
      );
    });
  });

  describe("URL /v1 prefix handling", () => {
    it("should not double the /v1 segment when a route also starts with /v1/", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "test" }),
      });

      await httpClient.get("/v1/data/query/runs");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/data/query/runs",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should leave unprefixed routes untouched", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "test" }),
      });

      await httpClient.get("/data/query/runs");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/data/query/runs",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should not strip /v1 from a route when the base URL has no /v1 segment", async () => {
      const noVersionClient = new HttpClient(
        createMockConfig({ baseUrl: "https://api.test.com" })
      );
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "test" }),
      });

      await noVersionClient.get("/v1/health");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/health",
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("GET requests", () => {
    it("should make a successful GET request", async () => {
      const responseData = { id: "123", name: "Test" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.get("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/test",
        expect.objectContaining({
          method: "GET",
          body: undefined,
        })
      );
      expect(result).toEqual(responseData);
    });

    it("should handle GET request with query parameters", async () => {
      const params = { page: "1", limit: "10", search: "test" };
      const responseData = { data: [], total: 0 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      await httpClient.get("/users", params);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/users?page=1&limit=10&search=test",
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should handle GET request with schema validation", async () => {
      const responseData = {
        id: "123",
        name: "Test",
        email: "test@example.com",
      };
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.get("/test", undefined, schema);

      expect(result).toEqual(responseData);
    });

    it("should validate response with schema", async () => {
      const responseData = { id: "123", name: "Test" }; // Missing email
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      await expect(
        httpClient.get("/test", undefined, schema)
      ).rejects.toThrow();
    });
  });

  describe("POST requests", () => {
    it("should make a successful POST request", async () => {
      const requestData = { name: "John", email: "john@example.com" };
      const responseData = { id: "456", ...requestData };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.post("/users", requestData);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(requestData),
        })
      );
      expect(result).toEqual(responseData);
    });

    it("should handle POST request without body", async () => {
      const responseData = { status: "ok" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.post("/ping");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/ping",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({}),
        })
      );
      expect(result).toEqual(responseData);
    });

    it("should handle POST request with schema validation", async () => {
      const requestData = { name: "John" };
      const responseData = {
        id: "456",
        ...requestData,
        createdAt: "2023-01-01",
      };
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        createdAt: z.string(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.post("/users", requestData, schema);

      expect(result).toEqual(responseData);
    });
  });

  describe("PUT requests", () => {
    it("should make a successful PUT request", async () => {
      const requestData = { name: "Jane" };
      const responseData = { id: "123", ...requestData };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.put("/users/123", requestData);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/users/123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(requestData),
        })
      );
      expect(result).toEqual(responseData);
    });

    it("should handle PUT request with schema validation", async () => {
      const requestData = { name: "Jane" };
      const responseData = {
        id: "123",
        ...requestData,
        updatedAt: "2023-01-01",
      };
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        updatedAt: z.string(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.put("/users/123", requestData, schema);

      expect(result).toEqual(responseData);
    });
  });

  describe("PATCH requests", () => {
    it("should make a successful PATCH request", async () => {
      const requestData = { name: "Jane" };
      const responseData = { id: "123", ...requestData };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.patch("/users/123", requestData);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/users/123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(requestData),
        })
      );
      expect(result).toEqual(responseData);
    });

    it("should handle PATCH request with schema validation", async () => {
      const requestData = { name: "Jane" };
      const responseData = {
        id: "123",
        ...requestData,
        updatedAt: "2023-01-01",
      };
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        updatedAt: z.string(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.patch("/users/123", requestData, schema);

      expect(result).toEqual(responseData);
    });
  });

  describe("DELETE requests", () => {
    it("should make a successful DELETE request", async () => {
      const responseData = { message: "Deleted successfully" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.delete("/users/123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/users/123",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({}),
        })
      );
      expect(result).toEqual(responseData);
    });

    it("should handle DELETE request with schema validation", async () => {
      const responseData = {
        message: "Deleted successfully",
        deletedAt: "2023-01-01",
      };
      const schema = z.object({
        message: z.string(),
        deletedAt: z.string(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.delete("/users/123", undefined, schema);

      expect(result).toEqual(responseData);
    });
  });

  describe("Raw Binary Uploads", () => {
    it("should handle raw binary data uploads", async () => {
      const fileData = Buffer.from("test file content");
      const responseData = {
        id: "file_123",
        url: "https://storage.test.com/file",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.putRaw(
        "/files/upload",
        fileData,
        "text/plain"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/files/upload",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "text/plain",
            Authorization: "Bearer frt_test1234567890abcdef",
          }),
          body: fileData,
        })
      );
      expect(result).toEqual(responseData);
    });

    it("should handle ReadableStream uploads", async () => {
      const streamData = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("test data"));
          controller.close();
        },
      });
      const responseData = { id: "stream_123" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.putRaw(
        "/streams/upload",
        streamData,
        "application/octet-stream"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/streams/upload",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/octet-stream",
          }),
          body: streamData,
        })
      );
      expect(result).toEqual(responseData);
    });

    it("should handle raw uploads with custom headers", async () => {
      const fileData = Buffer.from("test content");
      const customHeaders = { "X-Custom-Header": "custom-value" };
      const responseData = { id: "file_123" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => responseData,
      });

      const result = await httpClient.putRaw(
        "/files/upload",
        fileData,
        "text/plain",
        customHeaders
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/files/upload",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "text/plain",
            "X-Custom-Header": "custom-value",
          }),
          body: fileData,
        })
      );
      expect(result).toEqual(responseData);
    });
  });

  describe("SSE Streaming", () => {
    it("should handle Server-Sent Events streaming", async () => {
      const events = [
        { type: "event1", data: { message: "Hello" } },
        { type: "event2", data: { message: "World" } },
      ];

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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: stream,
      });

      const receivedEvents = [];
      for await (const event of httpClient.stream("/events")) {
        receivedEvents.push(event);
      }

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0]).toEqual(events[0]);
      expect(receivedEvents[1]).toEqual(events[1]);
    });

    it("should handle streaming with query parameters", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: stream,
      });

      const params = { type: "user", since: "2023-01-01" };

      for await (const _event of httpClient.stream("/events", params)) {
        // Process events
      }

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/events?type=user&since=2023-01-01"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should handle malformed SSE data", async () => {
      const malformedData = "invalid event stream data";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(malformedData));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: stream,
      });

      const receivedEvents = [];
      for await (const event of httpClient.stream("/events")) {
        receivedEvents.push(event);
      }

      // Should handle malformed data gracefully
      expect(receivedEvents).toHaveLength(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle HTTP error responses", async () => {
      const errorResponse = createMockErrorResponse({
        code: "NOT_FOUND",
        message: "Resource not found",
        requestId: "req_123",
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => errorResponse,
      });

      await expect(httpClient.get("/not-found")).rejects.toThrow(
        "Resource not found"
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network unreachable"));

      await expect(httpClient.get("/test")).rejects.toThrow(NetworkError);
    });

    it("should handle timeout errors", async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("AbortError")), 100);
          })
      );

      await expect(httpClient.get("/test")).rejects.toThrow(NetworkError);
    });

    it("should handle malformed JSON responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => {
          throw new Error("Unexpected token in JSON");
        },
      });

      await expect(httpClient.get("/test")).rejects.toThrow();
    });

    it("should handle non-JSON response with schema validation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/plain" }),
        text: async () => "plain text response",
      });

      const schema = z.string();

      const result = await httpClient.get("/test", undefined, schema);
      expect(result).toBe("plain text response");
    });
  });

  describe("Retry Logic", () => {
    it("should retry on rate limit errors", async () => {
      const errorResponse = createMockErrorResponse({
        code: "RATE_LIMITED",
        message: "Rate limit exceeded",
        requestId: "req_123",
      });

      // First call fails with 429
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          "content-type": "application/json",
          "Retry-After": "1",
        }),
        json: async () => errorResponse,
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "success" }),
      });

      const result = await httpClient.get("/test");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: "success" });
    });

    it("should retry on server errors", async () => {
      const errorResponse = createMockErrorResponse({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        requestId: "req_123",
      });

      // First call fails with 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => errorResponse,
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "success" }),
      });

      const result = await httpClient.get("/test");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: "success" });
    });

    it("should not retry on client errors (4xx except 429)", async () => {
      const errorResponse = createMockErrorResponse({
        code: "BAD_REQUEST",
        message: "Bad request",
        requestId: "req_123",
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => errorResponse,
      });

      await expect(httpClient.get("/test")).rejects.toThrow("Bad request");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should respect max retry limit", async () => {
      const errorResponse = createMockErrorResponse({
        code: "RATE_LIMITED",
        message: "Rate limit exceeded",
        requestId: "req_123",
      });

      // All calls fail with 429
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => errorResponse,
        });
      }

      await expect(httpClient.get("/test")).rejects.toThrow(
        "Rate limit exceeded"
      );
      // Should retry 3 times (1 initial + 2 retries with maxRetries: 2 from test config)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("Logging", () => {
    it("should log requests when debug is enabled", async () => {
      const debugConfig = createMockConfig({ debug: true });
      const debugClient = new HttpClient(debugConfig);
      const mockLogger = vi.fn();
      debugConfig.logger = { request: mockLogger };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "test" }),
      });

      await debugClient.get("/test");

      expect(mockLogger).toHaveBeenCalled();
    });

    it("should log responses when debug is enabled", async () => {
      const debugConfig = createMockConfig({ debug: true });
      const debugClient = new HttpClient(debugConfig);
      const mockLogger = vi.fn();
      debugConfig.logger = { response: mockLogger };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "test" }),
      });

      await debugClient.get("/test");

      expect(mockLogger).toHaveBeenCalled();
    });

    it("should log errors when debug is enabled", async () => {
      const debugConfig = createMockConfig({ debug: true });
      const debugClient = new HttpClient(debugConfig);
      const mockLogger = vi.fn();
      debugConfig.logger = { error: mockLogger };

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await debugClient.get("/test").catch(() => {});

      expect(mockLogger).toHaveBeenCalled();
    });
  });

  describe("Custom Fetch Implementation", () => {
    it("should use custom fetch implementation when provided", async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "custom fetch" }),
      });

      const customConfig = createMockConfig({ fetch: customFetch });
      const customClient = new HttpClient(customConfig);

      const result = await customClient.get("/test");

      expect(customFetch).toHaveBeenCalled();
      expect(result).toEqual({ data: "custom fetch" });
    });
  });

  describe("URL Construction", () => {
    it("should handle URLs with query parameters correctly", async () => {
      const params = {
        search: "test query",
        filter: "active",
        page: "1",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: [] }),
      });

      await httpClient.get("/search", params);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("search=test%20query&filter=active&page=1"),
        expect.any(Object)
      );
    });

    it("should handle special characters in query parameters", async () => {
      const params = { query: "a+b=c&d=e" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: [] }),
      });

      await httpClient.get("/search", params);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("query=a%2Bb%3Dc%26d%3De"),
        expect.any(Object)
      );
    });
  });
});

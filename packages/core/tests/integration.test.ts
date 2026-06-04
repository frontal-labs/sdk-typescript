/**
 * Integration tests for the complete @frontal-labs/core package
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { FrontalClient } from "../src/client";
import { clientConfigSchema } from "../src/config";
import { parseFrontalError, ValidationError } from "../src/errors";
import { keys } from "../src/keys";
import { createPageResult } from "../src/pagination";

// Inline test utilities to avoid import issues
const _createMockConfig = (overrides = {}) => ({
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

const createMockErrorResponse = (overrides = {}) => ({
  code: "TEST_ERROR",
  message: "Test error message",
  requestId: "req_test123",
  docs: "https://docs.test.com/errors/test-error",
  fields: [{ field: "email", code: "INVALID", message: "Invalid email" }],
  ...overrides,
});

type MockFetchResponse = {
  ok: boolean;
  status: number;
  headers: Headers;
  json: () => Promise<unknown>;
};

const createMockFetch = (responses: MockFetchResponse[] = []) => {
  let callCount = 0;
  return vi
    .fn()
    .mockImplementation(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        const response = responses[callCount] ||
          responses[0] || {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({ data: "test" }),
          };

        callCount++;
        return response;
      }
    );
};

const cleanupMocks = () => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
};

describe("Integration Tests", () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch();
    global.fetch = mockFetch as unknown as typeof fetch;
    cleanupMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe("Complete SDK Workflow", () => {
    it("should handle end-to-end API workflow with configuration, requests, and error handling", async () => {
      // 1. Setup configuration
      const config = clientConfigSchema.parse({
        apiKey: "frt_integration1234567890abcdef",
        environment: "test",
        timeout: 5000,
        maxRetries: 2,
        debug: true,
      });

      // 2. Create client
      const client = new FrontalClient(config);

      // 3. Define response schema
      const userSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        createdAt: z.string(),
      });

      // 4. Mock successful response
      const userData = {
        id: "user_123",
        name: "John Doe",
        email: "john@example.com",
        createdAt: "2023-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => userData,
      });

      // 5. Make request and validate
      const user = await client.get("/users/123", userSchema);

      expect(user).toEqual(userData);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.frontal.dev/v1/users/123",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer frt_integration1234567890abcdef",
          }),
        })
      );
    });

    it("should handle error scenarios with proper error mapping", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_error1234567890abcdef",
        maxRetries: 1,
      });

      const client = new FrontalClient(config);

      // Mock error response
      const errorResponse = createMockErrorResponse({
        code: "NOT_FOUND",
        message: "User not found",
        requestId: "req_error_123",
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => errorResponse,
      });

      // Should throw appropriate error
      await expect(client.get("/users/999")).rejects.toThrow("User not found");
    });

    it("should handle paginated responses with iteration", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_pagination1234567890abcdef",
      });

      const client = new FrontalClient(config);

      // Mock paginated responses
      const page1Data = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];
      const page2Data = [
        { id: 3, name: "Item 3" },
        { id: 4, name: "Item 4" },
      ];

      const itemSchema = z.object({
        id: z.number(),
        name: z.string(),
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            data: page1Data,
            pagination: {
              cursor: "cursor_123",
              hasMore: true,
              total: 4,
              limit: 2,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            data: page2Data,
            pagination: {
              cursor: "cursor_456",
              hasMore: false,
              total: 4,
              limit: 2,
            },
          }),
        });

      // Get first page
      const page1 = await client.get(
        "/items",
        z.object({
          data: z.array(itemSchema),
          pagination: z.object({
            cursor: z.string(),
            hasMore: z.boolean(),
            total: z.number(),
            limit: z.number(),
          }),
        })
      );

      expect(page1.data).toEqual(page1Data);
      expect(page1.pagination.hasMore).toBe(true);

      // Get second page
      const page2 = await client.get(
        "/items?cursor=cursor_123",
        z.object({
          data: z.array(itemSchema),
          pagination: z.object({
            cursor: z.string(),
            hasMore: z.boolean(),
            total: z.number(),
            limit: z.number(),
          }),
        })
      );

      expect(page2.data).toEqual(page2Data);
      expect(page2.pagination.hasMore).toBe(false);
    });
  });

  describe("Configuration Integration", () => {
    it("should integrate environment variables with client configuration", () => {
      // Set up environment
      process.env.FRONTAL_API_KEY = "frt_env1234567890abcdef";
      process.env.FRONTAL_ENVIRONMENT = "integration";
      process.env.FRONTAL_DEBUG = "true";

      // Parse environment
      const envConfig = keys.client.parse(process.env);

      // Create client configuration
      const config = clientConfigSchema.parse({
        apiKey: envConfig.FRONTAL_API_KEY,
        environment: envConfig.FRONTAL_ENVIRONMENT,
        debug: envConfig.FRONTAL_DEBUG,
      });

      const client = new FrontalClient(config);

      expect(client).toBeInstanceOf(FrontalClient);
    });

    it("should handle configuration validation errors", () => {
      expect(() => {
        clientConfigSchema.parse({
          apiKey: "invalid_key", // Invalid format
          environment: "test",
        });
      }).toThrow();
    });
  });

  describe("Error Handling Integration", () => {
    it("should integrate error parsing with HTTP client", async () => {
      const errorResponse = createMockErrorResponse({
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
        requestId: "req_validation_123",
        fields: [
          { field: "email", code: "INVALID_FORMAT", message: "Invalid email" },
        ],
      });

      const parsedError = parseFrontalError(errorResponse, 400);

      expect(parsedError).toBeInstanceOf(ValidationError);
      expect(parsedError.statusCode).toBe(400);
      expect((parsedError as ValidationError).fields).toHaveLength(1);
    });

    it("should handle network errors gracefully", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_network1234567890abcdef",
        timeout: 1000,
      });

      const client = new FrontalClient(config);

      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error("Network unreachable"));

      await expect(client.get("/test")).rejects.toThrow("Network unreachable");
    });
  });

  describe("Retry Logic Integration", () => {
    it("should integrate retry logic with HTTP client", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_retry1234567890abcdef",
        maxRetries: 2,
        retryDelay: 100,
      });

      const client = new FrontalClient(config);

      // First call fails with rate limit
      const rateLimitError = createMockErrorResponse({
        code: "RATE_LIMITED",
        message: "Rate limit exceeded",
        requestId: "req_rate_123",
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({
            "content-type": "application/json",
            "Retry-After": "1",
          }),
          json: async () => rateLimitError,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ data: "success" }),
        });

      const result = await client.get("/test");

      expect(result).toEqual({ data: "success" });
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial call + 1 retry
    });

    it("should respect retry limits", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_limit1234567890abcdef",
        maxRetries: 1, // Only 1 retry allowed
        retryDelay: 50,
      });

      const client = new FrontalClient(config);

      const serverError = createMockErrorResponse({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        requestId: "req_server_123",
      });

      // All calls fail
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => serverError,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => serverError,
        });

      await expect(client.get("/test")).rejects.toThrow(
        "Internal server error"
      );
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial call + 1 retry (maxRetries = 1)
    });
  });

  describe("Pagination Integration", () => {
    it("should integrate pagination with async iteration", async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      // Create a mock PageResult
      let callCount = 0;
      const createMockPage = (startIndex: number, pageSize: number) => {
        const pageItems = items.slice(startIndex, startIndex + pageSize);
        const hasNext = startIndex + pageSize < items.length;

        return createPageResult(
          {
            data: pageItems,
            pagination: {
              cursor: hasNext ? `cursor_${startIndex}` : null,
              hasMore: hasNext,
              total: items.length,
            },
          },
          async () => {
            callCount++;
            if (hasNext) {
              return createMockPage(startIndex + pageSize, pageSize);
            }
            return null;
          }
        );
      };

      const pageResult = createMockPage(0, 3);

      // Test async iteration
      const collectedItems = [];
      for await (const item of pageResult) {
        collectedItems.push(item);
      }

      expect(collectedItems).toEqual(items);
      expect(collectedItems).toHaveLength(10);
      expect(callCount).toBe(3); // 3 pages to get all 10 items (3, 3, 4)
    });

    it("should integrate pagination with all() method", async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      let callCount = 0;
      const createMockPage = (startIndex: number) => {
        const pageItems = items.slice(startIndex, startIndex + 2);
        const hasNext = startIndex + 2 < items.length;

        return createPageResult(
          {
            data: pageItems,
            pagination: {
              cursor: hasNext ? `cursor_${startIndex}` : null,
              hasMore: hasNext,
              total: items.length,
            },
          },
          async () => {
            callCount++;
            if (hasNext) {
              return createMockPage(startIndex + 2);
            }
            return null;
          }
        );
      };

      const pageResult = createMockPage(0);
      const allItems = await pageResult.all();

      expect(allItems).toEqual(items);
      expect(allItems).toHaveLength(5);
      expect(callCount).toBe(2); // 2 additional pages after the first
    });
  });

  describe("Schema Validation Integration", () => {
    it("should integrate Zod schemas with API responses", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_schema1234567890abcdef",
      });

      const client = new FrontalClient(config);

      // Define complex schema
      const userSchema = z.object({
        id: z.string(),
        profile: z.object({
          name: z.string(),
          email: z.string().email(),
          age: z.number().min(0).max(120),
        }),
        preferences: z.object({
          theme: z.enum(["light", "dark"]),
          notifications: z.boolean(),
        }),
        metadata: z.record(z.unknown()).optional(),
      });

      const validUser = {
        id: "user_123",
        profile: {
          name: "John Doe",
          email: "john@example.com",
          age: 30,
        },
        preferences: {
          theme: "dark",
          notifications: true,
        },
        metadata: {
          source: "web",
          version: "1.0.0",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => validUser,
      });

      const user = await client.get("/users/123", userSchema);

      expect(user).toEqual(validUser);
      expect(user.profile.age).toBe(30);
      expect(user.preferences.theme).toBe("dark");
    });

    it("should reject invalid data with schema validation", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_invalid1234567890abcdef",
        debug: false, // Disable debug to ensure validation errors are thrown
      });

      const client = new FrontalClient(config);

      const userSchema = z.object({
        id: z.string(),
        email: z.string().email(),
        age: z.number().min(0),
      });

      const invalidUser = {
        id: "user_123",
        email: "not-an-email", // Invalid email
        age: -5, // Invalid age
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => invalidUser,
      });

      await expect(client.get("/users/123", userSchema)).rejects.toThrow();
    });
  });

  describe("Streaming Integration", () => {
    it("should integrate SSE streaming with client", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_stream1234567890abcdef",
      });

      const client = new FrontalClient(config);

      const events = [
        { type: "user_created", data: { id: 1, name: "User 1" } },
        { type: "user_updated", data: { id: 1, name: "User 1 Updated" } },
        { type: "user_deleted", data: { id: 1 } },
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
      for await (const event of client.stream("/events")) {
        receivedEvents.push(event);
      }

      expect(receivedEvents).toEqual(events);
      expect(receivedEvents).toHaveLength(3);
    });
  });

  describe("Binary Upload Integration", () => {
    it("should integrate binary uploads with client", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_binary1234567890abcdef",
      });

      const client = new FrontalClient(config);

      const fileData = Buffer.from("test file content");
      const uploadResponse = {
        id: "file_123",
        url: "https://storage.test.com/file_123",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => uploadResponse,
      });

      const result = await client.putRaw(
        "/files/upload",
        fileData,
        "text/plain"
      );

      expect(result).toEqual(uploadResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.frontal.dev/v1/files/upload",
        expect.objectContaining({
          method: "PUT",
          body: fileData,
        })
      );
    });
  });

  describe("Performance Integration", () => {
    it("should handle multiple concurrent requests efficiently", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_concurrent1234567890abcdef",
        maxRetries: 1,
      });

      const client = new FrontalClient(config);

      // Mock multiple successful responses
      const responses = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      responses.forEach((response, _index) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => response,
        });
      });

      const itemSchema = z.object({
        id: z.number(),
        name: z.string(),
      });

      // Make concurrent requests
      const promises = responses.map((_, index) =>
        client.get(`/items/${index + 1}`, itemSchema)
      );

      const results = await Promise.all(promises);

      expect(results).toEqual(responses);
      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it("should handle mixed success and failure scenarios", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_mixed1234567890abcdef",
        maxRetries: 1,
      });

      const client = new FrontalClient(config);

      // Mock mixed responses
      const successResponse = { id: 1, name: "Success" };
      const errorResponse = createMockErrorResponse({
        code: "NOT_FOUND",
        message: "Not found",
        requestId: "req_mixed_123",
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => successResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => errorResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => successResponse,
        });

      const itemSchema = z.object({
        id: z.number(),
        name: z.string(),
      });

      const results = await Promise.allSettled([
        client.get("/items/1", itemSchema),
        client.get("/items/999", itemSchema),
        client.get("/items/2", itemSchema),
      ]);

      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");
      expect(results[2].status).toBe("fulfilled");

      if (results[0].status === "fulfilled") {
        expect(results[0].value).toEqual(successResponse);
      }
      if (results[2].status === "fulfilled") {
        expect(results[2].value).toEqual(successResponse);
      }
    });
  });

  describe("Real-world Scenario Integration", () => {
    it("should handle a complete user management workflow", async () => {
      const config = clientConfigSchema.parse({
        apiKey: "frt_workflow1234567890abcdef",
        environment: "development",
        debug: true,
      });

      const client = new FrontalClient(config);

      const userSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        createdAt: z.string(),
        updatedAt: z.string().optional(),
      });

      const userListSchema = z.object({
        data: z.array(userSchema),
        pagination: z.object({
          cursor: z.string(),
          hasMore: z.boolean(),
          total: z.number(),
          limit: z.number(),
        }),
      });

      // 1. Create a user
      const newUser = {
        name: "Jane Doe",
        email: "jane@example.com",
      };

      const createdUser = {
        id: "user_123",
        ...newUser,
        createdAt: "2023-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => createdUser,
      });

      const user = await client.post("/users", newUser, userSchema);
      expect(user.id).toBe("user_123");

      // 2. List users
      const usersList = {
        data: [createdUser],
        pagination: {
          cursor: "cursor_123",
          hasMore: false,
          total: 1,
          limit: 10,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => usersList,
      });

      const userList = await client.get("/users", userListSchema);
      expect(userList.data).toHaveLength(1);
      expect(userList.data[0].id).toBe("user_123");

      // 3. Update the user
      const updateUser = { name: "Jane Smith" };
      const updatedUserData = {
        ...createdUser,
        ...updateUser,
        updatedAt: "2023-01-02T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => updatedUserData,
      });

      const updatedUser = await client.patch(
        `/users/${user.id}`,
        updateUser,
        userSchema
      );
      expect(updatedUser.name).toBe("Jane Smith");
      expect(updatedUser.updatedAt).toBe("2023-01-02T00:00:00Z");

      // 4. Delete the user
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
        json: async () => null,
      });

      await client.delete(`/users/${user.id}`);

      // Verify all requests were made
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });
});

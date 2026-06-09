/**
 * Comprehensive tests for Zod schemas
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type ErrorField,
  errorFieldSchema,
  errorResponseSchema,
  type FilterConditions,
  type FilterValue,
  filterConditionsSchema,
  filterValueSchema,
  type PaginationMeta,
  pageResultSchema,
  paginationMetaSchema,
  type ResponseMeta,
  type RetryConfig,
  responseMetaSchema,
  retryConfigSchema,
  timestampSchema,
} from "../src/schemas";
import { cleanupMocks } from "./setup";

describe("Schemas", () => {
  beforeEach(() => {
    cleanupMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe("timestampSchema", () => {
    it("should accept valid Date objects", () => {
      const validDates = [
        new Date(),
        new Date("2023-01-01T00:00:00Z"),
        new Date("2023-12-31T23:59:59.999Z"),
        new Date(0),
      ];

      validDates.forEach((date) => {
        const result = timestampSchema.parse(date);
        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBe(date.getTime());
      });
    });

    it("should reject invalid values", () => {
      const invalidValues = [
        "2023-01-01T00:00:00Z",
        1_234_567_890,
        null,
        undefined,
        {},
        "invalid date",
      ];

      invalidValues.forEach((value) => {
        expect(() => timestampSchema.parse(value)).toThrow();
      });
    });

    it("should transform dates correctly", () => {
      const originalDate = new Date("2023-01-01T00:00:00Z");
      const result = timestampSchema.parse(originalDate);

      expect(result).not.toBe(originalDate); // Should be a new Date instance
      expect(result.getTime()).toBe(originalDate.getTime());
    });

    it("should work with safeParse", () => {
      const validDate = new Date();
      const invalidValue = "not a date";

      const validResult = timestampSchema.safeParse(validDate);
      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.data).toBeInstanceOf(Date);
      }

      const invalidResult = timestampSchema.safeParse(invalidValue);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe("responseMetaSchema", () => {
    it("should accept complete valid response metadata", () => {
      const validMeta = {
        requestId: "req_1234567890",
        timestamp: new Date(),
        version: "1.0.0",
        substrate: "api-server-1",
        latency: {
          total: 150,
          substrate: 75,
        },
      };

      const result = responseMetaSchema.parse(validMeta);

      expect(result.requestId).toBe("req_1234567890");
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.version).toBe("1.0.0");
      expect(result.substrate).toBe("api-server-1");
      expect(result.latency?.total).toBe(150);
      expect(result.latency?.substrate).toBe(75);
    });

    it("should accept minimal valid response metadata", () => {
      const minimalMeta = {
        requestId: "req_123",
        timestamp: new Date(),
      };

      const result = responseMetaSchema.parse(minimalMeta);

      expect(result.requestId).toBe("req_123");
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.version).toBeUndefined();
      expect(result.substrate).toBeUndefined();
      expect(result.latency).toBeUndefined();
    });

    it("should accept partial latency information", () => {
      const metaWithPartialLatency = {
        requestId: "req_123",
        timestamp: new Date(),
        latency: {
          total: 100,
          // substrate is optional
        },
      };

      const result = responseMetaSchema.parse(metaWithPartialLatency);

      expect(result.latency?.total).toBe(100);
      expect(result.latency?.substrate).toBeUndefined();
    });

    it("should reject invalid request IDs", () => {
      const invalidMetas = [
        { timestamp: new Date() }, // Missing requestId
        { requestId: "", timestamp: new Date() }, // Empty requestId
        { requestId: 123, timestamp: new Date() }, // Non-string requestId
      ];

      invalidMetas.forEach((meta) => {
        expect(() => responseMetaSchema.parse(meta)).toThrow();
      });
    });

    it("should reject invalid timestamps", () => {
      const invalidMetas = [
        { requestId: "req_123", timestamp: "2023-01-01" }, // String timestamp
        { requestId: "req_123", timestamp: 1_234_567_890 }, // Number timestamp
        { requestId: "req_123" }, // Missing timestamp
      ];

      invalidMetas.forEach((meta) => {
        expect(() => responseMetaSchema.parse(meta)).toThrow();
      });
    });

    it("should reject invalid latency values", () => {
      const invalidMetas = [
        {
          requestId: "req_123",
          timestamp: new Date(),
          latency: {
            total: "not-a-number",
            substrate: 50,
          },
        },
        {
          requestId: "req_123",
          timestamp: new Date(),
          latency: {
            total: 100,
            substrate: "not-a-number",
          },
        },
        {
          requestId: "req_123",
          timestamp: new Date(),
          latency: {
            total: -10, // Negative latency
            substrate: 50,
          },
        },
      ];

      invalidMetas.forEach((meta) => {
        expect(() => responseMetaSchema.parse(meta)).toThrow();
      });
    });

    it("should infer correct TypeScript type", () => {
      const validMeta: ResponseMeta = {
        requestId: "req_123",
        timestamp: new Date(),
        version: "1.0.0",
      };

      const result = responseMetaSchema.parse(validMeta);
      expect(result).toBeDefined();
    });
  });

  describe("paginationMetaSchema", () => {
    it("should accept complete valid pagination metadata", () => {
      const validPagination = {
        cursor: "cursor_1234567890",
        hasMore: true,
        total: 1000,
        limit: 50,
        offset: 0,
      };

      const result = paginationMetaSchema.parse(validPagination);

      expect(result.cursor).toBe("cursor_1234567890");
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(1000);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("should accept minimal valid pagination metadata", () => {
      const minimalPagination = {
        cursor: "cursor_123",
        hasMore: false,
        limit: 10,
      };

      const result = paginationMetaSchema.parse(minimalPagination);

      expect(result.cursor).toBe("cursor_123");
      expect(result.hasMore).toBe(false);
      expect(result.limit).toBe(10);
      expect(result.total).toBeUndefined();
      expect(result.offset).toBeUndefined();
    });

    it("should reject invalid cursor values", () => {
      const invalidPaginations = [
        { hasMore: true, limit: 10 }, // Missing cursor
        { cursor: "", hasMore: true, limit: 10 }, // Empty cursor
        { cursor: 123, hasMore: true, limit: 10 }, // Non-string cursor
      ];

      invalidPaginations.forEach((pagination) => {
        expect(() => paginationMetaSchema.parse(pagination)).toThrow();
      });
    });

    it("should reject invalid hasMore values", () => {
      const invalidPaginations = [
        { cursor: "cursor_123", limit: 10 }, // Missing hasMore
        { cursor: "cursor_123", hasMore: "true", limit: 10 }, // String hasMore
        { cursor: "cursor_123", hasMore: 1, limit: 10 }, // Number hasMore
      ];

      invalidPaginations.forEach((pagination) => {
        expect(() => paginationMetaSchema.parse(pagination)).toThrow();
      });
    });

    it("should reject invalid limit values", () => {
      const invalidPaginations = [
        { cursor: "cursor_123", hasMore: true, limit: "10" }, // String limit
        { cursor: "cursor_123", hasMore: true, limit: 10.5 }, // Float limit
        { cursor: "cursor_123", hasMore: true, limit: -1 }, // Negative limit
      ];

      invalidPaginations.forEach((pagination) => {
        expect(() => paginationMetaSchema.parse(pagination)).toThrow();
      });
    });

    it("should reject invalid total and offset values", () => {
      const invalidPaginations = [
        {
          cursor: "cursor_123",
          hasMore: true,
          limit: 10,
          total: "100", // String total
        },
        {
          cursor: "cursor_123",
          hasMore: true,
          limit: 10,
          offset: "0", // String offset
        },
        {
          cursor: "cursor_123",
          hasMore: true,
          limit: 10,
          total: -100, // Negative total
        },
        {
          cursor: "cursor_123",
          hasMore: true,
          limit: 10,
          offset: -5, // Negative offset
        },
      ];

      invalidPaginations.forEach((pagination) => {
        expect(() => paginationMetaSchema.parse(pagination)).toThrow();
      });
    });

    it("should infer correct TypeScript type", () => {
      const validPagination: PaginationMeta = {
        cursor: "cursor_123",
        hasMore: true,
        limit: 25,
      };

      const result = paginationMetaSchema.parse(validPagination);
      expect(result).toBeDefined();
    });
  });

  describe("errorFieldSchema", () => {
    it("should accept valid error field", () => {
      const validField = {
        field: "email",
        code: "INVALID_FORMAT",
        message: "Email format is invalid",
      };

      const result = errorFieldSchema.parse(validField);

      expect(result.field).toBe("email");
      expect(result.code).toBe("INVALID_FORMAT");
      expect(result.message).toBe("Email format is invalid");
    });

    it("should reject invalid error field structures", () => {
      const invalidFields = [
        { code: "INVALID", message: "Invalid" }, // Missing field
        { field: "email", message: "Invalid" }, // Missing code
        { field: "email", code: "INVALID" }, // Missing message
        { field: 123, code: "INVALID", message: "Invalid" }, // Non-string field
        { field: "email", code: 123, message: "Invalid" }, // Non-string code
        { field: "email", code: "INVALID", message: 123 }, // Non-string message
      ];

      invalidFields.forEach((field) => {
        expect(() => errorFieldSchema.parse(field)).toThrow();
      });
    });

    it("should handle empty string values", () => {
      const fieldWithEmptyStrings = {
        field: "",
        code: "",
        message: "",
      };

      const result = errorFieldSchema.parse(fieldWithEmptyStrings);

      expect(result.field).toBe("");
      expect(result.code).toBe("");
      expect(result.message).toBe("");
    });

    it("should infer correct TypeScript type", () => {
      const validField: ErrorField = {
        field: "name",
        code: "REQUIRED",
        message: "Name is required",
      };

      const result = errorFieldSchema.parse(validField);
      expect(result).toBeDefined();
    });
  });

  describe("errorResponseSchema", () => {
    it("should accept complete valid error response", () => {
      const validErrorResponse = {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        requestId: "req_1234567890",
        docs: "https://docs.test.com/errors/validation",
        fields: [
          {
            field: "email",
            code: "INVALID_FORMAT",
            message: "Invalid email format",
          },
          {
            field: "password",
            code: "TOO_SHORT",
            message: "Password must be at least 8 characters",
          },
        ],
      };

      const result = errorResponseSchema.parse(validErrorResponse);

      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.message).toBe("Request validation failed");
      expect(result.requestId).toBe("req_1234567890");
      expect(result.docs).toBe("https://docs.test.com/errors/validation");
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0]).toEqual({
        field: "email",
        code: "INVALID_FORMAT",
        message: "Invalid email format",
      });
    });

    it("should accept minimal valid error response", () => {
      const minimalErrorResponse = {
        code: "UNKNOWN_ERROR",
        message: "An unknown error occurred",
        requestId: "req_unknown",
      };

      const result = errorResponseSchema.parse(minimalErrorResponse);

      expect(result.code).toBe("UNKNOWN_ERROR");
      expect(result.message).toBe("An unknown error occurred");
      expect(result.requestId).toBe("req_unknown");
      expect(result.docs).toBeUndefined();
      expect(result.fields).toBeUndefined();
    });

    it("should accept empty fields array", () => {
      const errorWithEmptyFields = {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        requestId: "req_validation",
        fields: [],
      };

      const result = errorResponseSchema.parse(errorWithEmptyFields);

      expect(result.fields).toEqual([]);
    });

    it("should reject invalid docs URLs", () => {
      const invalidErrors = [
        {
          code: "ERROR",
          message: "Error message",
          requestId: "req_123",
          docs: "not-a-url",
        },
        {
          code: "ERROR",
          message: "Error message",
          requestId: "req_123",
          docs: "ftp://invalid-protocol.com",
        },
      ];

      invalidErrors.forEach((error) => {
        expect(() => errorResponseSchema.parse(error)).toThrow();
      });
    });

    it("should reject invalid fields array", () => {
      const invalidErrors = [
        {
          code: "ERROR",
          message: "Error message",
          requestId: "req_123",
          fields: [
            { field: "email", code: "INVALID" }, // Missing message
          ],
        },
        {
          code: "ERROR",
          message: "Error message",
          requestId: "req_123",
          fields: ["not-an-object"], // Invalid field type
        },
      ];

      invalidErrors.forEach((error) => {
        expect(() => errorResponseSchema.parse(error)).toThrow();
      });
    });

    it("should reject missing required fields", () => {
      const invalidErrors = [
        { message: "Error message", requestId: "req_123" }, // Missing code
        { code: "ERROR", requestId: "req_123" }, // Missing message
        { code: "ERROR", message: "Error message" }, // Missing requestId
      ];

      invalidErrors.forEach((error) => {
        expect(() => errorResponseSchema.parse(error)).toThrow();
      });
    });
  });

  describe("retryConfigSchema", () => {
    it("should accept complete valid retry configuration", () => {
      const validRetryConfig = {
        maxAttempts: 5,
        baseDelay: 2000,
        strategy: "exponential" as const,
        on: [429, 500, 502, 503, 504],
        jitter: true,
      };

      const result = retryConfigSchema.parse(validRetryConfig);

      expect(result.maxAttempts).toBe(5);
      expect(result.baseDelay).toBe(2000);
      expect(result.strategy).toBe("exponential");
      expect(result.on).toEqual([429, 500, 502, 503, 504]);
      expect(result.jitter).toBe(true);
    });

    it("should apply default values", () => {
      const minimalRetryConfig = {};

      const result = retryConfigSchema.parse(minimalRetryConfig);

      expect(result.maxAttempts).toBe(3);
      expect(result.baseDelay).toBe(1000);
      expect(result.strategy).toBe("exponential");
      expect(result.on).toEqual([429, 500, 502, 503, 504]);
      expect(result.jitter).toBe(true);
    });

    it("should accept all valid strategies", () => {
      const validStrategies = ["exponential", "linear", "constant"] as const;

      validStrategies.forEach((strategy) => {
        const config = { strategy };
        const result = retryConfigSchema.parse(config);
        expect(result.strategy).toBe(strategy);
      });
    });

    it("should reject invalid max attempts", () => {
      const invalidConfigs = [
        { maxAttempts: -1 },
        { maxAttempts: 0 },
        { maxAttempts: 3.5 },
        { maxAttempts: "5" },
      ];

      invalidConfigs.forEach((config) => {
        expect(() => retryConfigSchema.parse(config)).toThrow();
      });
    });

    it("should reject invalid base delay", () => {
      const invalidConfigs = [
        { baseDelay: -100 },
        { baseDelay: 0 },
        { baseDelay: 3.14 },
        { baseDelay: "1000" },
      ];

      invalidConfigs.forEach((config) => {
        expect(() => retryConfigSchema.parse(config)).toThrow();
      });
    });

    it("should reject invalid strategies", () => {
      const invalidConfigs = [
        { strategy: "invalid" },
        { strategy: "EXPONENTIAL" },
        { strategy: "exponential " }, // Extra space
        { strategy: 123 },
      ];

      invalidConfigs.forEach((config) => {
        expect(() => retryConfigSchema.parse(config)).toThrow();
      });
    });

    it("should reject invalid status codes array", () => {
      const invalidConfigs = [
        { on: [400, 401, 404] }, // Client errors
        { on: [429, "500", 502] }, // Mixed types
        { on: [429.5, 500, 502] }, // Float codes
        { on: "not-an-array" },
      ];

      invalidConfigs.forEach((config) => {
        expect(() => retryConfigSchema.parse(config)).toThrow();
      });
    });

    it("should infer correct TypeScript type", () => {
      const validConfig: RetryConfig = {
        maxAttempts: 3,
        strategy: "linear",
      };

      const result = retryConfigSchema.parse(validConfig);
      expect(result).toBeDefined();
    });
  });

  describe("filterValueSchema", () => {
    it("should accept string values", () => {
      const validStrings = [
        "test",
        "",
        "string with spaces",
        "string-with-special-chars!@#$%",
      ];

      validStrings.forEach((value) => {
        const result = filterValueSchema.parse(value);
        expect(result).toBe(value);
      });
    });

    it("should accept number values", () => {
      const validNumbers = [
        0,
        42,
        -123,
        3.14,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      ];

      validNumbers.forEach((value) => {
        const result = filterValueSchema.parse(value);
        expect(result).toBe(value);
      });
    });

    it("should accept boolean values", () => {
      expect(filterValueSchema.parse(true)).toBe(true);
      expect(filterValueSchema.parse(false)).toBe(false);
    });

    it("should accept Date values", () => {
      const validDates = [new Date(), new Date("2023-01-01"), new Date(0)];

      validDates.forEach((date) => {
        const result = filterValueSchema.parse(date);
        expect(result).toBe(date);
      });
    });

    it("should accept string arrays", () => {
      const validArrays = [
        ["item1", "item2", "item3"],
        [""],
        ["single-item"],
        [],
      ];

      validArrays.forEach((array) => {
        const result = filterValueSchema.parse(array);
        expect(result).toEqual(array);
      });
    });

    it("should accept number arrays", () => {
      const validArrays = [[1, 2, 3], [0, -1, 3.14], []];

      validArrays.forEach((array) => {
        const result = filterValueSchema.parse(array);
        expect(result).toEqual(array);
      });
    });

    it("should accept null values", () => {
      expect(filterValueSchema.parse(null)).toBeNull();
    });

    it("should reject invalid values", () => {
      const invalidValues = [
        {},
        [1, "mixed"], // Mixed type arrays
        [{}], // Object arrays
        undefined,
        Symbol("test"),
        () => {}, // Function
      ];

      invalidValues.forEach((value) => {
        expect(() => filterValueSchema.parse(value)).toThrow();
      });
    });

    it("should infer correct TypeScript type", () => {
      const validValues: FilterValue[] = [
        "string",
        123,
        true,
        new Date(),
        ["array", "items"],
        null,
      ];

      validValues.forEach((value) => {
        const result = filterValueSchema.parse(value);
        expect(result).toBeDefined();
      });
    });
  });

  describe("filterConditionsSchema", () => {
    it("should accept simple filter values", () => {
      const validConditions = {
        name: "John",
        age: 30,
        active: true,
        createdAt: new Date(),
        tags: ["tag1", "tag2"],
        description: null,
      };

      const result = filterConditionsSchema.parse(validConditions);

      expect(result.name).toBe("John");
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.tags).toEqual(["tag1", "tag2"]);
      expect(result.description).toBeNull();
    });

    it("should accept complex filter operators", () => {
      const validConditions = {
        name: {
          eq: "John",
          ne: "Jane",
          contains: "oh",
          startsWith: "J",
          endsWith: "n",
        },
        age: {
          eq: 30,
          ne: 25,
          gt: 20,
          gte: 25,
          lt: 40,
          lte: 35,
        },
        status: {
          in: ["active", "pending"],
          nin: ["deleted", "archived"],
        },
      };

      const result = filterConditionsSchema.parse(validConditions);

      expect(result.name).toEqual({
        eq: "John",
        ne: "Jane",
        contains: "oh",
        startsWith: "J",
        endsWith: "n",
      });
      expect(result.age).toEqual({
        eq: 30,
        ne: 25,
        gt: 20,
        gte: 25,
        lt: 40,
        lte: 35,
      });
      expect(result.status).toEqual({
        in: ["active", "pending"],
        nin: ["deleted", "archived"],
      });
    });

    it("should accept mixed simple and complex conditions", () => {
      const mixedConditions = {
        name: "John", // Simple value
        age: { gt: 25, lt: 40 }, // Complex operators
        active: true, // Simple value
        tags: { in: ["vip", "premium"] }, // Complex operators
      };

      const result = filterConditionsSchema.parse(mixedConditions);

      expect(result.name).toBe("John");
      expect(result.age).toEqual({ gt: 25, lt: 40 });
      expect(result.active).toBe(true);
      expect(result.tags).toEqual({ in: ["vip", "premium"] });
    });

    it("should reject invalid operator values", () => {
      const invalidConditions = {
        age: {
          eq: "not-a-number", // Should be number
          gt: "greater", // Should be number
          in: "not-an-array", // Should be array
          contains: 123, // Should be string
        },
      };

      expect(() => filterConditionsSchema.parse(invalidConditions)).toThrow();
    });

    it("should reject invalid filter values", () => {
      const invalidConditions = {
        name: {}, // Invalid filter value
        age: undefined, // Invalid filter value
        active: Symbol("test"), // Invalid filter value
      };

      expect(() => filterConditionsSchema.parse(invalidConditions)).toThrow();
    });

    it("should accept empty conditions", () => {
      const emptyConditions = {};
      const result = filterConditionsSchema.parse(emptyConditions);
      expect(result).toEqual({});
    });

    it("should infer correct TypeScript type", () => {
      const validConditions: FilterConditions = {
        name: "John",
        age: { gt: 25 },
        active: true,
      };

      const result = filterConditionsSchema.parse(validConditions);
      expect(result).toBeDefined();
    });
  });

  describe("pageResultSchema", () => {
    it("should accept complete valid page result", () => {
      const validPageResult = {
        data: [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" },
          { id: 3, name: "Item 3" },
        ],
        meta: {
          requestId: "req_123",
          timestamp: new Date(),
          version: "1.0.0",
        },
        pagination: {
          cursor: "cursor_123",
          hasMore: true,
          total: 100,
          limit: 10,
          offset: 0,
        },
      };

      const result = pageResultSchema.parse(validPageResult);

      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({ id: 1, name: "Item 1" });
      expect(result.meta?.requestId).toBe("req_123");
      expect(result.pagination.cursor).toBe("cursor_123");
      expect(result.pagination.hasMore).toBe(true);
    });

    it("should accept minimal valid page result", () => {
      const minimalPageResult = {
        data: [],
        pagination: {
          cursor: "cursor_123",
          hasMore: false,
          limit: 10,
        },
      };

      const result = pageResultSchema.parse(minimalPageResult);

      expect(result.data).toEqual([]);
      expect(result.meta).toBeUndefined();
      expect(result.pagination.cursor).toBe("cursor_123");
      expect(result.pagination.hasMore).toBe(false);
    });

    it("should reject invalid data arrays", () => {
      const invalidPageResults = [
        {
          data: "not-an-array",
          pagination: { cursor: "cursor", hasMore: false, limit: 10 },
        },
        {
          data: null,
          pagination: { cursor: "cursor", hasMore: false, limit: 10 },
        },
        {
          // Missing data
          pagination: { cursor: "cursor", hasMore: false, limit: 10 },
        },
      ];

      invalidPageResults.forEach((pageResult) => {
        expect(() => pageResultSchema.parse(pageResult)).toThrow();
      });
    });

    it("should reject invalid pagination", () => {
      const invalidPageResults = [
        {
          data: [],
          pagination: {
            // Missing required fields
          },
        },
        {
          data: [],
          pagination: {
            cursor: "cursor",
            hasMore: "false", // Should be boolean
            limit: 10,
          },
        },
      ];

      invalidPageResults.forEach((pageResult) => {
        expect(() => pageResultSchema.parse(pageResult)).toThrow();
      });
    });

    it("should reject invalid meta", () => {
      const invalidPageResults = [
        {
          data: [],
          pagination: { cursor: "cursor", hasMore: false, limit: 10 },
          meta: {
            // Missing required fields
            timestamp: new Date(),
          },
        },
        {
          data: [],
          pagination: { cursor: "cursor", hasMore: false, limit: 10 },
          meta: {
            requestId: "req_123",
            timestamp: "not-a-date", // Should be Date
          },
        },
      ];

      invalidPageResults.forEach((pageResult) => {
        expect(() => pageResultSchema.parse(pageResult)).toThrow();
      });
    });
  });

  describe("Schema Integration", () => {
    it("should work together in complex scenarios", () => {
      // Create a complex API response structure
      const apiResponse = {
        data: [
          { id: 1, name: "User 1", email: "user1@example.com" },
          { id: 2, name: "User 2", email: "user2@example.com" },
        ],
        meta: {
          requestId: "req_complex_123",
          timestamp: new Date(),
          version: "1.0.0",
          substrate: "api-server-2",
          latency: { total: 200, substrate: 100 },
        },
        pagination: {
          cursor: "cursor_complex_456",
          hasMore: true,
          total: 500,
          limit: 2,
          offset: 0,
        },
      };

      const result = pageResultSchema.parse(apiResponse);

      expect(result.data).toHaveLength(2);
      expect(result.meta?.requestId).toBe("req_complex_123");
      expect(result.meta?.latency?.total).toBe(200);
      expect(result.pagination.total).toBe(500);
    });

    it("should handle error response with validation details", () => {
      const errorResponse = {
        code: "VALIDATION_ERROR",
        message: "Multiple validation errors",
        requestId: "req_validation_789",
        docs: "https://docs.test.com/errors/validation",
        fields: [
          {
            field: "email",
            code: "INVALID_FORMAT",
            message: "Email must be a valid email address",
          },
          {
            field: "password",
            code: "TOO_SHORT",
            message: "Password must be at least 8 characters long",
          },
          {
            field: "age",
            code: "INVALID_RANGE",
            message: "Age must be between 0 and 120",
          },
        ],
      };

      const result = errorResponseSchema.parse(errorResponse);

      expect(result.fields).toHaveLength(3);
      expect(result.fields[0].field).toBe("email");
      expect(result.fields[1].code).toBe("TOO_SHORT");
      expect(result.fields[2].message).toContain("between 0 and 120");
    });

    it("should handle complex filter conditions", () => {
      const complexFilters = {
        name: {
          contains: "John",
          startsWith: "J",
        },
        age: {
          gte: 18,
          lte: 65,
        },
        status: {
          in: ["active", "pending"],
        },
        createdAt: {
          gte: new Date("2023-01-01"),
          lt: new Date("2024-01-01"),
        },
        tags: ["vip", "premium"],
        archived: false,
      };

      const result = filterConditionsSchema.parse(complexFilters);

      expect(result.name).toEqual({
        contains: "John",
        startsWith: "J",
      });
      expect(result.age.gte).toBe(18);
      expect(result.age.lte).toBe(65);
      expect(result.status.in).toEqual(["active", "pending"]);
      expect(result.tags).toEqual(["vip", "premium"]);
      expect(result.archived).toBe(false);
    });
  });
});

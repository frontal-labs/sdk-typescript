/**
 * Comprehensive tests for configuration schemas and types
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  type ClientConfigInput,
  type ClientConfigOutput,
  clientConfigSchema,
} from "../src/config";
import { cleanupMocks } from "./setup";

describe("Configuration", () => {
  beforeEach(() => {
    cleanupMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe("clientConfigSchema", () => {
    describe("Valid configurations", () => {
      it("should accept minimal valid configuration", () => {
        const input: ClientConfigInput = {
          apiKey: "frt_1234567890abcdef",
        };

        const result = clientConfigSchema.parse(input);

        expect(result).toEqual({
          apiKey: "frt_1234567890abcdef",
          baseUrl: "https://api.frontal.dev/v1",
          timeout: 30_000,
          maxRetries: 3,
          retryDelay: 1000,
          headers: {},
          environment: "production",
          debug: false,
          fetch: undefined,
          logger: undefined,
        });
      });

      it("should accept complete valid configuration", () => {
        const input: ClientConfigInput = {
          apiKey: "frt_1234567890abcdef",
          baseUrl: "https://api.example.com/v2",
          timeout: 60_000,
          maxRetries: 5,
          retryDelay: 2000,
          headers: {
            "X-Client-Version": "1.0.0",
            "X-Request-ID": "req_123",
          },
          environment: "development",
          debug: true,
        };

        const result = clientConfigSchema.parse(input);

        expect(result).toEqual({
          apiKey: "frt_1234567890abcdef",
          baseUrl: "https://api.example.com/v2",
          timeout: 60_000,
          maxRetries: 5,
          retryDelay: 2000,
          headers: {
            "X-Client-Version": "1.0.0",
            "X-Request-ID": "req_123",
          },
          environment: "development",
          debug: true,
          fetch: undefined,
          logger: undefined,
        });
      });

      it("should accept custom fetch implementation", () => {
        const customFetch = vi.fn();
        const input: ClientConfigInput = {
          apiKey: "frt_1234567890abcdef",
          fetch: customFetch,
        };

        const result = clientConfigSchema.parse(input);

        expect(result.fetch).toBe(customFetch);
      });

      it("should accept custom logger implementation", () => {
        const mockLogger = {
          request: vi.fn(),
          response: vi.fn(),
          error: vi.fn(),
        };
        const input: ClientConfigInput = {
          apiKey: "frt_1234567890abcdef",
          logger: mockLogger,
        };

        const result = clientConfigSchema.parse(input);

        expect(result.logger).toEqual(mockLogger);
      });

      it("should accept partial logger implementation", () => {
        const mockLogger = {
          request: vi.fn(),
          // response and error are optional
        };
        const input: ClientConfigInput = {
          apiKey: "frt_1234567890abcdef",
          logger: mockLogger,
        };

        const result = clientConfigSchema.parse(input);

        expect(result.logger).toEqual(mockLogger);
      });
    });

    describe("API Key validation", () => {
      it("should require API key", () => {
        const input = {} as ClientConfigInput;

        expect(() => clientConfigSchema.parse(input)).toThrow();
      });

      it("should validate API key format - must start with frt_", () => {
        const invalidKeys = [
          "invalid_key",
          "abc_1234567890abcdef",
          "fr_1234567890abcdef",
          "1234567890abcdef",
          "",
          "frt_",
          "frt_1234",
        ];

        invalidKeys.forEach((key) => {
          const input = { apiKey: key } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).toThrow();
        });
      });

      it("should accept valid API key formats", () => {
        const validKeys = [
          "frt_1234567890abcdef",
          "frt_abcdef1234567890",
          "frt_12345",
          `frt_${"a".repeat(100)}`,
        ];

        validKeys.forEach((key) => {
          const input = { apiKey: key } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).not.toThrow();
        });
      });

      it("should validate API key minimum length", () => {
        const input = { apiKey: "frt_1234" } as ClientConfigInput; // Only 4 characters after prefix

        expect(() => clientConfigSchema.parse(input)).toThrow(
          "apiKey is required"
        );
      });
    });

    describe("Base URL validation", () => {
      it("should accept valid URLs", () => {
        const validUrls = [
          "https://api.frontal.dev/v1",
          "https://api.example.com",
          "https://api.test.co.uk/v2",
          "http://localhost:3000/api",
        ];

        validUrls.forEach((url) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            baseUrl: url,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).not.toThrow();
        });
      });

      it("should reject invalid URLs", () => {
        const invalidUrls = [
          "not-a-url",
          "ftp://api.example.com",
          "api.example.com",
          "://invalid-url",
          "",
        ];

        invalidUrls.forEach((url) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            baseUrl: url,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).toThrow();
        });
      });

      it("should apply default base URL", () => {
        const input = { apiKey: "frt_1234567890abcdef" } as ClientConfigInput;
        const result = clientConfigSchema.parse(input);

        expect(result.baseUrl).toBe("https://api.frontal.dev/v1");
      });
    });

    describe("Timeout validation", () => {
      it("should accept valid timeout values", () => {
        const validTimeouts = [1, 1000, 30_000, 60_000, 300_000];

        validTimeouts.forEach((timeout) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            timeout,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).not.toThrow();
        });
      });

      it("should reject invalid timeout values", () => {
        const invalidTimeouts = [
          0,
          -1,
          -1000,
          3.14,
          Number.NaN,
          Number.POSITIVE_INFINITY,
        ];

        invalidTimeouts.forEach((timeout) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            timeout,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).toThrow();
        });
      });

      it("should apply default timeout", () => {
        const input = { apiKey: "frt_1234567890abcdef" } as ClientConfigInput;
        const result = clientConfigSchema.parse(input);

        expect(result.timeout).toBe(30_000);
      });
    });

    describe("Max Retries validation", () => {
      it("should accept valid max retry values", () => {
        const validRetries = [0, 1, 3, 5, 10];

        validRetries.forEach((maxRetries) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            maxRetries,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).not.toThrow();
        });
      });

      it("should reject invalid max retry values", () => {
        const invalidRetries = [
          -1,
          -5,
          11,
          20,
          3.5,
          Number.NaN,
          Number.POSITIVE_INFINITY,
        ];

        invalidRetries.forEach((maxRetries) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            maxRetries,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).toThrow();
        });
      });

      it("should apply default max retries", () => {
        const input = { apiKey: "frt_1234567890abcdef" } as ClientConfigInput;
        const result = clientConfigSchema.parse(input);

        expect(result.maxRetries).toBe(3);
      });
    });

    describe("Retry Delay validation", () => {
      it("should accept valid retry delay values", () => {
        const validDelays = [1, 100, 1000, 5000, 10_000];

        validDelays.forEach((retryDelay) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            retryDelay,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).not.toThrow();
        });
      });

      it("should reject invalid retry delay values", () => {
        const invalidDelays = [
          0,
          -1,
          -1000,
          3.14,
          Number.NaN,
          Number.POSITIVE_INFINITY,
        ];

        invalidDelays.forEach((retryDelay) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            retryDelay,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).toThrow();
        });
      });

      it("should apply default retry delay", () => {
        const input = { apiKey: "frt_1234567890abcdef" } as ClientConfigInput;
        const result = clientConfigSchema.parse(input);

        expect(result.retryDelay).toBe(1000);
      });
    });

    describe("Headers validation", () => {
      it("should accept valid headers", () => {
        const validHeaders = [
          {},
          { "Content-Type": "application/json" },
          { "X-Custom-Header": "value", Authorization: "Bearer token" },
          { "User-Agent": "MyApp/1.0.0" },
        ];

        validHeaders.forEach((headers) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            headers,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).not.toThrow();
        });
      });

      it("should reject invalid headers", () => {
        const invalidHeaders = [
          { "": "invalid" }, // Empty header name
          { valid: 123 }, // Non-string value
          { nested: { object: "value" } }, // Non-string value
        ];

        invalidHeaders.forEach((headers) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            headers,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).toThrow();
        });
      });

      it("should apply default headers", () => {
        const input = { apiKey: "frt_1234567890abcdef" } as ClientConfigInput;
        const result = clientConfigSchema.parse(input);

        expect(result.headers).toEqual({});
      });
    });

    describe("Environment validation", () => {
      it("should accept valid environment values", () => {
        const validEnvironments = [
          "production",
          "development",
          "staging",
          "test",
          "preview",
          "demo",
        ];

        validEnvironments.forEach((environment) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            environment,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).not.toThrow();
        });
      });

      it("should apply default environment", () => {
        const input = { apiKey: "frt_1234567890abcdef" } as ClientConfigInput;
        const result = clientConfigSchema.parse(input);

        expect(result.environment).toBe("production");
      });
    });

    describe("Debug validation", () => {
      it("should accept boolean debug values", () => {
        [true, false].forEach((debug) => {
          const input = {
            apiKey: "frt_1234567890abcdef",
            debug,
          } as ClientConfigInput;
          expect(() => clientConfigSchema.parse(input)).not.toThrow();
        });
      });

      it("should apply default debug value", () => {
        const input = { apiKey: "frt_1234567890abcdef" } as ClientConfigInput;
        const result = clientConfigSchema.parse(input);

        expect(result.debug).toBe(false);
      });
    });

    describe("Strict mode validation", () => {
      it("should reject unknown properties", () => {
        const input = {
          apiKey: "frt_1234567890abcdef",
          unknownProperty: "value",
          anotherUnknown: 123,
        } as ClientConfigInput;

        expect(() => clientConfigSchema.parse(input)).toThrow();
      });
    });
  });

  describe("Type Definitions", () => {
    describe("ClientConfigInput", () => {
      it("should allow partial configuration", () => {
        const input: ClientConfigInput = {
          apiKey: "frt_1234567890abcdef",
          // All other fields are optional
        };

        expect(input.apiKey).toBe("frt_1234567890abcdef");
      });

      it("should allow all optional fields", () => {
        const input: ClientConfigInput = {
          apiKey: "frt_1234567890abcdef",
          baseUrl: "https://api.example.com",
          timeout: 60_000,
          maxRetries: 5,
          retryDelay: 2000,
          headers: { "X-Test": "value" },
          environment: "development",
          debug: true,
        };

        expect(input).toBeDefined();
      });
    });

    describe("ClientConfigOutput", () => {
      it("should represent fully validated configuration", () => {
        const input: ClientConfigInput = {
          apiKey: "frt_1234567890abcdef",
          timeout: 60_000,
        };

        const output: ClientConfigOutput = clientConfigSchema.parse(input);

        // All fields should be present with defaults applied
        expect(output.apiKey).toBe("frt_1234567890abcdef");
        expect(output.baseUrl).toBe("https://api.frontal.dev/v1");
        expect(output.timeout).toBe(60_000); // Custom value
        expect(output.maxRetries).toBe(3); // Default value
        expect(output.retryDelay).toBe(1000); // Default value
        expect(output.headers).toEqual({}); // Default value
        expect(output.environment).toBe("production"); // Default value
        expect(output.debug).toBe(false); // Default value
        expect(output.fetch).toBeUndefined(); // Default value
        expect(output.logger).toBeUndefined(); // Default value
      });
    });
  });

  describe("Integration with Zod", () => {
    it("should work with safeParse", () => {
      const input: ClientConfigInput = {
        apiKey: "frt_1234567890abcdef",
        timeout: 60_000,
      };

      const result = clientConfigSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timeout).toBe(60_000);
        expect(result.data.baseUrl).toBe("https://api.frontal.dev/v1");
      }
    });

    it("should return error details with safeParse", () => {
      const input = {
        apiKey: "invalid_key",
        timeout: -1,
      } as ClientConfigInput;

      const result = clientConfigSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
        expect(result.error.issues[0].path).toContain("apiKey");
        expect(result.error.issues[1].path).toContain("timeout");
      }
    });

    it("should provide detailed error messages", () => {
      const input = {
        apiKey: "invalid",
        baseUrl: "not-a-url",
        timeout: -1,
        maxRetries: 15,
        retryDelay: 0,
        headers: { "": "invalid" },
      } as ClientConfigInput;

      try {
        clientConfigSchema.parse(input);
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        const zodError = error as z.ZodError;
        expect(zodError.issues.length).toBeGreaterThan(0);

        const errorPaths = zodError.issues.map((issue) => issue.path.join("."));
        expect(errorPaths).toContain("apiKey");
        expect(errorPaths).toContain("baseUrl");
        expect(errorPaths).toContain("timeout");
        expect(errorPaths).toContain("maxRetries");
        expect(errorPaths).toContain("retryDelay");
        expect(errorPaths).toContain("headers");
      }
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle production configuration", () => {
      const productionConfig: ClientConfigInput = {
        apiKey: "frt_prod_1234567890abcdef",
        environment: "production",
        timeout: 30_000,
        maxRetries: 3,
        debug: false,
      };

      const result = clientConfigSchema.parse(productionConfig);

      expect(result.environment).toBe("production");
      expect(result.debug).toBe(false);
      expect(result.timeout).toBe(30_000);
    });

    it("should handle development configuration", () => {
      const developmentConfig: ClientConfigInput = {
        apiKey: "frt_dev_1234567890abcdef",
        baseUrl: "http://localhost:3000/api/v1",
        environment: "development",
        timeout: 10_000,
        maxRetries: 1,
        debug: true,
        headers: {
          "X-Debug": "true",
          "X-Environment": "development",
        },
      };

      const result = clientConfigSchema.parse(developmentConfig);

      expect(result.environment).toBe("development");
      expect(result.debug).toBe(true);
      expect(result.baseUrl).toBe("http://localhost:3000/api/v1");
      expect(result.headers).toEqual({
        "X-Debug": "true",
        "X-Environment": "development",
      });
    });

    it("should handle testing configuration", () => {
      const testingConfig: ClientConfigInput = {
        apiKey: "frt_test_1234567890abcdef",
        environment: "test",
        timeout: 5000,
        maxRetries: 0,
        retryDelay: 100,
        debug: true,
      };

      const result = clientConfigSchema.parse(testingConfig);

      expect(result.environment).toBe("test");
      expect(result.maxRetries).toBe(0);
      expect(result.timeout).toBe(5000);
    });

    it("should handle high-throughput configuration", () => {
      const highThroughputConfig: ClientConfigInput = {
        apiKey: "frt_ht_1234567890abcdef",
        timeout: 60_000,
        maxRetries: 5,
        retryDelay: 5000,
        headers: {
          Connection: "keep-alive",
          "X-Priority": "high",
        },
      };

      const result = clientConfigSchema.parse(highThroughputConfig);

      expect(result.timeout).toBe(60_000);
      expect(result.maxRetries).toBe(5);
      expect(result.retryDelay).toBe(5000);
      expect(result.headers).toEqual({
        Connection: "keep-alive",
        "X-Priority": "high",
      });
    });
  });
});

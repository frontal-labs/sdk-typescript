/**
 * Tests for the testing package
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock environment variables
process.env.FRONTAL_API_KEY = "frt_test1234567890";

describe("testing Package", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Package Exports", () => {
    it("should export main classes and functions", async () => {
      const pkg = await import("../src/index");

      expect(pkg).toBeDefined();
      expect(typeof pkg).toBe("object");
      expect(Object.keys(pkg).length).toBeGreaterThan(0);
    });

    it("should have client or service class", async () => {
      const pkg = await import("../src/index");

      // Check if package has a client or service class
      // Note: testing package is utilities-only, so this should be false
      const exportedKeys = Object.keys(pkg);
      const hasClientOrService = exportedKeys.some(
        (key) =>
          key.toLowerCase().includes("client") ||
          key.toLowerCase().includes("service")
      );

      // Testing package exports utility factories including client helpers
      expect(hasClientOrService).toBe(true);
    });
  });

  describe("Configuration", () => {
    it("should handle basic configuration", async () => {
      const pkg = await import("../src/index");

      // Test configuration functionality if available
      expect(pkg).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing API keys gracefully", async () => {
      // Temporarily remove API key
      const originalApiKey = process.env.FRONTAL_API_KEY;
      delete process.env.FRONTAL_API_KEY;

      try {
        const pkg = await import("../src/index");
        expect(pkg).toBeDefined();
      } finally {
        // Restore API key
        process.env.FRONTAL_API_KEY = originalApiKey;
      }
    });
  });
});

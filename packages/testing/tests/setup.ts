import { setupTestEnvironment } from "@frontal-labs/testing";

setupTestEnvironment();

// Global test utilities
import { vi } from "vitest";

// Mock fetch globally
vi.stubGlobal("fetch", vi.fn());

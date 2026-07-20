import { setupTestEnvironment } from "frontal/testing";

setupTestEnvironment();

// Global test utilities
import { vi } from "vitest";

// Mock fetch globally
vi.stubGlobal("fetch", vi.fn());

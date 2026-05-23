import { FrontalClient } from "@frontal/core";
import { createMockFetch, mockPageResponse } from "@frontal/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentsService } from "../src/service";
import { createAgentsClient } from "../src";

describe("createAgentsClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FRONTAL_AGENTS_API_URL;
    delete process.env.FRONTAL_API_URL;
  });

  it("creates an AgentsService from FrontalClient", async () => {
    const mock = createMockFetch([
      { method: "GET", path: "/v1/workflows", body: mockPageResponse([]) },
    ]);
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

    const agents = createAgentsClient(client);
    expect(agents).toBeInstanceOf(AgentsService);

    await agents.list();
    mock.expectCalled("GET", "/v1/workflows");
  });

  it("uses FRONTAL_AGENTS_API_URL when creating from config", async () => {
    const mock = createMockFetch([
      { method: "GET", path: "/v1/workflows", body: mockPageResponse([]) },
    ]);
    vi.stubGlobal("fetch", mock.fetch);
    process.env.FRONTAL_AGENTS_API_URL = "https://agents.test.frontal.dev/v1";
    process.env.FRONTAL_API_URL = "https://api.test.frontal.dev/v1";

    const agents = createAgentsClient({
      apiKey: "frt_test-api-key-1234567890",
    });

    await agents.list();
    expect(mock.requests[0]?.url).toContain("agents.test.frontal.dev");
  });
});

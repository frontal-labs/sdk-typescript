import { describe, expect, it } from "vitest";
import { createTestHttpClient } from "@frontal-labs/testing";
import {
  SandboxService,
  createSandboxClient,
  SandboxSchema,
} from "../src/index";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new SandboxService(http), mock };
}

const mockSandbox = {
  id: "sbx_1",
  name: "test-sandbox",
  templateId: "tmpl_1",
  status: "running",
  cpuLimit: "1",
  memoryLimit: "512Mi",
  timeoutSeconds: 300,
  networkPolicy: "none",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};
const mockExecution = {
  id: "exec_1",
  sandbox_id: "sbx_1",
  code: "print('hello')",
  language: "python",
  status: "completed",
  result: "hello",
  duration_ms: 150,
  created_at: "2025-01-01T00:00:00Z",
};

function pageWrap<T>(items: T[]) {
  return {
    data: items,
    pagination: { cursor: null, hasMore: false, total: items.length },
  };
}

describe("SandboxService", () => {
  it("lists sandboxes (paginated)", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/v1/sandbox/sandboxes",
        body: pageWrap([mockSandbox]),
      },
    ]);
    const result = await service.list();
    expect(result.data).toHaveLength(1);
  });
  it("creates a sandbox", async () => {
    const { service } = createService([
      { method: "POST", path: "/v1/sandbox/sandboxes", body: mockSandbox },
    ]);
    const result = await service.create({
      name: "test-sandbox",
      templateId: "tmpl_1",
    });
    expect(result.id).toBe("sbx_1");
  });
  it("starts a sandbox", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/sandbox/sandboxes/sbx_1/start",
        body: mockSandbox,
      },
    ]);
    const result = await service.start("sbx_1");
    expect(result.status).toBe("running");
  });
  it("stops a sandbox", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/sandbox/sandboxes/sbx_1/stop",
        body: { ...mockSandbox, status: "stopped" },
      },
    ]);
    const result = await service.stop("sbx_1");
    expect(result.status).toBe("stopped");
  });
  it("executes code", async () => {
    const { service } = createService([
      {
        method: "POST",
        path: "/v1/sandbox/sandboxes/sbx_1/execute",
        body: mockExecution,
      },
    ]);
    const result = await service.executions.execute("sbx_1", {
      code: "print('hello')",
      language: "python",
    });
    expect(result.status).toBe("completed");
  });
  it("lists templates", async () => {
    const { service } = createService([
      {
        method: "GET",
        path: "/v1/sandbox/templates",
        body: {
          data: [
            {
              id: "tmpl_1",
              name: "Python 3.12",
              image: "python:3.12",
              created_at: "",
            },
          ],
        },
      },
    ]);
    const result = await service.templates.list();
    expect(result.data).toHaveLength(1);
  });
});

describe("Schemas", () => {
  it("validates Sandbox", () => {
    expect(SandboxSchema.safeParse(mockSandbox).success).toBe(true);
  });
});

describe("createSandboxClient", () => {
  it("creates client", () => {
    expect(createSandboxClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      SandboxService
    );
  });
});

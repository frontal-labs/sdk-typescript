/**
 * Integration: Create sandbox → start → execute → stream → snapshot → delete.
 * Full sandbox lifecycle test.
 */
import { describe, expect, it } from "vitest";
import {
  createIntegrationHarness,
  integrationPage,
} from "@frontal-labs/testing";
import { SandboxService } from "@frontal-labs/sandbox";

const mockTemplate = {
  id: "tmpl_1", name: "Python 3.12", image: "python:3.12",
  created_at: "2025-01-01T00:00:00Z",
};

const mockSandbox = {
  id: "sbx_1", name: "test-sandbox", template_id: "tmpl_1",
  status: "running", cpu_limit: "1", memory_limit: "512Mi",
  timeout_seconds: 300, network_policy: "none",
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
};

const mockExecution = {
  id: "exec_1", sandbox_id: "sbx_1",
  code: "print('hello')", language: "python",
  status: "completed", result: "hello", duration_ms: 42,
  created_at: "2025-01-01T00:00:00Z",
};

describe("Sandbox isolation lifecycle", () => {
  it("create → start → execute → snapshot → delete", async () => {
    const harness = createIntegrationHarness([
      { method: "GET", path: "/v1/sandbox/templates", body: { data: [mockTemplate] } },
      { method: "POST", path: "/v1/sandbox/sandboxes", body: { ...mockSandbox, status: "creating" } },
      { method: "POST", path: "/v1/sandbox/sandboxes/sbx_1/start", body: mockSandbox },
      { method: "POST", path: "/v1/sandbox/sandboxes/sbx_1/execute", body: mockExecution },
      { method: "POST", path: "/v1/sandbox/sandboxes/sbx_1/snapshot", body: mockSandbox },
      { method: "POST", path: "/v1/sandbox/sandboxes/sbx_1/stop", body: { ...mockSandbox, status: "stopped" } },
      { method: "DELETE", path: "/v1/sandbox/sandboxes/sbx_1", status: 204 },
    ]);

    const { http } = harness.createHttp();
    const sandbox = new SandboxService(http);

    // Step 1: List templates
    const templates = await sandbox.templates.list();
    expect(templates.data.length).toBe(1);

    // Step 2: Create sandbox
    const sbx = await sandbox.sandboxes.create({
      name: "test-sandbox", template_id: "tmpl_1",
    });
    expect(sbx.id).toBe("sbx_1");

    // Step 3: Start
    const started = await sandbox.sandboxes.start(sbx.id);
    expect(started.status).toBe("running");

    // Step 4: Execute code
    const exec = await sandbox.executions.execute(sbx.id, {
      code: "print('hello')",
      language: "python",
    });
    expect(exec.status).toBe("completed");
    expect(exec.result).toBe("hello");

    // Step 5: Snapshot
    const snap = await sandbox.sandboxes.snapshot(sbx.id);
    expect(snap.id).toBe("sbx_1");

    // Step 6: Stop and delete
    const stopped = await sandbox.sandboxes.stop(sbx.id);
    expect(stopped.status).toBe("stopped");

    await sandbox.sandboxes.delete(sbx.id);
    harness.expectCalled("DELETE", "/v1/sandbox/sandboxes/sbx_1");
  });
});

import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { createSandboxClient, SandboxSdk } from "../src/index";

function createService(
  routes: {
    method: string;
    path: string | RegExp;
    status?: number;
    body?: unknown;
  }[] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new SandboxSdk(http), mock };
}

function noDoublePrefix(mock: { requests: { path: string }[] }): boolean {
  return !mock.requests.some((r) => r.path.includes("/v1/v1/"));
}

describe("SandboxSdk", () => {
  it("lists supported languages", async () => {
    const { service, mock } = createService([
      {
        method: "GET",
        path: "/sandbox/languages",
        body: ["Rust", "Python", "C++"],
      },
    ]);
    const langs = await service.languages();
    expect(langs).toContain("Python");
    mock.expectCalled("GET", "/sandbox/languages");
    expect(noDoublePrefix(mock)).toBe(true);
  });

  it("runs a self-test (compile + single run)", async () => {
    const { service, mock } = createService([
      {
        method: "POST",
        path: "/sandbox/self-test",
        body: {
          compile: { exitStatus: 0, stdout: "", stderr: "" },
          summary: {
            exitStatus: 0,
            stdout: "hello\n",
            stderr: "",
            executionTimeMs: 5,
            memoryUsageKib: 512,
          },
        },
      },
    ]);
    const result = await service.selfTest({
      language: "Python",
      code: "print('hello')",
      stdin: "",
    });
    expect(result.summary?.stdout).toBe("hello\n");
    // string language is normalized to { name }.
    mock.expectCalledWith("POST", "/sandbox/self-test", {
      language: { name: "Python" },
    });
  });

  it("submits a judged run against test cases", async () => {
    const { service, mock } = createService([
      {
        method: "POST",
        path: "/sandbox/submit",
        body: {
          compile: { exitStatus: 0, stdout: "", stderr: "" },
          cases: [
            {
              caseId: 1,
              exitStatus: 0,
              result: "JUDGE_RESULT_ACCEPTED",
              score: 100,
            },
          ],
          summary: { result: "JUDGE_RESULT_ACCEPTED", score: 100 },
        },
      },
    ]);
    const result = await service.submit({
      language: { name: "Python" },
      code: "print('ok')",
      task: {
        cases: [{ caseId: 1, score: 100, input: "ok\n", answer: "ok\n" }],
      },
    });
    expect(result.summary.score).toBe(100);
    expect(result.cases).toHaveLength(1);
    mock.expectCalled("POST", "/sandbox/submit");
  });
});

describe("createSandboxClient", () => {
  it("creates client", () => {
    expect(createSandboxClient({ apiKey: "frt_test-xxx" })).toBeInstanceOf(
      SandboxSdk
    );
  });
});

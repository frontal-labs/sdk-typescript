/**
 * Integration: list languages → self-test → judged submission.
 * Exercises the real sandbox compile-and-judge API.
 */
import { describe, expect, it } from "vitest";
import { createIntegrationHarness } from "@frontal-labs/_testing";
import { SandboxService } from "@frontal-labs/sandbox";

describe("Sandbox compile-and-judge", () => {
  it("languages → self-test → submit", async () => {
    const harness = createIntegrationHarness([
      {
        method: "GET",
        path: "/v1/sandbox/languages",
        body: ["Python", "Rust", "C++"],
      },
      {
        method: "POST",
        path: "/v1/sandbox/self-test",
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
      {
        method: "POST",
        path: "/v1/sandbox/submit",
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

    const { http } = harness.createHttp();
    const sandbox = new SandboxService(http);

    // Step 1: List supported languages.
    const languages = await sandbox.languages();
    expect(languages).toContain("Python");

    // Step 2: Self-test a snippet against a single input.
    const selfTest = await sandbox.selfTest({
      language: "Python",
      code: "print('hello')",
      stdin: "",
    });
    expect(selfTest.summary?.stdout).toBe("hello\n");

    // Step 3: Submit a judged run against test cases.
    const submission = await sandbox.submit({
      language: "Python",
      code: "print('ok')",
      task: {
        cases: [{ caseId: 1, score: 100, input: "ok\n", answer: "ok\n" }],
      },
    });
    expect(submission.summary.result).toBe("JUDGE_RESULT_ACCEPTED");
    harness.expectCalled("POST", "/v1/sandbox/submit");
  });
});

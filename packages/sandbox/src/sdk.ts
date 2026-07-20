import type { HttpClient } from "frontal/core";

/** Programming language selector for a sandbox request. */
export interface SandboxLanguage {
  /** Language name (e.g. "javascript", "python"). */
  name: string;
  /** Optional language-specific configuration. */
  configs?: Record<string, unknown>;
}

/** Sandbox execution tier for resource allocation. */
export type SandboxTier = "ANALYSIS" | "TOOLED" | "INTEGRATED";

/** Resource limits for sandbox execution. */
export interface SandboxResources {
  /** Compilation timeout in milliseconds. */
  compileTimeoutMs?: number;
  /** Compilation memory limit in bytes. */
  compileMemoryLimitBytes?: number;
  /** Execution timeout in milliseconds. */
  executeTimeoutMs?: number;
  /** Execution memory limit in bytes. */
  executeMemoryLimitBytes?: number;
  /** Maximum number of processes. */
  maxProcesses?: number;
}

/** Report from a compilation step. */
export interface CompileReport {
  /** Process exit status code. */
  exitStatus: number;
  /** Standard output from compilation. */
  stdout: string;
  /** Standard error from compilation. */
  stderr: string;
}

/** Input for a sandbox self-test execution. */
export interface SelfTestInput {
  /** Programming language to use. */
  language: SandboxLanguage | string;
  /** Source code to execute. */
  code: string;
  /** Optional stdin input. */
  stdin?: string;
  /** Execution tier for resource allocation. */
  tier?: SandboxTier;
  /** Resource limits. */
  resources?: SandboxResources;
}

/** Result from a sandbox self-test execution. */
export interface SelfTestResult {
  /** Compilation report. */
  compile: CompileReport;
  /** Execution summary, null if execution failed. */
  summary?: {
    exitStatus: number;
    stdout: string;
    stderr: string;
    executionTimeMs: number;
    memoryUsageKib: number;
  } | null;
}

/** A test case for code judging. */
export interface JudgeCase {
  /** Case identifier. */
  caseId: number;
  /** Score awarded for passing this case. */
  score: number;
  /** Case input data. */
  input: number[] | string;
  /** Expected answer. */
  answer: number[] | string;
}

/** Input for a sandbox submit (judge) execution. */
export interface SubmitInput {
  /** Programming language to use. */
  language: SandboxLanguage | string;
  /** Source code to execute. */
  code: string;
  /** Judge configuration (type of judging). */
  judge?: { judgeType: "classic" | "special" | "interactive" };
  /** Task definition with test cases. */
  task?: { taskType?: string; cases: JudgeCase[] };
  /** Resource limits for execution. */
  resourceLimits?: { timeLimitMs?: number; memoryLimitBytes?: number };
  /** Execution tier. */
  tier?: SandboxTier;
  /** Resource limits. */
  resources?: SandboxResources;
}

/** Result from a sandbox submit (judge) execution. */
export interface SubmitResult {
  /** Compilation report. */
  compile: CompileReport;
  /** Per-case judgement results. */
  cases: Array<{
    caseId: number;
    exitStatus: number;
    result: string;
    score: number;
  }>;
  /** Overall summary with result and score. */
  summary: { result: string; score: number };
}

/**
 * Client for the Frontal SandboxSdk — a compile-and-judge code execution engine
 * (`/v1/sandbox`). Run code once with a single input (`selfTest`) or judge it
 * against a set of test cases (`submit`).
 *
 * Paths are written without the leading `/v1` because the client base URL
 * already includes it.
 */
export class SandboxSdk {
  constructor(private readonly http: HttpClient) {}

  /** List the languages the sandbox can compile and run. */
  languages(): Promise<string[]> {
    return this.http.get<string[]>("/sandbox/languages");
  }

  /** Compile and run code once against a single stdin input. */
  selfTest(input: SelfTestInput): Promise<SelfTestResult> {
    return this.http.post<SelfTestResult>("/sandbox/self-test", {
      ...input,
      language:
        typeof input.language === "string"
          ? { name: input.language }
          : input.language,
    });
  }

  /** Compile code and judge it against a set of test cases. */
  submit(input: SubmitInput): Promise<SubmitResult> {
    return this.http.post<SubmitResult>("/sandbox/submit", {
      ...input,
      language:
        typeof input.language === "string"
          ? { name: input.language }
          : input.language,
    });
  }
}

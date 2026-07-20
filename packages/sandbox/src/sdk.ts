import type { HttpClient } from "@frontal-labs/core";

/** Programming language selector for a sandbox request. */
export interface SandboxLanguage {
  name: string;
  configs?: Record<string, unknown>;
}

export type SandboxTier = "ANALYSIS" | "TOOLED" | "INTEGRATED";

export interface SandboxResources {
  compileTimeoutMs?: number;
  compileMemoryLimitBytes?: number;
  executeTimeoutMs?: number;
  executeMemoryLimitBytes?: number;
  maxProcesses?: number;
}

export interface CompileReport {
  exitStatus: number;
  stdout: string;
  stderr: string;
}

export interface SelfTestInput {
  language: SandboxLanguage | string;
  code: string;
  stdin?: string;
  tier?: SandboxTier;
  resources?: SandboxResources;
}

export interface SelfTestResult {
  compile: CompileReport;
  summary?: {
    exitStatus: number;
    stdout: string;
    stderr: string;
    executionTimeMs: number;
    memoryUsageKib: number;
  } | null;
}

export interface JudgeCase {
  caseId: number;
  score: number;
  input: number[] | string;
  answer: number[] | string;
}

export interface SubmitInput {
  language: SandboxLanguage | string;
  code: string;
  judge?: { judgeType: "classic" | "special" | "interactive" };
  task?: { taskType?: string; cases: JudgeCase[] };
  resourceLimits?: { timeLimitMs?: number; memoryLimitBytes?: number };
  tier?: SandboxTier;
  resources?: SandboxResources;
}

export interface SubmitResult {
  compile: CompileReport;
  cases: Array<{
    caseId: number;
    exitStatus: number;
    result: string;
    score: number;
  }>;
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

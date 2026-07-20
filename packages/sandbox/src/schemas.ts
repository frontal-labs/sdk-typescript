import { z } from "zod";

/** Schema for a sandbox environment. */
export const SandboxSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    templateId: z.string(),
    status: z.enum(["creating", "running", "stopped", "deleted"]),
    cpuLimit: z.string(),
    memoryLimit: z.string(),
    timeoutSeconds: z.number().int(),
    networkPolicy: z.enum(["none", "egress", "full"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose();

/** Schema for a sandbox code execution. */
export const SandboxExecutionSchema = z
  .object({
    id: z.string(),
    sandboxId: z.string(),
    code: z.string(),
    language: z.enum(["javascript", "python", "typescript"]),
    status: z.enum(["queued", "running", "completed", "error", "timeout"]),
    result: z.unknown().optional(),
    error: z.string().optional(),
    durationMs: z.number().optional(),
    createdAt: z.string(),
  })
  .loose();

/** Schema for a sandbox template. */
export const SandboxTemplateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    image: z.string(),
    packages: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
    createdAt: z.string(),
  })
  .loose();

/** Schema for sandbox client configuration. */
export const sandboxConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

/** A sandbox environment. */
export type Sandbox = z.infer<typeof SandboxSchema>;
/** A sandbox code execution. */
export type SandboxExecution = z.infer<typeof SandboxExecutionSchema>;
/** A sandbox template. */
export type SandboxTemplate = z.infer<typeof SandboxTemplateSchema>;
/** Sandbox client configuration. */
export type SandboxConfig = z.input<typeof sandboxConfigSchema>;

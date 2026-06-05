import { z } from "zod";

export const SandboxSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    template_id: z.string(),
    status: z.enum(["creating", "running", "stopped", "deleted"]),
    cpu_limit: z.string(),
    memory_limit: z.string(),
    timeout_seconds: z.number().int(),
    network_policy: z.enum(["none", "egress", "full"]),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();
export const SandboxExecutionSchema = z
  .object({
    id: z.string(),
    sandbox_id: z.string(),
    code: z.string(),
    language: z.enum(["javascript", "python", "typescript"]),
    status: z.enum(["queued", "running", "completed", "error", "timeout"]),
    result: z.unknown().optional(),
    error: z.string().optional(),
    duration_ms: z.number().optional(),
    created_at: z.string(),
  })
  .passthrough();
export const SandboxTemplateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    image: z.string(),
    packages: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
    created_at: z.string(),
  })
  .passthrough();
export const sandboxConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type Sandbox = z.infer<typeof SandboxSchema>;
export type SandboxExecution = z.infer<typeof SandboxExecutionSchema>;
export type SandboxTemplate = z.infer<typeof SandboxTemplateSchema>;
export type SandboxConfig = z.input<typeof sandboxConfigSchema>;

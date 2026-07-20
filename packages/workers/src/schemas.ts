import { z } from "zod";

/**
 * Zod schema for deploying a worker.
 */
export const deployWorkerInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  entrypoint: z.string().optional(),
  envVars: z.record(z.string(), z.string()).optional(),
});

/**
 * Input for deploying a worker.
 */
export type DeployWorkerInput = z.infer<typeof deployWorkerInputSchema>;

/**
 * Zod schema for invoking a worker.
 */
export const invokeWorkerOptionsSchema = z.object({
  method: z.string().optional(),
  path: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z
    .union([
      z.string(),
      z.instanceof(Uint8Array),
      z.instanceof(ArrayBuffer),
      z.instanceof(Blob),
      z.instanceof(ReadableStream),
    ])
    .optional(),
});

/**
 * Options for invoking a worker.
 */
export type InvokeWorkerOptions = z.infer<typeof invokeWorkerOptionsSchema>;

/**
 * Zod schema for a worker reference.
 */
export const workerRefSchema = z.looseObject({
  name: z.string(),
});

/**
 * A deployed worker reference.
 */
export type WorkerRef = z.infer<typeof workerRefSchema>;

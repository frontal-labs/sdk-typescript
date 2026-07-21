import type { HttpClient } from "@frontal-labs/core";
import type {
  DeployWorkerInput,
  InvokeWorkerOptions,
  WorkerRef,
} from "./schemas";

/**
 * Client for the Frontal WorkersSdk API (`/v1/workers`) — the serverless edge
 * runtime. Deploy a worker from source (or a pre‑bundled ESZIP), then invoke it
 * by path.
 *
 * Paths are written without the leading `/v1` because the client base URL
 * already includes it.
 */
export class WorkersSdk {
  private static readonly BASE = "/workers";

  constructor(private readonly http: HttpClient) {}

  /** Deploy a worker from JSON source. */
  deploy(input: DeployWorkerInput): Promise<WorkerRef> {
    return this.http.post<WorkerRef>(WorkersSdk.BASE, {
      name: input.name,
      code: input.code,
      entrypoint: input.entrypoint,
      env_vars: input.envVars,
    });
  }

  /**
   * Invoke a deployed worker by name. Returns the raw {@link Response} so callers
   * can stream or parse the worker's output as needed.
   */
  invoke(name: string, opts: InvokeWorkerOptions = {}): Promise<Response> {
    const path = `${WorkersSdk.BASE}/${name}${opts.path ?? ""}`;
    const method = (opts.method ?? "GET").toUpperCase();
    if (method === "GET" || method === "HEAD") {
      return this.http.getRaw(path, undefined, opts.headers);
    }
    return this.http.postRaw(path, opts.body, opts.headers);
  }
}

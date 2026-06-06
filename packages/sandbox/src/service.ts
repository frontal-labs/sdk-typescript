import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type { Sandbox, SandboxExecution, SandboxTemplate } from "./schemas";

const asPagePayload = <T>(
  raw: unknown
): { data: T[]; pagination: PaginationMeta; meta?: unknown } =>
  raw as { data: T[]; pagination: PaginationMeta; meta?: unknown };

export class SandboxService {
  readonly executions: ExecutionsNamespace;
  readonly templates: TemplatesNamespace;
  readonly files: FilesNamespace;

  constructor(private readonly http: HttpClient) {
    this.executions = new ExecutionsNamespace(http);
    this.templates = new TemplatesNamespace(http);
    this.files = new FilesNamespace(http);
  }

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Sandbox>> {
    const raw = await this.http.get("/v1/sandbox/sandboxes", opts);
    return createPageResult(asPagePayload<Sandbox>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: {
    name: string;
    templateId: string;
    cpuLimit?: string;
    memoryLimit?: string;
    timeoutSeconds?: number;
  }): Promise<Sandbox> {
    return this.http.post("/v1/sandbox/sandboxes", input);
  }

  async get(id: string): Promise<Sandbox> {
    return this.http.get(`/v1/sandbox/sandboxes/${id}`);
  }

  async start(id: string): Promise<Sandbox> {
    return this.http.post(`/v1/sandbox/sandboxes/${id}/start`, {});
  }

  async stop(id: string): Promise<Sandbox> {
    return this.http.post(`/v1/sandbox/sandboxes/${id}/stop`, {});
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/sandbox/sandboxes/${id}`);
  }

  async snapshot(id: string): Promise<Sandbox> {
    return this.http.post(`/v1/sandbox/sandboxes/${id}/snapshot`, {});
  }
}

export class ExecutionsNamespace {
  constructor(private readonly http: HttpClient) {}
  async execute(
    sandboxId: string,
    input: { code: string; language: string }
  ): Promise<SandboxExecution> {
    return this.http.post(`/v1/sandbox/sandboxes/${sandboxId}/execute`, input);
  }
  async get(sandboxId: string, executionId: string): Promise<SandboxExecution> {
    return this.http.get(
      `/v1/sandbox/sandboxes/${sandboxId}/executions/${executionId}`
    );
  }
  async cancel(sandboxId: string, executionId: string): Promise<void> {
    return this.http.post(
      `/v1/sandbox/sandboxes/${sandboxId}/executions/${executionId}/cancel`,
      {}
    );
  }
  async *stream(
    sandboxId: string,
    executionId: string
  ): AsyncIterable<{ type: string; data: unknown }> {
    yield* this.http.stream(
      `/v1/sandbox/sandboxes/${sandboxId}/executions/${executionId}/stream`,
      {}
    );
  }
  async list(
    sandboxId: string,
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<SandboxExecution>> {
    const raw = await this.http.get(
      `/v1/sandbox/sandboxes/${sandboxId}/executions`,
      opts
    );
    return createPageResult(asPagePayload<SandboxExecution>(raw), (cursor) =>
      this.list(sandboxId, { ...opts, cursor })
    );
  }
}

export class TemplatesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(): Promise<{ data: SandboxTemplate[] }> {
    return this.http.get("/v1/sandbox/templates");
  }
  async create(
    input: Omit<SandboxTemplate, "id" | "createdAt">
  ): Promise<SandboxTemplate> {
    return this.http.post("/v1/sandbox/templates", input);
  }
  async get(id: string): Promise<SandboxTemplate> {
    return this.http.get(`/v1/sandbox/templates/${id}`);
  }
  async update(
    id: string,
    input: Partial<SandboxTemplate>
  ): Promise<SandboxTemplate> {
    return this.http.put(`/v1/sandbox/templates/${id}`, input);
  }
  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/sandbox/templates/${id}`);
  }
}

export class FilesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(sandboxId: string): Promise<{
    data: { name: string; size: number; modifiedAt: string }[];
  }> {
    return this.http.get(`/v1/sandbox/sandboxes/${sandboxId}/files`);
  }
  async upload(
    sandboxId: string,
    path: string,
    _content: string
  ): Promise<{ path: string; size: number }> {
    return this.http.post(`/v1/sandbox/sandboxes/${sandboxId}/files`, { path });
  }
  async download(
    sandboxId: string,
    path: string
  ): Promise<{ content: string }> {
    return this.http.get(`/v1/sandbox/sandboxes/${sandboxId}/files/download`, {
      path,
    });
  }
  async delete(sandboxId: string, path: string): Promise<void> {
    return this.http.delete(`/v1/sandbox/sandboxes/${sandboxId}/files`, {
      path,
    });
  }
}

import type { HttpClient } from "@frontal-labs/core";
import type {
  IFunctionsNamespace,
  IFunctionsVersionsNamespace,
  IFunctionsDeploymentsNamespace,
  IFunctionsExecutionsNamespace,
} from "./types";
import type {
  FunctionResource,
  FunctionDefinition,
  FunctionVersion,
  FunctionExecution,
  FunctionInvocationInput,
  FunctionInvocationResult,
  FunctionListResponse,
  FunctionVersionListResponse,
  FunctionExecutionListResponse,
} from "./schemas";

/**
 * Namespace for function CRUD operations.
 */
export class FunctionsNamespace implements IFunctionsNamespace {
  constructor(private readonly http: HttpClient) {}

  async create(definition: FunctionDefinition): Promise<FunctionResource> {
    return this.http.post<FunctionResource>("/functions", definition);
  }

  async list(
    opts: { cursor?: string; limit?: number } = {}
  ): Promise<FunctionListResponse> {
    return this.http.get<FunctionListResponse>("/functions", opts);
  }

  async get(id: string): Promise<FunctionResource> {
    return this.http.get<FunctionResource>(`/functions/${id}`);
  }

  async update(
    id: string,
    definition: FunctionDefinition
  ): Promise<FunctionResource> {
    return this.http.patch<FunctionResource>(`/functions/${id}`, definition);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/functions/${id}`);
  }
}

/**
 * Namespace for function version operations.
 */
export class FunctionsVersionsNamespace implements IFunctionsVersionsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    functionId: string,
    opts: { cursor?: string; limit?: number } = {}
  ): Promise<FunctionVersionListResponse> {
    return this.http.get<FunctionVersionListResponse>(
      `/functions/${functionId}/versions`,
      opts
    );
  }

  async get(functionId: string, version: number): Promise<FunctionVersion> {
    return this.http.get<FunctionVersion>(
      `/functions/${functionId}/versions/${version}`
    );
  }

  async publish(functionId: string, version: number): Promise<FunctionVersion> {
    return this.http.post<FunctionVersion>(
      `/functions/${functionId}/versions/${version}/publish`,
      {}
    );
  }
}

/**
 * Namespace for function deployment operations.
 */
export class FunctionsDeploymentsNamespace
  implements IFunctionsDeploymentsNamespace
{
  constructor(private readonly http: HttpClient) {}

  async deploy(functionId: string, version: number): Promise<void> {
    return this.http.post(
      `/functions/${functionId}/versions/${version}/deploy`,
      {}
    );
  }

  async status(
    functionId: string,
    version: number
  ): Promise<{ status: string; details?: unknown }> {
    return this.http.get<{ status: string; details?: unknown }>(
      `/functions/${functionId}/versions/${version}/deployment/status`
    );
  }
}

/**
 * Namespace for function execution operations.
 */
export class FunctionsExecutionsNamespace
  implements IFunctionsExecutionsNamespace
{
  constructor(private readonly http: HttpClient) {}

  async invoke(
    input: FunctionInvocationInput
  ): Promise<FunctionInvocationResult> {
    return this.http.post<FunctionInvocationResult>("/functions/invoke", input);
  }

  async invokeAsync(
    input: FunctionInvocationInput
  ): Promise<{ executionId: string }> {
    const result = await this.http.post<{ executionId: string }>(
      "/functions/invoke-async",
      input
    );
    return result;
  }

  async getExecution(executionId: string): Promise<FunctionExecution> {
    return this.http.get<FunctionExecution>(
      `/functions/executions/${executionId}`
    );
  }

  async getResult(
    executionId: string
  ): Promise<FunctionInvocationResult & { executionId: string }> {
    return this.http.get<FunctionInvocationResult & { executionId: string }>(
      `/functions/executions/${executionId}/result`
    );
  }

  async listExecutions(
    opts: {
      cursor?: string;
      limit?: number;
      functionId?: string;
      status?: string;
    } = {}
  ): Promise<FunctionExecutionListResponse> {
    return this.http.get<FunctionExecutionListResponse>(
      "/functions/executions",
      opts
    );
  }

  async cancelExecution(executionId: string): Promise<void> {
    return this.http.post(`/functions/executions/${executionId}/cancel`, {});
  }
}

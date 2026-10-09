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
  FunctionRuntime,
} from "./schemas";

/**
 * Interface for function CRUD operations.
 */
export interface IFunctionsNamespace {
  /**
   * Creates a new function.
   * @param definition - The function definition.
   * @returns The created function resource.
   */
  create(definition: FunctionDefinition): Promise<FunctionResource>;

  /**
   * Lists functions with pagination.
   * @param opts - Pagination options.
   * @returns A paginated result of functions.
   */
  list(opts: {
    cursor?: string;
    limit?: number;
  }): Promise<FunctionListResponse>;

  /**
   * Retrieves a function by ID.
   * @param id - The function ID.
   * @returns The function resource.
   */
  get(id: string): Promise<FunctionResource>;

  /**
   * Updates a function (creates a new version).
   * @param id - The function ID.
   * @param definition - The updated function definition.
   * @returns The updated function resource.
   */
  update(id: string, definition: FunctionDefinition): Promise<FunctionResource>;

  /**
   * Deletes a function.
   * @param id - The function ID.
   * @returns A promise that resolves when the function is deleted.
   */
  delete(id: string): Promise<void>;
}

/**
 * Interface for function version operations.
 */
export interface IFunctionsVersionsNamespace {
  /**
   * Lists versions for a function.
   * @param functionId - The function ID.
   * @param opts - Pagination options.
   * @returns A paginated result of function versions.
   */
  list(
    functionId: string,
    opts: { cursor?: string; limit?: number }
  ): Promise<FunctionVersionListResponse>;

  /**
   * Retrieves a specific version of a function.
   * @param functionId - The function ID.
   * @param version - The version number.
   * @returns The function version.
   */
  get(functionId: string, version: number): Promise<FunctionVersion>;

  /**
   * Publishes a version of a function.
   * @param functionId - The function ID.
   * @param version - The version number to publish.
   * @returns The published function version.
   */
  publish(functionId: string, version: number): Promise<FunctionVersion>;
}

/**
 * Interface for function deployment operations.
 */
export interface IFunctionsDeploymentsNamespace {
  /**
   * Deploys a version of a function.
   * @param functionId - The function ID.
   * @param version - The version number to deploy.
   * @returns A promise that resolves when the deployment is complete.
   */
  deploy(functionId: string, version: number): Promise<void>;

  /**
   * Gets the deployment status of a function version.
   * @param functionId - The function ID.
   * @param version - The version number.
   * @returns The deployment status.
   */
  status(
    functionId: string,
    version: number
  ): Promise<{ status: string; details?: unknown }>;
}

/**
 * Interface for function execution operations.
 */
export interface IFunctionsExecutionsNamespace {
  /**
   * Invokes a function synchronously.
   * @param input - The invocation input.
   * @returns The function invocation result.
   */
  invoke(input: FunctionInvocationInput): Promise<FunctionInvocationResult>;

  /**
   * Invokes a function asynchronously.
   * @param input - The invocation input.
   * @returns The execution ID for tracking.
   */
  invokeAsync(input: FunctionInvocationInput): Promise<{ executionId: string }>;

  /**
   * Retrieves the status of a function execution.
   * @param executionId - The execution ID.
   * @returns The function execution status.
   */
  getExecution(executionId: string): Promise<FunctionExecution>;

  /**
   * Retrieves the result of a function execution.
   * @param executionId - The execution ID.
   * @returns The function execution result.
   */
  getResult(
    executionId: string
  ): Promise<FunctionInvocationResult & { executionId: string }>;

  /**
   * Lists function executions with pagination.
   * @param opts - Pagination and filter options.
   * @returns A paginated result of function executions.
   */
  listExecutions(opts: {
    cursor?: string;
    limit?: number;
    functionId?: string;
    status?: string;
  }): Promise<FunctionExecutionListResponse>;

  /**
   * Cancels a function execution.
   * @param executionId - The execution ID.
   * @returns A promise that resolves when the execution is cancelled.
   */
  cancelExecution(executionId: string): Promise<void>;
}

/**
 * Fluent builder for defining and creating functions.
 */
export class FunctionBuilder {
  private _definition: Partial<FunctionDefinition> & {
    name: string;
  };

  constructor(
    name: string,
    private readonly functionsSdk: IFunctionsNamespace
  ) {
    this._definition = { name };
  }

  /**
   * Sets a description for the function.
   * @param text - The description text.
   */
  description(text: string): this {
    this._definition.description = text;
    return this;
  }

  /**
   * Sets the runtime for the function.
   * @param runtime - The runtime (e.g. "nodejs20").
   */
  runtime(runtime: FunctionRuntime): this {
    this._definition.runtime = runtime;
    return this;
  }

  /**
   * Sets the entrypoint for the function.
   * @param entrypoint - The entrypoint (e.g. "index.handler").
   */
  entrypoint(entrypoint: string): this {
    this._definition.entrypoint = entrypoint;
    return this;
  }

  /**
   * Sets the source reference for the function.
   * @param source - The source reference (e.g. blob path).
   */
  source(source: string): this {
    this._definition.source = source;
    return this;
  }

  /**
   * Sets the input schema for the function.
   * @param schema - The input schema (JSON schema object).
   */
  inputSchema(schema: Record<string, unknown>): this {
    this._definition.inputSchema = schema;
    return this;
  }

  /**
   * Sets the output schema for the function.
   * @param schema - The output schema (JSON schema object).
   */
  outputSchema(schema: Record<string, unknown>): this {
    this._definition.outputSchema = schema;
    return this;
  }

  /**
   * Sets the dependencies for the function.
   * @param dependencies - The dependency array.
   */
  dependencies(dependencies: string[]): this {
    this._definition.dependencies = dependencies;
    return this;
  }

  /**
   * Sets the environment variables for the function.
   * @param envVars - The environment variables object.
   */
  envVars(envVars: Record<string, string>): this {
    this._definition.envVars = envVars;
    return this;
  }

  /**
   * Sets the secrets for the function.
   * @param secrets - The secret names array.
   */
  secrets(secrets: string[]): this {
    this._definition.secrets = secrets;
    return this;
  }

  /**
   * Sets the memory limit for the function (in MB).
   * @param memory - The memory limit in MB.
   */
  memory(memory: number): this {
    this._definition.memory = memory;
    return this;
  }

  /**
   * Sets the timeout for the function (in seconds).
   * @param timeout - The timeout in seconds.
   */
  timeout(timeout: number): this {
    this._definition.timeout = timeout;
    return this;
  }

  /**
   * Sets the permissions for the function.
   * @param permissions - The permissions object.
   */
  permissions(permissions: { ontology?: string[]; actions?: string[] }): this {
    this._definition.permissions = permissions;
    return this;
  }

  /**
   * Builds the function definition.
   * @returns The function definition.
   */
  toDefinition(): FunctionDefinition {
    return this._definition as FunctionDefinition;
  }

  /**
   * Creates the function on the API.
   * @returns The created function resource.
   */
  async create(): Promise<FunctionResource> {
    const definition = this.toDefinition();
    return this.functionsSdk.create(definition);
  }
}

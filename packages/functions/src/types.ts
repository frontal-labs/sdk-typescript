import type {
  CapabilityInput,
  FunctionDefinition,
  FunctionExecution,
  FunctionExecutionListResponse,
  FunctionInvocationInput,
  FunctionInvocationResult,
  FunctionListResponse,
  FunctionResource,
  FunctionRuntime,
  SchemaRef,
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
  invokeAsync(input: FunctionInvocationInput): Promise<{
    executionId: string;
  }>;

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
   * @param runtime - The runtime (e.g. "nodejs22").
   */
  runtime(runtime: FunctionRuntime): this {
    this._definition.runtime = runtime;
    return this;
  }

  /**
   * Sets the handler for the function.
   * @param handler - The handler (e.g. "file.export").
   */
  handler(handler: string): this {
    this._definition.handler = handler;
    return this;
  }

  /**
   * Sets the input schema for the function.
   * @param schema - The input schema (inline or reference).
   */
  inputSchema(schema: SchemaRef): this {
    this._definition.inputSchema = schema;
    return this;
  }

  /**
   * Sets the output schema for the function.
   * @param schema - The output schema (inline or reference).
   */
  outputSchema(schema: SchemaRef): this {
    this._definition.outputSchema = schema;
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
   * Adds a secret name for the function.
   * @param name - The secret name.
   */
  secret(name: string): this {
    this._definition.secrets = [...(this._definition.secrets ?? []), name];
    return this;
  }

  /**
   * Adds capabilities for the function.
   * @param caps - The capabilities array.
   */
  capabilities(...caps: CapabilityInput[]): this {
    this._definition.capabilities = [
      ...(this._definition.capabilities ?? []),
      ...caps,
    ];
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

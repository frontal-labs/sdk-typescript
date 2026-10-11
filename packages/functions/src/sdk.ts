import type { HttpClient } from "@frontal-labs/core";
import { FunctionsExecutionsNamespace, FunctionsNamespace } from "./namespace";
import type { FunctionDefinition, FunctionResource } from "./schemas";
import { FunctionBuilder } from "./types";

/**
 * Client for the Frontal Functions API (`/v1/functions/*`).
 */
export class FunctionsSdk {
  /** Namespace for function CRUD operations. */
  readonly functions: FunctionsNamespace;
  /** Namespace for function execution operations. */
  readonly executions: FunctionsExecutionsNamespace;

  /**
   * @param http - The HTTP client used to make API requests.
   */
  constructor(private readonly http: HttpClient) {
    this.functions = new FunctionsNamespace(http);
    this.executions = new FunctionsExecutionsNamespace(http);
  }

  /**
   * Starts building a new function definition.
   * @param name - The function name.
   * @returns A fluent builder for defining the function.
   */
  define(name: string): FunctionBuilder {
    return new FunctionBuilder(name, this.functions);
  }

  /**
   * Returns an accessor for an existing function by ID.
   * @param id - The function ID.
   * @returns An object with CRUD operations for the function.
   */
  use(id: string): {
    get: () => Promise<FunctionResource>;
    update: (definition: FunctionDefinition) => Promise<FunctionResource>;
    delete: () => Promise<void>;
  } {
    const ns = this.functions;
    return {
      get: () => ns.get(id),
      update: (definition) => ns.update(id, definition),
      delete: () => ns.delete(id),
    };
  }
}

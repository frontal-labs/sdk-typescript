import type { HttpClient } from "@frontal-labs/core";
import type {
  FunctionDefinition,
  FunctionResource,
  FunctionListResponse,
} from "./schemas";
import { FunctionsNamespace } from "./namespace";
import { FunctionsVersionsNamespace } from "./namespace";
import { FunctionsDeploymentsNamespace } from "./namespace";
import { FunctionsExecutionsNamespace } from "./namespace";
import { FunctionBuilder } from "./types";

/**
 * Client for the Frontal Functions API (`/v1/functions/*`).
 */
export class FunctionsSdk {
  /** Namespace for function CRUD operations. */
  readonly functions: FunctionsNamespace;
  /** Namespace for function version operations. */
  readonly versions: FunctionsVersionsNamespace;
  /** Namespace for function deployment operations. */
  readonly deployments: FunctionsDeploymentsNamespace;
  /** Namespace for function execution operations. */
  readonly executions: FunctionsExecutionsNamespace;

  /**
   * @param http - The HTTP client used to make API requests.
   */
  constructor(private readonly http: HttpClient) {
    this.functions = new FunctionsNamespace(http);
    this.versions = new FunctionsVersionsNamespace(http);
    this.deployments = new FunctionsDeploymentsNamespace(http);
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
    create: (definition: FunctionDefinition) => Promise<FunctionResource>;
    list: () => Promise<FunctionListResponse>;
    get: () => Promise<FunctionResource>;
    update: (definition: FunctionDefinition) => Promise<FunctionResource>;
    delete: () => Promise<void>;
  } {
    const ns = this.functions;
    return {
      create: (definition) => ns.create(definition),
      list: () => ns.list(),
      get: () => ns.get(id),
      update: (definition) => ns.update(id, definition),
      delete: () => ns.delete(id),
    };
  }
}

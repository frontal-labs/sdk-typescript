import { FrontalClient, getDefaultClient } from "@frontal/core";
import { FunctionsService } from "./client";
import { DEFAULT_FUNCTIONS_BASE_URL } from "./constants";
import type {
  APIResponse,
  FunctionConfig,
  FunctionEntry,
  FunctionsConfig,
  InvocationStats,
  InvokeOptions,
} from "./types";

function toErrorResponse(error: unknown): APIResponse<never>["error"] {
  if (error instanceof Error) {
    const errorWithStatus = error as Error & { statusCode?: number };
    const statusCode =
      typeof errorWithStatus.statusCode === "number"
        ? errorWithStatus.statusCode
        : 0;
    return {
      message: error.message,
      statusCode,
      name: error.name || "application_error",
    };
  }
  return {
    message: "Unknown error",
    statusCode: 0,
    name: "application_error",
  };
}

/**
 * @deprecated Use `FunctionsService` with `createFunctionsClient()` instead.
 * This class wraps FunctionsService to provide backward-compatible
 * APIResponse<T> return types.
 */
export class Functions {
  private readonly service: FunctionsService;

  constructor(config: FunctionsConfig = {}) {
    let client: FrontalClient;
    if (config.apiKey || config.baseUrl) {
      client = new FrontalClient({
        apiKey: config.apiKey || "",
        baseUrl: config.baseUrl || DEFAULT_FUNCTIONS_BASE_URL,
      });
    } else {
      client = getDefaultClient();
    }
    this.service = new FunctionsService(client._http);
  }

  async deploy(config: FunctionConfig): Promise<APIResponse<FunctionEntry>> {
    try {
      const data = await this.service.deploy(config);
      return { data, error: null, headers: {} };
    } catch (error) {
      return { data: null, error: toErrorResponse(error), headers: null };
    }
  }

  async list(): Promise<APIResponse<FunctionEntry[]>> {
    try {
      const data = await this.service.list();
      return { data, error: null, headers: {} };
    } catch (error) {
      return { data: null, error: toErrorResponse(error), headers: null };
    }
  }

  async get(id: string): Promise<APIResponse<FunctionEntry>> {
    try {
      const data = await this.service.get(id);
      return { data, error: null, headers: {} };
    } catch (error) {
      return { data: null, error: toErrorResponse(error), headers: null };
    }
  }

  async delete(id: string): Promise<APIResponse<void>> {
    try {
      await this.service.delete(id);
      return { data: undefined, error: null, headers: {} };
    } catch (error) {
      return { data: null, error: toErrorResponse(error), headers: null };
    }
  }

  async invoke(
    id: string,
    options: InvokeOptions = {}
  ): Promise<APIResponse<unknown>> {
    try {
      const data = await this.service.invoke(id, options);
      return { data, error: null, headers: {} };
    } catch (error) {
      return { data: null, error: toErrorResponse(error), headers: null };
    }
  }

  async stats(id: string): Promise<APIResponse<InvocationStats>> {
    try {
      const data = await this.service.stats(id);
      return { data, error: null, headers: {} };
    } catch (error) {
      return { data: null, error: toErrorResponse(error), headers: null };
    }
  }

  async updateTriggers(
    id: string,
    trigger: FunctionConfig["trigger"]
  ): Promise<APIResponse<FunctionEntry>> {
    try {
      const data = await this.service.updateTriggers(id, trigger);
      return { data, error: null, headers: {} };
    } catch (error) {
      return { data: null, error: toErrorResponse(error), headers: null };
    }
  }
}

import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { Sdk } from "./sdk";

/**
 * Configuration for standalone usage without a FrontalClient instance.
 */
export interface SdkClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/** Create from a FrontalClient instance */
export function createSdkClient(client: FrontalClient): Sdk;
/** Create standalone with config */
export function createSdkClient(config: SdkClientConfig): Sdk;
export function createSdkClient(
  clientOrConfig: FrontalClient | SdkClientConfig
): Sdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new Sdk(clientOrConfig);
  }
  return new Sdk(
    new FrontalClient({
      apiKey: clientOrConfig.apiKey,
      baseUrl: clientOrConfig.baseUrl ?? "https://api.frontal.dev/v1",
      timeout: clientOrConfig.timeout ?? 30_000,
      maxRetries: clientOrConfig.maxRetries ?? 3,
      retryDelay: 1000,
      headers: {},
      environment: "production",
      debug: false,
    })
  );
}

/** Default SDK instance (reads FRONTAL_API_KEY from env) */
export const sdk = createSdkClient(getDefaultClient());

export { Sdk } from "./sdk";

export const VERSION = "0.0.1";

// ── Core primitives ────────────────────────────────────────────────────

export {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";

export {
  FrontalError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  RateLimitError,
  ServiceError,
  NetworkError,
  TimeoutError,
} from "@frontal-labs/core";

// ── Individual singletons (tree-shakeable) ─────────────────────────────

export { ai } from "@frontal-labs/ai";
export { agents } from "@frontal-labs/agents";
export { audit } from "@frontal-labs/audit";
export { auth } from "@frontal-labs/auth";
export { billing } from "@frontal-labs/billing";
export { blob } from "@frontal-labs/blob";
export { connectors } from "@frontal-labs/connectors";
export { datasets } from "@frontal-labs/datasets";
export { events } from "@frontal-labs/events";
export { flags } from "@frontal-labs/flags";
export { functions } from "@frontal-labs/functions";
export { governance } from "@frontal-labs/governance";
export { graph } from "@frontal-labs/graph";
export { integrations } from "@frontal-labs/integrations";
export { lineage } from "@frontal-labs/lineage";
export { observability } from "@frontal-labs/observability";
export { ontology } from "@frontal-labs/ontology";
export { organization } from "@frontal-labs/organization";
export { pipelines } from "@frontal-labs/pipelines";
export { queues } from "@frontal-labs/queues";
export { sandbox } from "@frontal-labs/sandbox";
export { schedules } from "@frontal-labs/schedules";
export { search } from "@frontal-labs/search";
export { vectors } from "@frontal-labs/vectors";
export { webhooks } from "@frontal-labs/webhooks";
export { workflows } from "@frontal-labs/workflows";

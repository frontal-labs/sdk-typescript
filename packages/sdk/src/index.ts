/**
 * @frontal-labs/sdk
 *
 * Unified Frontal SDK — access all services from a single client.
 */

export { createFrontalClient, frontal } from "./client";
export {
  type FrontalClientConfig,
  type FrontalEnvironment,
  resolveSdkConfig,
  type SdkConfig,
  sdkConfigSchema,
} from "./config";
export { DEFAULT_BASE_URL, VERSION } from "./constants";
export { Frontal } from "./sdk";

// ── Core primitives ────────────────────────────────────────────────────

export {
  type ClientConfigInput,
  type ClientConfigOutput,
  ConflictError,
  clientConfigSchema,
  ForbiddenError,
  FrontalClient,
  FrontalError,
  getDefaultClient,
  HttpClient,
  initTracing,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ServiceError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
} from "@frontal-labs/core";

// ── Commonly needed helpers ────────────────────────────────────────────

export {
  type AgentDefinitionOptions,
  toApprovalStep,
} from "@frontal-labs/agents";
export {
  parseToolInput,
  type ToolCall,
  type ToolDefinition,
  type ToolSet,
  tool,
  toUIMessageStreamResponse,
  type UIMessage,
  type UIMessagePart,
} from "@frontal-labs/ai";
export {
  isFrontalError,
  isRetryableError,
  registerTelemetry,
  requestIdOf,
  type SdkError,
  type StreamPart,
  type TelemetryEvent,
  type TelemetryProvider,
} from "@frontal-labs/core";

// ── Individual singletons (tree-shakeable) ─────────────────────────────
//
// @deprecated These env-driven Proxy singletons are kept for back-compat.
// Prefer `new Frontal({ apiKey })` or `createXClient(f.client)` so config
// is explicit. They will not be removed without a major version bump.

export { agents } from "@frontal-labs/agents";
export { ai } from "@frontal-labs/ai";
export { audit } from "@frontal-labs/audit";
export { auth } from "@frontal-labs/auth";
export { billing } from "@frontal-labs/billing";
export { blob } from "@frontal-labs/blob";
export { connectors } from "@frontal-labs/connectors";
export { data } from "@frontal-labs/data";
export { datasets } from "@frontal-labs/datasets";
export { events } from "@frontal-labs/events";
export { governance } from "@frontal-labs/governance";
export { graph } from "@frontal-labs/graph";
export { integrations } from "@frontal-labs/integrations";
export { lineage } from "@frontal-labs/lineage";
export { observability } from "@frontal-labs/observability";
export { ontology } from "@frontal-labs/ontology";
export { pipelines } from "@frontal-labs/pipelines";
export { sandbox } from "@frontal-labs/sandbox";
export { schedules } from "@frontal-labs/schedules";
export { webhooks } from "@frontal-labs/webhooks";
export { workers } from "@frontal-labs/workers";
export { workflows } from "@frontal-labs/workflows";

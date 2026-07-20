/**
 * @frontal-labs/sdk
 *
 * Unified Frontal SDK — access all services from a single client.
 */

export {
  createFrontalClient,
  frontal,
  type FrontalClientConfig,
} from "./client";
export { DEFAULT_BASE_URL, VERSION } from "./constants";
export { Frontal } from "./sdk";

// ── Core primitives ────────────────────────────────────────────────────

export {
  ConflictError,
  ForbiddenError,
  FrontalClient,
  FrontalError,
  getDefaultClient,
  HttpClient,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ServiceError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
} from "frontal/core";

// ── Individual singletons (tree-shakeable) ─────────────────────────────

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

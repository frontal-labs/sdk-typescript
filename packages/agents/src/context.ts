import type { FilterConditions } from "frontal/core";
import { z } from "zod";
import type { EscalateOptions } from "./schemas";

/**
 * Schema for the result of an agent reasoning operation.
 */
export const ReasoningResultSchema = z.object({
  decision: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  escalate: z.boolean(),
  escalationReason: z.string().optional(),
  urgency: z.enum(["critical", "high", "medium", "low"]).optional(),
  recommendation: z.string().optional(),
  supportingData: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Result of a reasoning operation, including decision, confidence level,
 * and optional escalation details.
 */
export type ReasoningResult = z.infer<typeof ReasoningResultSchema>;

/**
 * API for reading, finding, and mutating entities in the Frontal entity graph.
 */
export interface AgentGraphAPI {
  get(entityType: string, id: string): Promise<Record<string, unknown>>;
  find(
    entityType: string,
    conditions: FilterConditions
  ): {
    limit(n: number): AgentGraphAPI;
    execute(): Promise<{ data: Record<string, unknown>[] }>;
    first(): Promise<Record<string, unknown> | null>;
  };
  update(
    entityType: string,
    id: string,
    fields: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
  create(
    entityType: string,
    fields: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
}

/**
 * Key-value memory store for agent state persistence.
 */
export interface AgentMemoryAPI {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl?: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Structured logger available inside agent handlers.
 */
export interface AgentLogAPI {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

/**
 * Full context passed to every agent handler invocation.
 * Provides access to the triggering event, entity graph, registered actions,
 * sub-agent invocation, function calling, reasoning, escalation, memory, and logging.
 */
export interface AgentContext {
  event: {
    type: string;
    payload: Record<string, unknown>;
    entityId?: string;
    entityType?: string;
    timestamp: Date;
  };

  graph: AgentGraphAPI;

  actions: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown>
  >;

  agents: {
    invoke(
      agentId: string,
      event: string,
      payload: Record<string, unknown>
    ): Promise<void>;
  };

  functions: {
    invoke(
      functionId: string,
      params: Record<string, unknown>
    ): Promise<unknown>;
  };

  reason(options: {
    question: string;
    context?: Record<string, unknown>;
    options?: string[];
  }): Promise<ReasoningResult>;

  escalate(options: EscalateOptions): Promise<void>;

  memory: AgentMemoryAPI;
  log: AgentLogAPI;
}

/**
 * Function signature for an agent event handler.
 * @param ctx - The agent context for this invocation.
 */
export type AgentHandler = (ctx: AgentContext) => Promise<void>;

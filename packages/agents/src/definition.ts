import type { ToolSet } from "@frontal-labs/core";
import type { z } from "zod";
import type * as Schemas from "./schemas";

/**
 * Options for `agents.define(name, options)`. Everything is optional; the
 * builder fills platform defaults (`scope`, `confidence`, `memory`, `retry`).
 *
 * `stateSchema`, `tools` and `approveWhen` are client-side today: they type
 * the run stream, describe the model-callable tools, and map to a workflow
 * approval step. They are not sent to the agents API.
 *
 * @example
 * ```ts
 * const triage = f.agents.define("ticket-triager", {
 *   description: "Classifies and routes tickets",
 *   triggers: "support.ticket.created",
 *   stateSchema: z.object({ tier: z.string(), score: z.number() }),
 *   tools: { classify: tool({ description: "…", inputSchema: z.object({ text: z.string() }) }) },
 *   approveWhen: (s) => s.tier === "enterprise",
 * });
 * ```
 */
export interface AgentDefinitionOptions<
  TState extends z.ZodType = z.ZodType<Record<string, unknown>>,
> {
  /** Human-readable description shown in the console. */
  description?: string;
  /** Event name(s) that start a run. */
  triggers?: string | string[] | Schemas.TriggerDefinitionInput[];
  /** Free-form tags. */
  tags?: string[];
  /** Schema for the run's state; `state` events are parsed with it. */
  stateSchema?: TState;
  /** SSE event name carrying state snapshots (default `"state"`). */
  stateEvent?: string;
  /** Tools the agent may call (shared `ToolSet` with `@frontal-labs/ai`). */
  tools?: ToolSet;
  /**
   * Predicate over the typed state. When true, the run should pause for a
   * human — see {@link toApprovalStep} for the workflow mapping.
   */
  approveWhen?: (state: z.infer<TState>) => boolean;
  /** Who may approve when `approveWhen` fires. */
  approvers?: string[];
  scope?: z.input<typeof Schemas.AgentScopeSchema>;
  confidence?: z.input<typeof Schemas.ConfidenceConfigSchema>;
  memory?: z.input<typeof Schemas.MemoryConfigSchema>;
  retry?: Schemas.AgentDefinitionInput["retry"];
  timeout?: string;
  rateLimit?: z.input<typeof Schemas.RateLimitConfigSchema>;
}

/**
 * The client-side extras of a definition, kept alongside the created agent so
 * `use()`/`watch()` stay typed.
 */
export interface AgentRuntimeHints<TState extends z.ZodType = z.ZodType> {
  stateSchema?: TState;
  /**
   * SSE event name that carries a state snapshot (default `"state"`). The
   * agents run stream is not in the published OpenAPI contract yet; override
   * this if your deployment emits a different event name.
   */
  stateEvent?: string;
  tools?: ToolSet;
  approveWhen?: (state: z.infer<TState>) => boolean;
  approvers?: string[];
}

/** Shape of a workflow `approval` step produced by {@link toApprovalStep}. */
export interface ApprovalStepSpec {
  id: string;
  type: "approval";
  name: string;
  description?: string;
  config: { approvers: string[] };
}

/**
 * Maps an agent's `approveWhen` contract to a `WorkflowBuilder.approval(...)`
 * step. Wire it as:
 *
 * ```ts
 * const step = toApprovalStep("ticket-triager", hints);
 * workflows.define("triage-review").approval(step.id, step.config.approvers, { name: step.name });
 * ```
 */
export function toApprovalStep(
  agentName: string,
  // `never` accepts any predicate signature; only its presence matters here.
  hints: { approvers?: string[]; approveWhen?: (state: never) => boolean },
  overrides: Partial<Pick<ApprovalStepSpec, "id" | "name" | "description">> = {}
): ApprovalStepSpec {
  return {
    id: overrides.id ?? `${agentName}-approval`,
    type: "approval",
    name: overrides.name ?? `Review ${agentName} outcome`,
    description:
      overrides.description ??
      (hints.approveWhen
        ? "Required when `approveWhen` returns true for the run state."
        : undefined),
    config: { approvers: hints.approvers ?? [] },
  };
}

/** Normalizes the `triggers` option into trigger definitions. */
export function normalizeTriggers(
  triggers: AgentDefinitionOptions["triggers"]
): Schemas.TriggerDefinitionInput[] {
  if (!triggers) return [];
  if (typeof triggers === "string") return [{ event: triggers }];
  return triggers.map((t) => (typeof t === "string" ? { event: t } : t));
}

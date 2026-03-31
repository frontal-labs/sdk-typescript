import type { FilterConditions } from "@frontal/core";
import { z } from "zod";
import { type EscalateOptions, EscalateOptionsSchema } from "./schemas";

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

export type ReasoningResult = z.infer<typeof ReasoningResultSchema>;

export interface AgentGraphAPI {
	get(entityType: string, id: string): Promise<Record<string, unknown>>;
	find(
		entityType: string,
		conditions: FilterConditions,
	): {
		limit(n: number): AgentGraphAPI;
		execute(): Promise<{ data: Record<string, unknown>[] }>;
		first(): Promise<Record<string, unknown> | null>;
	};
	update(
		entityType: string,
		id: string,
		fields: Record<string, unknown>,
	): Promise<Record<string, unknown>>;
	create(
		entityType: string,
		fields: Record<string, unknown>,
	): Promise<Record<string, unknown>>;
}

export interface AgentMemoryAPI {
	get(key: string): Promise<unknown>;
	set(key: string, value: unknown, ttl?: string): Promise<void>;
	delete(key: string): Promise<void>;
}

export interface AgentLogAPI {
	debug(message: string, metadata?: Record<string, unknown>): void;
	info(message: string, metadata?: Record<string, unknown>): void;
	warn(message: string, metadata?: Record<string, unknown>): void;
	error(message: string, metadata?: Record<string, unknown>): void;
}

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
			payload: Record<string, unknown>,
		): Promise<void>;
	};

	functions: {
		invoke(
			functionId: string,
			params: Record<string, unknown>,
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

export type AgentHandler = (ctx: AgentContext) => Promise<void>;

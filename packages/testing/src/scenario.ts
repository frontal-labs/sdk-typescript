import {
  type createMockFetch,
  createTestClient,
  type MockRoute,
  matchPath,
} from "./index";
import type { SimulateStreamOptions } from "./stream";

/**
 * Readable aliases for headline operations. A step's `on` may be one of
 * these or an explicit `"METHOD /path/{param}"` (the vocabulary of
 * `contracts/sdk-endpoints.json`).
 */
export const scenarioAliases: Record<string, `${string} ${string}`> = {
  "ai.generateText": "POST /ai/chat/completions",
  "ai.streamText": "POST /ai/chat/completions",
  "ai.embed": "POST /internal/embeddings",
  "ai.listModels": "GET /internal/models",
  "agents.list": "GET /agents",
  "agents.create": "POST /agents",
  "agents.get": "GET /agents/{param}",
  "agents.message": "POST /agents/{param}/runs",
  "agents.run": "GET /agents/runs/{param}",
  "agents.watch": "GET /agents/runs/{param}/stream",
  "agents.conversation": "GET /agents/runs/{param}/conversation",
  "workflows.list": "GET /workflows",
  "workflows.create": "POST /workflows",
  // The published OpenAPI contract has no approval endpoints; the workflows
  // SDK routes trigger/approve/reject through `/workflows/batch` (which the
  // contract does expose). Aliases track what the SDK actually sends.
  "workflows.trigger": "POST /workflows/batch",
  "workflows.approvals.list": "GET /workflows",
  "workflows.approvals.approve": "POST /workflows/batch",
  "workflows.approvals.reject": "POST /workflows/batch",
  "pipelines.list": "GET /data/pipelines/pipelines",
  "graph.query": "POST /ontology/graph/graph/query",
  "blob.getSignedUrl": "POST /blob/object/sign/{param}/{param}",
  "observability.logs.query": "POST /observability/logs/query",
};

/** One scripted response in a {@link Scenario}. */
export interface ScenarioStep {
  /** Alias (`"agents.message"`) or `"METHOD /path/{param}"`. */
  on: string;
  /** JSON body to return (default `{}`). */
  return?: unknown;
  /** HTTP status (default 200). */
  status?: number;
  /** Serve an SSE stream instead of `return`. */
  stream?: SimulateStreamOptions;
  /** Response headers. */
  headers?: Record<string, string>;
  /** How many calls this step answers (default 1). */
  times?: number;
}

/** A pre-wired client + assertions for a scripted interaction. */
export interface Scenario {
  name: string;
  client: ReturnType<typeof createTestClient>["client"];
  mock: ReturnType<typeof createMockFetch>;
  routes: MockRoute[];
  /** Steps that were never reached. */
  remaining(): ScenarioStep[];
  /** Throws if any step was not consumed. */
  assertAllHit(): void;
}

function resolveOn(on: string): { method: string; path: string } {
  const spec = scenarioAliases[on] ?? on;
  const [method, path] = spec.split(/\s+/, 2);
  if (!(method && path && /^[A-Z]+$/.test(method))) {
    throw new Error(
      `Scenario step "${on}" must be an alias (${Object.keys(scenarioAliases).slice(0, 3).join(", ")}, …) or "METHOD /path".`
    );
  }
  return { method, path };
}

/**
 * Script a multi-step interaction with sequenced responses. Steps for the
 * same endpoint answer in order (each `times` times), which plain routes
 * cannot express.
 *
 * @example
 * ```ts
 * const s = createScenario("refund-approved", [
 *   { on: "agents.message", return: { id: "run_1", status: "running" } },
 *   { on: "agents.watch", stream: { chunks: [{ event: "state", data: { tier: "enterprise" } }] } },
 *   { on: "workflows.approvals.approve", return: { id: "apr_1", status: "approved" } },
 * ]);
 * const f = new Frontal(s.client);
 * // ...drive the flow...
 * s.assertAllHit();
 * ```
 */
export function createScenario(name: string, steps: ScenarioStep[]): Scenario {
  const hits = new Map<ScenarioStep, number>();
  const routes: MockRoute[] = steps.map((step) => {
    const { method, path } = resolveOn(step.on);
    const times = step.times ?? 1;
    return {
      method,
      path,
      status: step.status,
      body: step.return,
      stream: step.stream,
      headers: step.headers,
      times,
      handler: () => {
        hits.set(step, (hits.get(step) ?? 0) + 1);
        return undefined;
      },
    };
  });

  const { client, mock } = createTestClient(routes);

  return {
    name,
    client,
    mock,
    routes,
    remaining: () => steps.filter((s) => (hits.get(s) ?? 0) < (s.times ?? 1)),
    assertAllHit() {
      const missed = steps.filter((s) => (hits.get(s) ?? 0) < (s.times ?? 1));
      if (missed.length) {
        const unmatched = mock.requests
          .filter(
            (r) =>
              !routes.some(
                (rt) => rt.method === r.method && matchPath(rt.path, r.path)
              )
          )
          .map((r) => `${r.method} ${r.path}`);
        throw new Error(
          `Scenario "${name}": ${missed.length} step(s) not reached: ${missed
            .map((s) => s.on)
            .join(
              ", "
            )}${unmatched.length ? `\nUnmatched requests: ${unmatched.join(", ")}` : ""}`
        );
      }
    },
  };
}

/** Namespace-style entry point: `MockFrontal.scenario(name, steps)`. */
export const MockFrontal = {
  scenario: createScenario,
  aliases: scenarioAliases,
};

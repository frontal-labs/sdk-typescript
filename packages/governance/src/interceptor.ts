/**
 * Governance Interceptor
 *
 * Wraps HttpClient to enforce governance policies locally before requests.
 * Checks policies against request context (method, path, body, user, etc.).
 */

import type { HttpClient, Interceptor } from "@frontal-labs/core";
import { LocalPolicyEngine, PolicyViolationError } from "./engine";
import type { Policy } from "./schemas";

/**
 * Configuration for the governance interceptor.
 */
export interface GovernanceInterceptorConfig {
  /** Policies to enforce. Evaluated in order. */
  policies: Policy[];
  /** Whether to fail closed (deny) on policy evaluation errors. */
  failClosed?: boolean;
  /** Optional callback when a policy violation occurs. */
  onViolation?: (error: PolicyViolationError, context: PolicyContext) => void;
  /** Optional custom input builder for policy evaluation. */
  buildInput?: (context: PolicyContext) => unknown;
}

/**
 * Context passed to policy evaluation.
 */
export interface PolicyContext {
  method: string;
  path: string;
  body: unknown;
  headers: Record<string, string>;
  user?: {
    id: string;
    roles: string[];
    tenantId?: string;
  };
  requestId: string;
  timestamp: string;
}

/** HTTP method type. */
type HttpMethod = "post" | "put" | "patch" | "delete";

/** HTTP method handler signature. */
type HttpMethodHandler = (...args: unknown[]) => Promise<unknown>;

/**
 * Creates a governance interceptor that enforces policies on all requests.
 *
 * @param config - Configuration for the governance interceptor
 * @returns An Interceptor function that wraps an HttpClient with policy enforcement
 *
 * @example
 * ```typescript
 * const client = new HttpClient(config);
 * const withGovernance = governanceInterceptor({ policies: [aiBudgetPolicy] });
 * const securedClient = withGovernance(client);
 * ```
 */
export function governanceInterceptor(
  config: GovernanceInterceptorConfig
): Interceptor {
  const engine = new LocalPolicyEngine();
  const failClosed = config.failClosed ?? true;

  // Warmup all policies on creation
  Promise.all(config.policies.map((p) => engine.warmup(p))).catch(() => {});

  return (client: HttpClient): HttpClient => {
    // Wrapper inherits from the base client via the prototype chain, so
    // every method not explicitly overridden (get, streams, raw variants)
    // delegates to the base instance unchanged. Only mutating methods are
    // overridden below to enforce policies first.
    const wrapped = Object.create(client) as HttpClient;

    // Wrap mutating HTTP methods with policy checking
    const methodsToCheck: HttpMethod[] = ["post", "put", "patch", "delete"];

    for (const method of methodsToCheck) {
      const original = client[method] as unknown as
        | HttpMethodHandler
        | undefined;
      if (original) {
        wrapped[method] = (async (...args: unknown[]): Promise<unknown> => {
          const context = buildPolicyContext(method, args, client);
          const input = config.buildInput
            ? config.buildInput(context)
            : defaultBuildInput(context);

          try {
            const result = await engine.evaluateAll(config.policies, input);
            if (!result.passed) {
              const error = new PolicyViolationError(
                result.policyId,
                result.ruleResults
              );
              config.onViolation?.(error, context);
              throw error;
            }
          } catch (error) {
            if (failClosed) throw error;
          }
          // Delegate to the base client with its own `this` so private
          // state (breaker, config, timeouts) stays on the base instance.
          return original.apply(client, args);
        }) as unknown as (typeof wrapped)[HttpMethod];
      }
    }

    return wrapped;
  };
}

/**
 * Builds a PolicyContext from the HTTP call arguments.
 */
function buildPolicyContext(
  method: string,
  args: unknown[],
  client: HttpClient
): PolicyContext {
  const clientRecord = client as unknown as Record<string, unknown>;
  return {
    method,
    path: (args[0] as string) || "",
    body: args[1] || {},
    headers: (args[2] as Record<string, string>) || {},
    user: clientRecord?.defaultUser as PolicyContext["user"],
    requestId: (clientRecord?.defaultRequestId as string) ?? "",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Default input builder for policy evaluation.
 * Uses the request context as input to the OPA policy.
 */
function defaultBuildInput(context: PolicyContext): unknown {
  return {
    method: context.method,
    path: context.path,
    body: context.body,
    headers: context.headers,
    user: context.user,
  };
}

// ── Short DX aliases (canonical names above remain fully supported) ──

/** Short alias for {@link governanceInterceptor}. */
export const govern = governanceInterceptor;
/** Short alias for {@link GovernanceInterceptorConfig}. */
export type GovernOptions = GovernanceInterceptorConfig;

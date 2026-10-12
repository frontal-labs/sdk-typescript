/**
 * HTTP Client Interceptors
 *
 * Interceptors allow wrapping the HttpClient to add cross-cutting concerns
 * like governance policy enforcement, audit logging, rate limiting, etc.
 * without modifying individual SDK packages.
 */

import type { HttpClient } from "./http";

/**
 * An interceptor transforms an HttpClient into a new HttpClient with
 * additional behavior. Interceptors compose: the output of one becomes
 * the input of the next.
 *
 * @example
 * ```typescript
 * const client = new HttpClient(config);
 * const withGovernance = governanceInterceptor(policies);
 * const withAudit = auditInterceptor(auditConfig);
 * const finalClient = composeInterceptors(withGovernance, withAudit)(client);
 * ```
 */
export type Interceptor = (client: HttpClient) => HttpClient;

/**
 * Composes multiple interceptors into a single interceptor.
 * Interceptors are applied in order: first interceptor wraps the base client,
 * second wraps the result of the first, etc.
 */
export function composeInterceptors(
  ...interceptors: Interceptor[]
): Interceptor {
  return (client: HttpClient) => interceptors.reduce((c, i) => i(c), client);
}

/**
 * Creates an HttpClient with interceptors applied.
 * This is a convenience function for the common pattern of creating a client
 * and immediately wrapping it with interceptors.
 */
export function createInterceptedClient(
  baseClient: HttpClient,
  ...interceptors: Interceptor[]
): HttpClient {
  return composeInterceptors(...interceptors)(baseClient);
}

/**
 * Helper type for interceptor configuration.
 * Packages can extend this with their specific options.
 */
export interface InterceptorConfig {
  /** Unique identifier for this interceptor (for debugging/ordering). */
  name: string;
  /** Whether this interceptor is enabled. */
  enabled?: boolean;
  /** Priority for ordering (lower runs first). */
  priority?: number;
}

/**
 * Base class for building interceptors with configuration.
 * Subclasses implement the `wrap` method.
 */
export abstract class BaseInterceptor {
  protected readonly config: InterceptorConfig;

  constructor(config: InterceptorConfig) {
    this.config = { enabled: true, priority: 0, ...config };
  }

  /** Returns the interceptor function. */
  toInterceptor(): Interceptor {
    if (!this.config.enabled) {
      return (client) => client;
    }
    return (client) => this.wrap(client);
  }

  /** Implement the wrapping logic. */
  protected abstract wrap(client: HttpClient): HttpClient;
}

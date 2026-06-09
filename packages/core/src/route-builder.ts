/**
 * Builds a normalized route path from segments.
 * Joins segments with "/", collapses consecutive slashes,
 * and warns on double "/v1/" prefix (common SDK misconfiguration).
 *
 * @example
 * ```ts
 * route("audit", "events")          // "/audit/events"
 * route("agents", id, "executions") // "/agents/abc123/executions"
 * ```
 */
export function route(...segments: string[]): string {
  const path = segments.filter(Boolean).join("/").replace(/\/+/g, "/");

  if (path.includes("/v1/v1")) {
    console.warn(`[SDK] Double /v1/ prefix detected in route: ${path}`);
  }

  return `/${path}`;
}

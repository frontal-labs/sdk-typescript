/**
 * Builds a normalized route path from segments.
 * Joins segments with "/", collapses consecutive slashes,
 * and collapses an accidental double "/v1/v1" prefix (common SDK
 * misconfiguration) down to a single "/v1".
 *
 * @example
 * ```ts
 * route("audit", "events")          // "/audit/events"
 * route("agents", id, "executions") // "/agents/abc123/executions"
 * ```
 */
export function route(...segments: string[]): string {
  const path = segments
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/^\/?v1\/v1\//, "v1/");

  return `/${path}`;
}

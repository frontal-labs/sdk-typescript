/**
 * True for a non-null object (arrays included). Narrows an `unknown` payload
 * to a record so its members can be read by name, without a cast.
 */
export function isObjectRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

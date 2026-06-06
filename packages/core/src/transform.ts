/**
 * Converts a snake_case string to camelCase.
 * Preserves leading underscores (e.g., `__typename` stays `__typename`).
 */
export function snakeToCamel(str: string): string {
  const prefix = str.match(/^_+/)?.[0] ?? "";
  const body = str.slice(prefix.length);
  if (!body) return str;
  return (
    prefix + body.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
  );
}

/**
 * Converts a camelCase string to snake_case.
 * Handles consecutive uppercase letters (e.g., `ssoUser` -> `sso_user`).
 */
export function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

const SKIP_TYPES = new Set([
  "Date",
  "Buffer",
  "RegExp",
  "FormData",
  "File",
  "Blob",
]);

const NEVER_TRANSFORM_KEYS = new Set(["$ref", "$schema", "$id"]);

function isStream(obj: unknown): boolean {
  return (
    typeof obj === "object" &&
    obj !== null &&
    (typeof (obj as Record<string, unknown>).pipe === "function" ||
      typeof (obj as Record<string, unknown>).getReader === "function")
  );
}

/**
 * Recursively walks an object/array and transforms all keys using `transform`.
 * Skips Dates, Buffers, RegExps, FormData, Files, Blobs, streams, and class instances.
 */
export function deepTransformKeys<T>(
  obj: T,
  transform: (key: string) => string,
  skipKeys?: Set<string>
): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (
    obj instanceof Date ||
    (typeof Buffer !== "undefined" && obj instanceof Buffer) ||
    obj instanceof RegExp ||
    obj instanceof FormData ||
    obj instanceof File ||
    obj instanceof Blob
  )
    return obj;
  if (isStream(obj)) return obj;

  if (Array.isArray(obj)) {
    return (obj as unknown[]).map((item) =>
      deepTransformKeys(item, transform, skipKeys)
    ) as T;
  }

  const proto = Object.getPrototypeOf(obj);
  if (proto !== Object.prototype && proto !== null) return obj;

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const shouldSkip = skipKeys?.has(key) || NEVER_TRANSFORM_KEYS.has(key);
    const newKey = shouldSkip ? key : transform(key);
    result[newKey] = deepTransformKeys(
      (obj as Record<string, unknown>)[key],
      transform,
      skipKeys
    );
  }
  return result as T;
}

/** Convenience: recursively converts all object keys from camelCase to snake_case. */
export function deepCamelToSnake<T>(obj: T, skipKeys?: Set<string>): T {
  return deepTransformKeys(obj, camelToSnake, skipKeys);
}

/** Convenience: recursively converts all object keys from snake_case to camelCase. */
export function deepSnakeToCamel<T>(obj: T, skipKeys?: Set<string>): T {
  return deepTransformKeys(obj, snakeToCamel, skipKeys);
}

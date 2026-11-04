/**
 * Validation and wire format for `query` and relationship traversal.
 *
 * Filters, cursors and page sizes are checked here, before any request, so a
 * malformed call costs no round trip. Responses are read untransformed (their
 * keys are user data or snake_case envelope keys) and checked with zod.
 */
import { ValidationError } from "@frontal-labs/core";
import { z } from "zod";
import type { FieldKind } from "./entity-runtime";
import type { EntityMeta, ObjectRecord } from "./entity-validate";

/** Request id used for errors raised locally, before any HTTP call. */
const LOCAL_REQUEST_ID = "local-validation";

/** Largest page the server accepts. */
export const MAX_PAGE_SIZE = 500;

/** Upper bound on the pages `list` will follow before it gives up. */
export const MAX_LIST_PAGES = 10_000;

/** A `where` clause after validation: field name to operator map. */
export type Filter = Readonly<
  Record<string, Readonly<Record<string, unknown>>>
>;

type ValueCheck = (value: unknown) => boolean;

const isFinite_ = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

/** `in` takes an array; every element must pass `check`. */
function listOf(check: ValueCheck): ValueCheck {
  return (value) => Array.isArray(value) && value.every(check);
}

/** The operators valid for a field kind, each with its value check. */
function operatorsFor(kind: FieldKind): ReadonlyMap<string, ValueCheck> {
  if (typeof kind === "object") {
    const members = (value: unknown): boolean =>
      isString(value) && kind.enum.includes(value);
    return new Map<string, ValueCheck>([
      ["eq", members],
      ["in", listOf(members)],
    ]);
  }
  switch (kind) {
    case "string":
      return new Map<string, ValueCheck>([
        ["eq", isString],
        ["in", listOf(isString)],
        ["contains", isString],
        ["startsWith", isString],
      ]);
    case "number":
      return new Map<string, ValueCheck>([
        ["eq", isFinite_],
        ["in", listOf(isFinite_)],
        ["gt", isFinite_],
        ["gte", isFinite_],
        ["lt", isFinite_],
        ["lte", isFinite_],
      ]);
    case "boolean":
      return new Map<string, ValueCheck>([["eq", isBoolean]]);
    default:
      return new Map<string, ValueCheck>();
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidInput(
  entity: string,
  code: string,
  field: string,
  message: string
): ValidationError {
  return new ValidationError({
    code: "INVALID_INPUT",
    message: `Invalid ${entity} query: ${message}`,
    requestId: LOCAL_REQUEST_ID,
    fields: [{ field, code, message }],
  });
}

/**
 * Checks a `where` clause against the entity's fields and their kinds.
 *
 * @throws {ValidationError} `UNKNOWN_PROPERTY` for a field the entity lacks,
 *   `INVALID_OPERATOR` for an operator the field's kind does not allow or a
 *   value of the wrong type.
 */
export function parseWhere(meta: EntityMeta, where: unknown): Filter {
  if (where === undefined) {
    return {};
  }
  if (!isRecord(where)) {
    throw invalidInput(
      meta.name,
      "INVALID_INPUT",
      "where",
      "where must be an object"
    );
  }
  const filter: Record<string, Readonly<Record<string, unknown>>> = {};
  for (const [field, ops] of Object.entries(where)) {
    if (ops === undefined) {
      continue;
    }
    const spec = Object.hasOwn(meta.fields, field)
      ? meta.fields[field]
      : undefined;
    if (spec === undefined) {
      throw new ValidationError({
        code: "INVALID_INPUT",
        message: `Invalid ${meta.name} query: ${meta.name} has no field "${field}"`,
        requestId: LOCAL_REQUEST_ID,
        fields: [
          {
            field,
            code: "UNKNOWN_PROPERTY",
            message: `${meta.name} has no field "${field}"`,
          },
        ],
      });
    }
    if (!isRecord(ops) || Object.keys(ops).length === 0) {
      throw new ValidationError({
        code: "INVALID_INPUT",
        message: `Invalid ${meta.name} query: ${field} needs at least one operator`,
        requestId: LOCAL_REQUEST_ID,
        fields: [
          {
            field,
            code: "INVALID_OPERATOR",
            message: `${field} needs at least one operator`,
          },
        ],
      });
    }
    const allowed = operatorsFor(spec.kind);
    for (const [op, value] of Object.entries(ops)) {
      const check = allowed.get(op);
      if (check === undefined) {
        throw new ValidationError({
          code: "INVALID_INPUT",
          message: `Invalid ${meta.name} query: operator "${op}" is not allowed on ${field}`,
          requestId: LOCAL_REQUEST_ID,
          fields: [
            {
              field,
              code: "INVALID_OPERATOR",
              message: `operator "${op}" is not allowed on ${field}`,
            },
          ],
        });
      }
      if (!check(value)) {
        throw new ValidationError({
          code: "INVALID_INPUT",
          message: `Invalid ${meta.name} query: the value for "${op}" on ${field} has the wrong type`,
          requestId: LOCAL_REQUEST_ID,
          fields: [
            {
              field,
              code: "INVALID_OPERATOR",
              message: `the value for "${op}" on ${field} has the wrong type`,
            },
          ],
        });
      }
    }
    filter[field] = ops;
  }
  return filter;
}

/** Checks a page size: an integer from 1 to {@link MAX_PAGE_SIZE}. */
export function parseLimit(entity: string, limit: unknown): number | undefined {
  if (limit === undefined) {
    return undefined;
  }
  if (
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_PAGE_SIZE
  ) {
    throw invalidInput(
      entity,
      "INVALID_INPUT",
      "limit",
      `limit must be an integer from 1 to ${MAX_PAGE_SIZE}`
    );
  }
  return limit;
}

/** Checks a cursor: a non-empty string. */
export function parseCursor(
  entity: string,
  cursor: unknown
): string | undefined {
  if (cursor === undefined) {
    return undefined;
  }
  if (typeof cursor !== "string" || cursor.length === 0) {
    throw invalidInput(
      entity,
      "INVALID_INPUT",
      "cursor",
      "cursor must be a non-empty string"
    );
  }
  return cursor;
}

/** One stored object as the query endpoint returns it (snake_case envelope). */
const queryResultSchema = z
  .object({
    object_id: z.string(),
    object_type_id: z.string(),
    properties: z.record(z.string(), z.unknown()),
  })
  .loose();

/** One page of query results. */
export const queryPageSchema = z
  .object({
    results: z.array(queryResultSchema),
    next_cursor: z.string().nullable(),
  })
  .loose();

/** The relationship instances returned by the traversal query. */
export const relationshipListSchema = z.array(
  z.object({ target_object_id: z.string() }).loose()
);

/**
 * Maps one query result to the envelope `parseObjectRecord` expects
 * (camelCased envelope keys, untouched properties).
 */
export function toEnvelope(
  result: z.infer<typeof queryResultSchema>
): ObjectRecord {
  return {
    objectId: result.object_id,
    objectTypeId: result.object_type_id,
    properties: result.properties,
  };
}

/** The arguments of `query`, typed; each value is checked by its own parser. */
export interface QueryArgs {
  readonly where: unknown;
  readonly limit: unknown;
  readonly cursor: unknown;
}

const queryArgsSchema = z
  .object({
    where: z.unknown().optional(),
    limit: z.unknown().optional(),
    cursor: z.unknown().optional(),
  })
  .loose();

/**
 * Reads the arguments of `query`. Options that are not an object are an
 * `INVALID_INPUT` error, not an invalid response.
 */
export function parseQueryArgs(entity: string, options: unknown): QueryArgs {
  if (options === undefined) {
    return { where: undefined, limit: undefined, cursor: undefined };
  }
  const parsed = queryArgsSchema.safeParse(options);
  if (!parsed.success) {
    throw invalidInput(
      entity,
      "INVALID_INPUT",
      "options",
      "query options must be an object"
    );
  }
  return {
    where: parsed.data.where,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  };
}

/** Throws `INVALID_RESPONSE` when a response does not match `schema`. */
export function parseResponse<T>(
  entity: string,
  schema: z.ZodType<T>,
  value: unknown
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ValidationError({
      code: "INVALID_RESPONSE",
      message: `Frontal returned an invalid ${entity} response: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
      requestId: LOCAL_REQUEST_ID,
      fields: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: "INVALID_RESPONSE",
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

/**
 * Runs `fn` over `items` with at most `limit` calls in flight. The result is
 * in the order of `items`, whatever order the calls finish in.
 */
export async function mapBounded<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      const item = items[index];
      if (item === undefined) {
        throw new Error("mapBounded: item index out of range");
      }
      results[index] = await fn(item);
    }
  };
  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker()
  );
  await Promise.all(workers);
  return results;
}

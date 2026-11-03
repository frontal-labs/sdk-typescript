/**
 * Runtime checks for entity records and inputs, driven by
 * {@link OntologyRuntime} metadata. Every problem found is collected, then
 * thrown together as one `ValidationError` whose `fields` list each one.
 */
import { ValidationError } from "@frontal-labs/core";
import type { FieldKind, FieldSpec } from "./entity-runtime";

/** Request id used for errors raised locally, before any HTTP call. */
const LOCAL_REQUEST_ID = "local-validation";

/** The per-field entries carried by `ValidationError.fields`. */
type FieldProblem = ValidationError["fields"][number];

/** A stored or submitted object, before it is narrowed to an entity. */
export type ObjectRecord = Record<string, unknown>;

/** Runtime view of one entity, built once per client from the metadata. */
export interface EntityMeta {
  readonly name: string;
  /** Backend `object_type_id` that every record of this entity carries. */
  readonly objectTypeId: string;
  readonly fields: Readonly<Record<string, FieldSpec>>;
  readonly writable: ReadonlySet<string>;
  readonly relations: Readonly<
    Record<string, { target: string; foreignKey: string; optional: boolean }>
  >;
}

/** Human-readable description of an expected kind, for error messages. */
function describeKind(kind: FieldKind): string {
  if (typeof kind === "string") {
    return kind === "unknown" ? "any value" : `a ${kind}`;
  }
  return `one of ${kind.enum.map((value) => JSON.stringify(value)).join(", ")}`;
}

/** True when `value` has the runtime kind `kind`. */
function matchesKind(kind: FieldKind, value: unknown): boolean {
  if (kind === "unknown") {
    return true;
  }
  if (typeof kind === "object") {
    return typeof value === "string" && kind.enum.includes(value);
  }
  if (kind === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }
  return typeof value === kind;
}

/** Describes a value's JSON-level type for error messages. */
function describeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "an array";
  }
  return typeof value;
}

/**
 * Checks one present (non-`undefined`) value against its field spec.
 * `null` is accepted only for optional fields.
 */
function checkValue(
  entity: string,
  name: string,
  spec: FieldSpec,
  value: unknown,
  code: string
): FieldProblem | undefined {
  if (value === null) {
    return spec.required
      ? problem(name, "NULL", `${entity}.${name} must not be null`)
      : undefined;
  }
  if (matchesKind(spec.kind, value)) {
    return undefined;
  }
  return problem(
    name,
    code,
    `${entity}.${name} must be ${describeKind(spec.kind)}, got ${describeValue(value)}`
  );
}

function problem(field: string, code: string, message: string): FieldProblem {
  return { field, code, message };
}

/** Throws a `ValidationError` listing every problem. */
function fail(
  code: "INVALID_RESPONSE" | "INVALID_INPUT",
  summary: string,
  problems: FieldProblem[]
): never {
  const details = problems.map((entry) => entry.message).join("; ");
  throw new ValidationError({
    code,
    message: `${summary}: ${details}`,
    requestId: LOCAL_REQUEST_ID,
    fields: problems,
  });
}

/**
 * Narrows a record returned by the API to an entity. Every required field
 * must be present and non-null; optional fields may be absent or `null`;
 * fields present with the wrong kind are reported. Extra fields are allowed.
 *
 * @throws {ValidationError} with code `INVALID_RESPONSE`.
 */
export function parseStoredRecord(
  meta: EntityMeta,
  value: unknown
): ObjectRecord {
  const summary = `Frontal returned an invalid ${meta.name} record`;
  if (!isObjectRecord(value)) {
    fail("INVALID_RESPONSE", summary, [
      problem("", "NOT_AN_OBJECT", `${meta.name} record must be an object`),
    ]);
  }
  const problems: FieldProblem[] = [];
  if (typeof value.id !== "string") {
    problems.push(
      problem("id", "MISSING_ID", `${meta.name}.id must be a string`)
    );
  }
  for (const [name, spec] of Object.entries(meta.fields)) {
    const actual = value[name];
    if (actual === undefined) {
      if (spec.required) {
        problems.push(
          problem(name, "MISSING", `${meta.name}.${name} is required`)
        );
      }
      continue;
    }
    const found = checkValue(meta.name, name, spec, actual, "TYPE");
    if (found) {
      problems.push(found);
    }
  }
  if (problems.length > 0) {
    fail("INVALID_RESPONSE", summary, problems);
  }
  return value;
}

/**
 * Narrows an `ObjectResponse` to an entity. The HTTP client camelCases the
 * envelope keys (`objectId`, `objectTypeId`) and copies `properties` through
 * untouched, so property names are exactly the ontology's field names. The
 * envelope must name the object type of `meta`; the entity is the properties
 * plus `id = objectId`, checked like any stored record.
 *
 * @throws {ValidationError} with code `INVALID_RESPONSE`.
 */
export function parseObjectRecord(
  meta: EntityMeta,
  value: unknown
): ObjectRecord {
  const summary = `Frontal returned an invalid ${meta.name} record`;
  if (!isObjectRecord(value)) {
    fail("INVALID_RESPONSE", summary, [
      problem("", "NOT_AN_OBJECT", `${meta.name} record must be an object`),
    ]);
  }
  const problems: FieldProblem[] = [];
  if (typeof value.objectId !== "string") {
    problems.push(
      problem("id", "MISSING_ID", `${meta.name} objectId must be a string`)
    );
  }
  if (value.objectTypeId !== meta.objectTypeId) {
    problems.push(
      problem(
        "objectTypeId",
        "WRONG_TYPE",
        `${meta.name} objectTypeId must be "${meta.objectTypeId}", got ${JSON.stringify(value.objectTypeId)}`
      )
    );
  }
  if (!isObjectRecord(value.properties)) {
    problems.push(
      problem(
        "properties",
        "NOT_AN_OBJECT",
        `${meta.name} properties must be an object`
      )
    );
  }
  if (problems.length > 0) {
    fail("INVALID_RESPONSE", summary, problems);
  }
  return parseStoredRecord(meta, {
    ...(value.properties as ObjectRecord),
    id: value.objectId,
  });
}

/**
 * Narrows a list response to entities. Every element is checked; one invalid
 * element fails the whole list rather than being dropped silently.
 *
 * @throws {ValidationError} with code `INVALID_RESPONSE`.
 */
export function parseObjectList(
  meta: EntityMeta,
  value: unknown
): ObjectRecord[] {
  if (!Array.isArray(value)) {
    fail("INVALID_RESPONSE", `Frontal returned an invalid ${meta.name} list`, [
      problem("", "NOT_A_LIST", `${meta.name} list must be an array`),
    ]);
  }
  return value.map((item) => parseObjectRecord(meta, item));
}

/**
 * Checks the input of `create`, `put` or `update`. Keys must be writable
 * fields, and each present value must match its kind. Required fields are
 * not checked for presence here: that is enforced by the compile-time input
 * types, because some required fields have server-side defaults.
 *
 * @throws {ValidationError} with code `INVALID_INPUT`.
 */
export function parseInput(
  meta: EntityMeta,
  value: unknown,
  operation: "create" | "put" | "update"
): ObjectRecord {
  const summary = `Invalid ${meta.name} ${operation} input`;
  if (!isObjectRecord(value)) {
    fail("INVALID_INPUT", summary, [
      problem("", "NOT_AN_OBJECT", `${operation} input must be an object`),
    ]);
  }
  const problems: FieldProblem[] = [];
  for (const [name, actual] of Object.entries(value)) {
    if (actual === undefined) {
      continue;
    }
    const spec = Object.hasOwn(meta.fields, name)
      ? meta.fields[name]
      : undefined;
    if (spec === undefined) {
      problems.push(
        problem(name, "UNKNOWN_FIELD", `${meta.name} has no field "${name}"`)
      );
    } else if (meta.writable.has(name)) {
      const found = checkValue(meta.name, name, spec, actual, "TYPE");
      if (found) {
        problems.push(found);
      }
    } else {
      problems.push(
        problem(name, "NOT_WRITABLE", `${meta.name}.${name} is read-only`)
      );
    }
  }
  if (problems.length > 0) {
    fail("INVALID_INPUT", summary, problems);
  }
  return value;
}

/**
 * Throws for a required relation whose foreign key is missing or null, which
 * means the stored data is inconsistent with the ontology.
 */
export function missingRelationTarget(
  owner: string,
  relation: string,
  foreignKey: string
): ValidationError {
  return new ValidationError({
    code: "INVALID_RESPONSE",
    message: `Frontal returned an invalid ${owner} record: required relation "${relation}" has no "${foreignKey}"`,
    requestId: LOCAL_REQUEST_ID,
    fields: [
      problem(
        foreignKey,
        "MISSING",
        `${owner}.${foreignKey} is required by relation "${relation}"`
      ),
    ],
  });
}

/** Throws a `ValidationError` for an id that cannot address an object. */
export function assertId(entity: string, id: unknown): asserts id is string {
  if (typeof id !== "string" || id.length === 0) {
    fail("INVALID_INPUT", `Invalid ${entity} id`, [
      problem("id", "INVALID_ID", `${entity} id must be a non-empty string`),
    ]);
  }
}

function isObjectRecord(value: unknown): value is ObjectRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

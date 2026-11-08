/**
 * Derives {@link UntypedOntologyRuntime} from the object types the API returns.
 *
 * The rules mirror the Frontal CLI's generator (`src/lib/ontology/normalize.ts`
 * and `render/client.ts`), so a client built from the live API behaves like a
 * generated `.frontal/client.ts`. Keep the two in step: a parity test in the CLI
 * repository compares them.
 */
import { invalidRequestError, ValidationError } from "@frontal-labs/core";
import { z } from "zod";
import type {
  FieldKind,
  FieldSpec,
  RelationSpec,
  UntypedOntologyRuntime,
} from "./entity-runtime";

/** Object types collection (`/v1/ontology/objects/object-types`), unpaged. */
export const OBJECT_TYPES_PATH = "/ontology/objects/object-types";

/** The object id; it is never a declared field. */
const OBJECT_ID_FIELD = "id";

const FIELD_KINDS: Readonly<Record<string, FieldKind>> = {
  boolean: "boolean",
  currency: "number",
  float: "number",
  integer: "number",
  json: "unknown",
  array: "unknown",
  string: "string",
  text: "string",
  timestamp: "string",
  uuid: "string",
  vector: "unknown",
};

const fieldSchema = z
  .object({
    type: z.string(),
    required: z.boolean().optional(),
    primary: z.boolean().optional(),
    auto: z.boolean().optional(),
    computed: z.boolean().optional(),
    enum: z.array(z.string()).optional(),
  })
  .loose();

const relationSchema = z
  .object({
    type: z.enum(["belongsTo", "hasOne", "hasMany", "manyToMany"]),
    targetEntity: z.string().min(1),
    foreignKey: z.string().min(1).optional(),
    relationshipTypeId: z.string().min(1).optional(),
  })
  .loose();

const definitionSchema = z
  .object({
    fields: z.record(z.string(), fieldSchema),
    relationships: z.record(z.string(), relationSchema).optional(),
    version: z.number().int().optional(),
  })
  .loose();

const objectTypeSchema = z
  .object({
    object_type_id: z.string().min(1),
    name: z.string().min(1),
    schema: definitionSchema,
  })
  .loose();

type ObjectTypeRecord = z.infer<typeof objectTypeSchema>;
type FieldDefinition = z.infer<typeof fieldSchema>;

/** Code-point order, the same ordering the CLI generator uses. */
function compareNames(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

function sortedKeys(record: Readonly<Record<string, unknown>>): string[] {
  return Object.keys(record).sort(compareNames);
}

function invalid(message: string): ValidationError {
  return new ValidationError({
    code: "INVALID_RESPONSE",
    message,
    requestId: "local-validation",
  });
}

/** Parses the response body, naming the failing object type and path. */
function parseObjectTypes(response: unknown): ObjectTypeRecord[] {
  if (!Array.isArray(response)) {
    throw invalid(
      "Frontal returned an object-types response that is not a list."
    );
  }
  return response.map((item, index) => {
    const parsed = objectTypeSchema.safeParse(item);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path.join(".") || "(record)";
      throw invalid(
        `Object type #${index + 1} is malformed (${where}: ${issue?.message ?? "invalid"}).`
      );
    }
    return parsed.data;
  });
}

/** The runtime kind of one declared field, or an error for an unknown type. */
function kindOf(
  entity: string,
  name: string,
  field: FieldDefinition
): FieldKind {
  if (field.type === "enum") {
    const values = field.enum ?? [];
    if (values.length === 0) {
      throw invalid(`${entity}.${name} is an enum without values.`);
    }
    if (new Set(values).size !== values.length) {
      throw invalid(`${entity}.${name} has duplicate enum values.`);
    }
    return { enum: [...values] };
  }
  const kind = Object.hasOwn(FIELD_KINDS, field.type)
    ? FIELD_KINDS[field.type]
    : undefined;
  if (kind === undefined) {
    throw invalid(
      `${entity}.${name} has an unknown field type "${field.type}".`
    );
  }
  return kind;
}

interface DerivedField {
  readonly name: string;
  readonly kind: FieldKind;
  readonly required: boolean;
  readonly readOnly: boolean;
}

/**
 * Derives the runtime metadata for every object type. Entities are sorted by
 * name, fields by name, and relations by name, so the result is deterministic.
 *
 * Relations: `belongsTo` reads a foreign key from the source record; the key
 * defaults to `<name>Id`, and an undeclared key becomes an optional writable
 * field. `hasOne`, `hasMany` and `manyToMany` resolve through relationship
 * instances and need a `relationshipTypeId` in the schema (a `TypeError` when
 * it is missing). Every relation's target is checked.
 *
 * @throws {ValidationError} with code `INVALID_RESPONSE` for malformed records,
 *   duplicate names, unknown relation targets, or a relation whose name matches
 *   a field.
 */
export function deriveOntologyRuntime(
  response: unknown
): UntypedOntologyRuntime {
  const records = parseObjectTypes(response);
  const byName = new Map<string, ObjectTypeRecord>();
  const ids = new Set<string>();
  for (const record of records) {
    if (byName.has(record.name)) {
      throw invalid(
        `Object type name "${record.name}" is defined more than once.`
      );
    }
    if (ids.has(record.object_type_id)) {
      throw invalid(
        `Object type id "${record.object_type_id}" is used more than once.`
      );
    }
    byName.set(record.name, record);
    ids.add(record.object_type_id);
  }
  const entities = [...byName.keys()].sort(compareNames);

  const objectTypeIds: Record<string, string> = {};
  const fields: Record<string, Record<string, FieldSpec>> = {};
  const writable: Record<string, string[]> = {};
  const relations: Record<string, Record<string, RelationSpec>> = {};

  for (const entity of entities) {
    const record = byName.get(entity);
    if (record === undefined) {
      continue;
    }
    objectTypeIds[entity] = record.object_type_id;
    const declared = record.schema.fields;
    const derived = new Map<string, DerivedField>();
    for (const name of sortedKeys(declared)) {
      if (name === OBJECT_ID_FIELD) {
        continue;
      }
      const field = declared[name];
      if (field === undefined) {
        continue;
      }
      derived.set(name, {
        kind: kindOf(entity, name, field),
        name,
        readOnly:
          field.primary === true ||
          field.auto === true ||
          field.computed === true,
        required: field.required === true,
      });
    }

    const entityRelations: Record<string, RelationSpec> = {};
    const declaredRelations = record.schema.relationships ?? {};
    for (const relation of sortedKeys(declaredRelations)) {
      const spec = declaredRelations[relation];
      if (spec === undefined) {
        continue;
      }
      if (!byName.has(spec.targetEntity)) {
        throw invalid(
          `Relation "${entity}.${relation}" targets unknown entity "${spec.targetEntity}".`
        );
      }
      if (spec.type !== "belongsTo") {
        if (spec.relationshipTypeId === undefined) {
          throw invalidRequestError(
            `Relation "${entity}.${relation}" is ${spec.type} and needs a relationshipTypeId in its schema.`
          );
        }
        entityRelations[relation] = {
          cardinality: spec.type,
          relationshipTypeId: spec.relationshipTypeId,
          target: spec.targetEntity,
        };
        continue;
      }
      const foreignKey = spec.foreignKey ?? `${relation}Id`;
      let foreign = derived.get(foreignKey);
      if (foreign === undefined) {
        foreign = {
          kind: "string",
          name: foreignKey,
          readOnly: false,
          required: false,
        };
        derived.set(foreignKey, foreign);
      }
      entityRelations[relation] = {
        cardinality: "belongsTo",
        foreignKey,
        optional: !foreign.required,
        target: spec.targetEntity,
      };
    }
    for (const relation of Object.keys(entityRelations)) {
      if (derived.has(relation)) {
        throw invalid(
          `Relation "${entity}.${relation}" has the same name as a field. Rename one of them.`
        );
      }
    }

    const names = [...derived.keys()].sort(compareNames);
    const entityFields: Record<string, FieldSpec> = {
      [OBJECT_ID_FIELD]: { kind: "string", required: true },
    };
    const entityWritable: string[] = [];
    for (const name of names) {
      const field = derived.get(name);
      if (field === undefined) {
        continue;
      }
      entityFields[name] = { kind: field.kind, required: field.required };
      if (!field.readOnly) {
        entityWritable.push(name);
      }
    }
    fields[entity] = entityFields;
    writable[entity] = entityWritable;
    relations[entity] = Object.fromEntries(
      sortedKeys(entityRelations).flatMap((name) => {
        const spec = entityRelations[name];
        return spec === undefined ? [] : [[name, spec] as const];
      })
    );
  }

  return { entities, fields, objectTypeIds, relations, writable };
}

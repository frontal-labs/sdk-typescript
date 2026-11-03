import type {
  FieldSpec,
  OntologyRuntime,
  RelationSpec,
} from "./entity-runtime";
import type { OntologyClient } from "./entity-types";
import {
  assertId,
  type EntityMeta,
  missingRelationTarget,
  type ObjectRecord,
  parseInput,
  parseStoredRecord,
} from "./entity-validate";
import type { OntologySdk } from "./sdk";

/**
 * Property names that probes use (`await`, `JSON.stringify`, test runners).
 * They resolve to `undefined` instead of throwing "unknown entity".
 */
const PROBE_NAMES: ReadonlySet<string> = new Set([
  "then",
  "toJSON",
  "asymmetricMatch",
  "$$typeof",
  "nodeType",
]);

/** Untyped view of the runtime metadata, used after the typed boundary. */
interface RuntimeData {
  readonly entities: readonly string[];
  readonly fields: Readonly<
    Record<string, Readonly<Record<string, FieldSpec>>>
  >;
  readonly writable: Readonly<Record<string, readonly string[]>>;
  readonly relations: Readonly<
    Record<string, Readonly<Record<string, RelationSpec>>>
  >;
}

/** Untyped entity handle, used internally and cast once at the boundary. */
interface RuntimeHandle {
  get(id: string): Promise<ObjectRecord>;
  create(input: unknown): Promise<ObjectRecord>;
  put(id: string, input: unknown): Promise<ObjectRecord>;
  update(id: string, patch: unknown): Promise<ObjectRecord>;
  delete(id: string): Promise<void>;
}

/** Reads an own property, ignoring inherited names such as `constructor`. */
function ownValue<T>(
  record: Readonly<Record<string, T>>,
  key: string
): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

/**
 * Checks the metadata for internal consistency, then builds one
 * {@link EntityMeta} per entity. Inconsistent metadata is a programming error
 * in the generated client, so it throws a `TypeError` at construction.
 */
function buildMetas(
  data: RuntimeData,
  sdkMembers: (name: string) => boolean
): Map<string, EntityMeta> {
  const metas = new Map<string, EntityMeta>();
  for (const name of data.entities) {
    if (sdkMembers(name)) {
      throw new TypeError(
        `Ontology entity "${name}" collides with an SDK member on ontology. Rename the entity.`
      );
    }
    const fields = ownValue(data.fields, name);
    if (fields === undefined) {
      throw new TypeError(
        `Ontology entity "${name}" has no fields in runtime metadata.`
      );
    }
    if (ownValue(fields, "id") === undefined) {
      throw new TypeError(
        `Ontology entity "${name}" must list "id" in its fields.`
      );
    }
    const writable = ownValue(data.writable, name) ?? [];
    for (const field of writable) {
      if (ownValue(fields, field) === undefined) {
        throw new TypeError(
          `Ontology entity "${name}" lists writable field "${field}" that is not in its fields.`
        );
      }
    }
    metas.set(name, {
      name,
      fields,
      writable: new Set(writable),
      relations: ownValue(data.relations, name) ?? {},
    });
  }
  for (const meta of metas.values()) {
    for (const [relation, spec] of Object.entries(meta.relations)) {
      if (!metas.has(spec.target)) {
        throw new TypeError(
          `Relation "${meta.name}.${relation}" targets "${spec.target}", which is not an entity in the runtime metadata.`
        );
      }
      if (ownValue(meta.fields, spec.foreignKey) === undefined) {
        throw new TypeError(
          `Relation "${meta.name}.${relation}" uses foreign key "${spec.foreignKey}", which is not a field of ${meta.name}.`
        );
      }
      if (ownValue(meta.fields, relation) !== undefined) {
        throw new TypeError(
          `Relation "${meta.name}.${relation}" has the same name as a field.`
        );
      }
    }
  }
  return metas;
}

/** Builds the untyped handles for every entity in `metas`. */
function buildHandles(
  http: OntologySdk,
  metas: Map<string, EntityMeta>
): Map<string, RuntimeHandle> {
  const objects = http.objects;

  /** Attaches non-enumerable relation accessors to a stored record. */
  const withRelations = (
    record: ObjectRecord,
    meta: EntityMeta
  ): ObjectRecord => {
    for (const [relation, spec] of Object.entries(meta.relations)) {
      Object.defineProperty(record, relation, {
        enumerable: false,
        configurable: true,
        writable: false,
        value: () => resolveRelation(record, meta, relation, spec),
      });
    }
    return record;
  };

  /** Fetches the target of a relation through its foreign key. */
  const resolveRelation = async (
    source: ObjectRecord,
    meta: EntityMeta,
    relation: string,
    spec: RelationSpec
  ): Promise<ObjectRecord | null> => {
    const key = source[spec.foreignKey];
    if (key === undefined || key === null) {
      if (spec.optional) {
        return null;
      }
      throw missingRelationTarget(meta.name, relation, spec.foreignKey);
    }
    if (typeof key !== "string") {
      throw missingRelationTarget(meta.name, relation, spec.foreignKey);
    }
    const target = metaOf(spec.target);
    const raw = await objects.getObject(key);
    return withRelations(parseStoredRecord(target, raw), target);
  };

  const metaOf = (name: string): EntityMeta => {
    const meta = metas.get(name);
    if (meta === undefined) {
      throw new TypeError(`Unknown ontology entity "${name}".`);
    }
    return meta;
  };

  const handleFor = (meta: EntityMeta): RuntimeHandle => ({
    async get(id) {
      assertId(meta.name, id);
      return withRelations(
        parseStoredRecord(meta, await objects.getObject(id)),
        meta
      );
    },
    async create(input) {
      const body = parseInput(meta, input, "create");
      // ASSUMPTION: the backend accepts client-generated object ids.
      const id = globalThis.crypto.randomUUID();
      return withRelations(
        parseStoredRecord(meta, await objects.putObject(id, body)),
        meta
      );
    },
    async put(id, input) {
      assertId(meta.name, id);
      const body = parseInput(meta, input, "put");
      return withRelations(
        parseStoredRecord(meta, await objects.putObject(id, body)),
        meta
      );
    },
    async update(id, patch) {
      assertId(meta.name, id);
      // Validate the patch before any request, so bad keys cost no round trip.
      const changes = parseInput(meta, patch, "update");
      const current = parseStoredRecord(meta, await objects.getObject(id));
      // Send only writable fields, so server-computed fields are not echoed.
      const body: ObjectRecord = {};
      for (const field of meta.writable) {
        if (current[field] !== undefined) {
          body[field] = current[field];
        }
      }
      Object.assign(body, changes);
      return withRelations(
        parseStoredRecord(meta, await objects.putObject(id, body)),
        meta
      );
    },
    async delete(id) {
      assertId(meta.name, id);
      await objects.deleteObject(id);
    },
  });

  const handles = new Map<string, RuntimeHandle>();
  for (const meta of metas.values()) {
    handles.set(meta.name, handleFor(meta));
  }
  return handles;
}

/**
 * Returns `sdk.ontology` with one typed handle per entity in `runtime`.
 *
 * Existing `OntologySdk` members are returned unchanged. A name that is
 * neither an SDK member nor an entity throws a `TypeError` that lists the
 * known entities, except for probe names such as `then` and `toJSON`.
 *
 * @internal Used by `Frontal`. Application code reaches handles as
 * `frontal.ontology.<Entity>`.
 */
export function withEntityHandles<O>(
  sdk: OntologySdk,
  runtime: OntologyRuntime<O> | undefined
): OntologyClient<O> {
  // The typed metadata is structurally the untyped view; this is the single
  // point where the compile-time keys are erased.
  const data: RuntimeData | undefined = runtime as RuntimeData | undefined;
  const metas = buildMetas(
    data ?? { entities: [], fields: {}, writable: {}, relations: {} },
    (name) => Reflect.has(sdk, name)
  );
  const handles = buildHandles(sdk, metas);
  const known = [...handles.keys()].sort();
  const describeKnown = known.length > 0 ? known.join(", ") : "(none)";

  return new Proxy(sdk, {
    get(target, prop, receiver) {
      if (typeof prop === "symbol" || Reflect.has(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }
      const handle = handles.get(prop);
      if (handle !== undefined) {
        return handle;
      }
      if (PROBE_NAMES.has(prop)) {
        return undefined;
      }
      throw new TypeError(
        `Unknown ontology entity "${prop}". Known entities: ${describeKnown}.`
      );
    },
    has(target, prop) {
      return (
        Reflect.has(target, prop) ||
        (typeof prop === "string" && handles.has(prop))
      );
    },
  }) as unknown as OntologyClient<O>;
}

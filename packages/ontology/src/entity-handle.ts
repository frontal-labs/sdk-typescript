import { type HttpClient, raw } from "@frontal-labs/core";
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
  parseObjectList,
  parseObjectRecord,
} from "./entity-validate";
import type { OntologySdk } from "./sdk";

/** Collection of stored objects (`/v1/ontology/objects/objects`). */
const OBJECTS_PATH = "/ontology/objects/objects";

/**
 * Top-level response key whose contents are user-defined property names. The
 * HTTP client leaves it exactly as sent; every other key is camelCased.
 */
const PROPERTIES_KEY = ["properties"] as const;
const PRESERVE = { preserveKeys: PROPERTIES_KEY } as const;

/** Path of one stored object. */
function objectPath(id: string): string {
  return `${OBJECTS_PATH}/${encodeURIComponent(id)}`;
}

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
  readonly objectTypeIds: Readonly<Record<string, string>>;
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
  list(): Promise<ObjectRecord[]>;
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
    const objectTypeId = ownValue(data.objectTypeIds, name);
    if (typeof objectTypeId !== "string" || objectTypeId.length === 0) {
      throw new TypeError(
        `Ontology entity "${name}" has no objectTypeIds entry in runtime metadata.`
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
      objectTypeId,
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
  http: HttpClient,
  metas: Map<string, EntityMeta>
): Map<string, RuntimeHandle> {
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

  const metaOf = (name: string): EntityMeta => {
    const meta = metas.get(name);
    if (meta === undefined) {
      throw new TypeError(`Unknown ontology entity "${name}".`);
    }
    return meta;
  };

  /** Fetches one stored object and narrows it to `meta`'s entity. */
  const fetchOne = async (
    meta: EntityMeta,
    id: string
  ): Promise<ObjectRecord> =>
    withRelations(
      parseObjectRecord(
        meta,
        await http.get<unknown>(
          objectPath(id),
          undefined,
          undefined,
          {},
          PRESERVE
        )
      ),
      meta
    );

  /** Writes `properties` under `id` (PUT) and narrows the response. */
  const replaceOne = async (
    meta: EntityMeta,
    id: string,
    properties: ObjectRecord
  ): Promise<ObjectRecord> =>
    withRelations(
      parseObjectRecord(
        meta,
        await http.put<unknown>(
          objectPath(id),
          {
            object_type_id: meta.objectTypeId,
            object_id: id,
            properties: raw(properties),
          },
          undefined,
          PRESERVE
        )
      ),
      meta
    );

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
    return fetchOne(metaOf(spec.target), key);
  };

  const handleFor = (meta: EntityMeta): RuntimeHandle => ({
    async list() {
      // The backend answers with every object of the type; it is not paged.
      const response = await http.get<unknown>(
        OBJECTS_PATH,
        { object_type_id: meta.objectTypeId },
        undefined,
        {},
        PRESERVE
      );
      return parseObjectList(meta, response).map((record) =>
        withRelations(record, meta)
      );
    },
    async get(id) {
      assertId(meta.name, id);
      return fetchOne(meta, id);
    },
    async create(input) {
      const properties = parseInput(meta, input, "create");
      // The server generates the object id.
      return withRelations(
        parseObjectRecord(
          meta,
          await http.post<unknown>(
            OBJECTS_PATH,
            { object_type_id: meta.objectTypeId, properties: raw(properties) },
            undefined,
            PRESERVE
          )
        ),
        meta
      );
    },
    async put(id, input) {
      assertId(meta.name, id);
      return replaceOne(meta, id, parseInput(meta, input, "put"));
    },
    async update(id, patch) {
      assertId(meta.name, id);
      // Validate the patch before any request, so bad keys cost no round trip.
      const changes = parseInput(meta, patch, "update");
      const current = await fetchOne(meta, id);
      // Send only writable fields, so server-computed fields are not echoed.
      const properties: ObjectRecord = {};
      for (const field of meta.writable) {
        if (current[field] !== undefined) {
          properties[field] = current[field];
        }
      }
      Object.assign(properties, changes);
      return replaceOne(meta, id, properties);
    },
    async delete(id) {
      assertId(meta.name, id);
      await http.delete(objectPath(id));
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
  http: HttpClient,
  runtime: OntologyRuntime<O> | undefined
): OntologyClient<O> {
  // The typed metadata is structurally the untyped view; this is the single
  // point where the compile-time keys are erased.
  const data: RuntimeData | undefined = runtime as RuntimeData | undefined;
  const metas = buildMetas(
    data ?? {
      entities: [],
      objectTypeIds: {},
      fields: {},
      writable: {},
      relations: {},
    },
    (name) => Reflect.has(sdk, name)
  );
  const handles = buildHandles(http, metas);
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

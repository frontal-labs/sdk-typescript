import { type HttpClient, raw } from "@frontal-labs/core";
import { deriveOntologyRuntime, OBJECT_TYPES_PATH } from "./entity-derive";
import type {
  OntologyRuntime,
  RelationSpec,
  UntypedOntologyRuntime,
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

/** Object types are read as sent, so their field names keep their case. */
const UNTRANSFORMED = { untransformed: true } as const;

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
  data: UntypedOntologyRuntime,
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

/** Resolves the metadata of every entity, once per client. */
type MetaSource = () => Promise<Map<string, EntityMeta>>;

/** Reads the live object types and derives the metadata from them. */
async function loadLiveMetas(
  http: HttpClient,
  sdkMembers: (name: string) => boolean
): Promise<Map<string, EntityMeta>> {
  const response = await http.get<unknown>(
    OBJECT_TYPES_PATH,
    undefined,
    undefined,
    {},
    UNTRANSFORMED
  );
  return buildMetas(deriveOntologyRuntime(response), sdkMembers);
}

/**
 * A source that reads the live ontology on first use. Concurrent first calls
 * share one request; a failed read is not cached, so the next call retries.
 */
function liveSource(
  http: HttpClient,
  sdkMembers: (name: string) => boolean
): MetaSource {
  let pending: Promise<Map<string, EntityMeta>> | undefined;
  return () => {
    pending ??= loadLiveMetas(http, sdkMembers).catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
}

/** Operations shared by every entity handle, bound to one client. */
interface Ops {
  metaFor(entity: string): Promise<EntityMeta>;
  fetchOne(meta: EntityMeta, id: string): Promise<ObjectRecord>;
  replaceOne(
    meta: EntityMeta,
    id: string,
    properties: ObjectRecord
  ): Promise<ObjectRecord>;
  withRelations(record: ObjectRecord, meta: EntityMeta): ObjectRecord;
}

function createOps(http: HttpClient, source: MetaSource): Ops {
  const metaFor = async (entity: string): Promise<EntityMeta> => {
    const metas = await source();
    const meta = metas.get(entity);
    if (meta === undefined) {
      throw new TypeError(
        `Entity "${entity}" is not in the live ontology; types may be out of date, run frontal sync`
      );
    }
    return meta;
  };

  /** Fetches the target of a relation through its foreign key. */
  const resolveRelation = async (
    record: ObjectRecord,
    meta: EntityMeta,
    relation: string,
    spec: RelationSpec
  ): Promise<ObjectRecord | null> => {
    const key = record[spec.foreignKey];
    if (key === undefined || key === null) {
      if (spec.optional) {
        return null;
      }
      throw missingRelationTarget(meta.name, relation, spec.foreignKey);
    }
    if (typeof key !== "string") {
      throw missingRelationTarget(meta.name, relation, spec.foreignKey);
    }
    return fetchOne(await metaFor(spec.target), key);
  };

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

  return { metaFor, fetchOne, replaceOne, withRelations };
}

/** Builds the handle for one entity name. Metadata is resolved per call. */
function handleFor(http: HttpClient, ops: Ops, entity: string): RuntimeHandle {
  const { metaFor, fetchOne, replaceOne, withRelations } = ops;
  return {
    async list() {
      const meta = await metaFor(entity);
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
      const meta = await metaFor(entity);
      assertId(meta.name, id);
      return fetchOne(meta, id);
    },
    async create(input) {
      const meta = await metaFor(entity);
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
      const meta = await metaFor(entity);
      assertId(meta.name, id);
      return replaceOne(meta, id, parseInput(meta, input, "put"));
    },
    async update(id, patch) {
      const meta = await metaFor(entity);
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
      const meta = await metaFor(entity);
      assertId(meta.name, id);
      await http.delete(objectPath(id));
    },
  };
}

/**
 * Returns `sdk.ontology` with one typed handle per entity.
 *
 * With `runtime`, the metadata is used as given and no request is made. Entity
 * names outside it throw a `TypeError` that lists the known entities.
 *
 * Without `runtime`, the first use of any entity reads the object types from
 * the API once per client and derives the metadata. A name the live ontology
 * does not contain rejects on use, not on access.
 *
 * Existing `OntologySdk` members are returned unchanged. Probe names such as
 * `then` and `toJSON` resolve to `undefined`.
 *
 * @internal Used by `Frontal`. Application code reaches handles as
 * `frontal.ontology.<Entity>`.
 */
export function withEntityHandles<O>(
  sdk: OntologySdk,
  http: HttpClient,
  runtime: OntologyRuntime<O> | undefined
): OntologyClient<O> {
  const sdkMember = (name: string): boolean => Reflect.has(sdk, name);
  // A typed `OntologyRuntime<O>` is assignable to the untyped view: the typed
  // keys are a subset of `string`, so no cast is needed.
  const pinned =
    runtime === undefined ? undefined : buildMetas(runtime, sdkMember);
  const source: MetaSource =
    pinned === undefined
      ? liveSource(http, sdkMember)
      : () => Promise.resolve(pinned);
  const ops = createOps(http, source);
  const pinnedNames = pinned === undefined ? undefined : new Set(pinned.keys());
  const describeKnown = pinnedNames
    ? [...pinnedNames].sort().join(", ") || "(none)"
    : "";

  const handles = new Map<string, RuntimeHandle>();
  const handle = (name: string): RuntimeHandle => {
    let cached = handles.get(name);
    if (cached === undefined) {
      cached = handleFor(http, ops, name);
      handles.set(name, cached);
    }
    return cached;
  };

  // The Proxy exposes entity handles that are not statically visible on
  // OntologySdk. Their presence is guaranteed by the runtime check in `get` and
  // by the generated ontology type; the cast is the single typed boundary.
  return new Proxy(sdk, {
    get(target, prop, receiver) {
      if (typeof prop === "symbol" || Reflect.has(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }
      if (PROBE_NAMES.has(prop)) {
        return undefined;
      }
      if (pinnedNames !== undefined && !pinnedNames.has(prop)) {
        throw new TypeError(
          `Unknown ontology entity "${prop}". Known entities: ${describeKnown}.`
        );
      }
      return handle(prop);
    },
    has(target, prop) {
      if (Reflect.has(target, prop)) {
        return true;
      }
      return typeof prop === "string" && (pinnedNames?.has(prop) ?? false);
    },
  }) as OntologyClient<O>;
}

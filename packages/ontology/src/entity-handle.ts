import {
  ConflictError,
  type HttpClient,
  isFrontalError,
  PreconditionFailedError,
  raw,
  ValidationError,
} from "@frontal-labs/core";
import { deriveOntologyRuntime, OBJECT_TYPES_PATH } from "./entity-derive";
import {
  MAX_LIST_PAGES,
  MAX_PAGE_SIZE,
  mapBounded,
  parseCursor,
  parseLimit,
  parseQueryArgs,
  parseResponse,
  parseWhere,
  queryPageSchema,
  relationshipListSchema,
  toEnvelope,
} from "./entity-query";
import type {
  OntologyRuntime,
  RelationSpec,
  TraversalSpec,
  UntypedOntologyRuntime,
} from "./entity-runtime";
import type { OntologyClient } from "./entity-types";
import {
  assertId,
  type EntityMeta,
  missingRelationTarget,
  type ObjectRecord,
  parseInput,
  parseObjectRecord,
} from "./entity-validate";
import type { OntologySdk } from "./sdk";

/** Collection of stored objects (`/v1/ontology/objects/objects`). */
const OBJECTS_PATH = "/ontology/objects/objects";

/** Cursor-paged query over stored objects. */
const QUERY_PATH = `${OBJECTS_PATH}/query`;

/** Relationship instances (`/v1/ontology/relationships/relationships`). */
const RELATIONSHIPS_PATH = "/ontology/relationships/relationships";

/** Writes attempted by `update` before it reports a conflict. */
const MAX_WRITE_ATTEMPTS = 3;

/** Concurrent target fetches for a relation traversal. */
const TRAVERSAL_CONCURRENCY = 8;

/**
 * Top-level response key whose contents are user-defined property names. The
 * HTTP client leaves it exactly as sent; every other key is camelCased.
 */
const PROPERTIES_KEY = ["properties"] as const;
const PRESERVE = { preserveKeys: PROPERTIES_KEY } as const;

/** Read as sent: keys are snake_case envelopes or user-defined names. */
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

/** Query codes the server reports, rethrown with the same code. */
const SERVER_QUERY_CODES: ReadonlySet<string> = new Set([
  "UNKNOWN_PROPERTY",
  "INVALID_OPERATOR",
  "INVALID_CURSOR",
]);

/** Untyped entity handle, used internally and cast once at the boundary. */
interface RuntimeHandle {
  list(): Promise<ObjectRecord[]>;
  query(options: unknown): Promise<RuntimePage>;
  get(id: string): Promise<ObjectRecord>;
  create(input: unknown): Promise<ObjectRecord>;
  put(id: string, input: unknown): Promise<ObjectRecord>;
  update(id: string, patch: unknown): Promise<ObjectRecord>;
  delete(id: string): Promise<void>;
}

/** One page as the untyped handle returns it. */
interface RuntimePage {
  items: ObjectRecord[];
  nextCursor: string | null;
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
      if (
        spec.cardinality === "belongsTo" &&
        ownValue(meta.fields, spec.foreignKey) === undefined
      ) {
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

/** A query request, validated before it is sent. */
interface PageRequest {
  readonly where?: unknown;
  readonly limit?: unknown;
  readonly cursor?: unknown;
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
  queryPage(meta: EntityMeta, request: PageRequest): Promise<RuntimePage>;
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

  /** Runs one query page. Server rejections keep their code. */
  const queryPage = async (
    meta: EntityMeta,
    request: PageRequest
  ): Promise<RuntimePage> => {
    const where = parseWhere(meta, request.where);
    const limit = parseLimit(meta.name, request.limit);
    const cursor = parseCursor(meta.name, request.cursor);
    const body = {
      object_type_id: meta.objectTypeId,
      filter: raw(where),
      ...(limit === undefined ? {} : { limit }),
      ...(cursor === undefined ? {} : { cursor }),
    };
    let response: unknown;
    try {
      response = await http.post<unknown>(
        QUERY_PATH,
        body,
        undefined,
        UNTRANSFORMED
      );
    } catch (error) {
      if (isFrontalError(error) && SERVER_QUERY_CODES.has(error.code)) {
        throw new ValidationError({
          code: error.code,
          message: error.message,
          requestId: error.requestId,
        });
      }
      throw error;
    }
    const page = parseResponse(meta.name, queryPageSchema, response);
    return {
      items: page.results.map((result) =>
        withRelations(parseObjectRecord(meta, toEnvelope(result)), meta)
      ),
      nextCursor: page.next_cursor,
    };
  };

  /** The stored target ids of a relation, from its relationship instances. */
  const linksOf = async (
    record: ObjectRecord,
    meta: EntityMeta,
    relation: string,
    spec: TraversalSpec
  ): Promise<string[]> => {
    const { id: sourceId } = record;
    if (typeof sourceId !== "string") {
      throw missingRelationTarget(meta.name, relation, "id");
    }
    const response = await http.get<unknown>(
      RELATIONSHIPS_PATH,
      {
        source_object_id: sourceId,
        relationship_type_id: spec.relationshipTypeId,
      },
      undefined,
      {},
      UNTRANSFORMED
    );
    return parseResponse(meta.name, relationshipListSchema, response).map(
      (link) => link.target_object_id
    );
  };

  /** Resolves a `belongsTo` relation through its foreign key. */
  const resolveBelongsTo = async (
    record: ObjectRecord,
    meta: EntityMeta,
    relation: string,
    spec: Extract<RelationSpec, { cardinality: "belongsTo" }>
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

  /** Resolves `hasMany` and `manyToMany`: every linked target, in order. */
  const resolveMany = async (
    record: ObjectRecord,
    meta: EntityMeta,
    relation: string,
    spec: TraversalSpec
  ): Promise<ObjectRecord[]> => {
    const targetMeta = await metaFor(spec.target);
    const ids = await linksOf(record, meta, relation, spec);
    return mapBounded(ids, TRAVERSAL_CONCURRENCY, (id) =>
      fetchOne(targetMeta, id)
    );
  };

  /** Resolves `hasOne`: none gives `null`, more than one is an error. */
  const resolveHasOne = async (
    record: ObjectRecord,
    meta: EntityMeta,
    relation: string,
    spec: TraversalSpec
  ): Promise<ObjectRecord | null> => {
    const ids = await linksOf(record, meta, relation, spec);
    const [only, ...rest] = ids;
    if (only === undefined) {
      return null;
    }
    if (rest.length > 0) {
      throw new ValidationError({
        code: "TOO_MANY_RELATIONSHIPS",
        message: `${meta.name}.${relation} has ${ids.length} targets; a hasOne relation has at most one`,
        requestId: "local-validation",
        fields: [
          {
            field: relation,
            code: "TOO_MANY_RELATIONSHIPS",
            message: `${ids.length} targets for a hasOne relation`,
          },
        ],
      });
    }
    return fetchOne(await metaFor(spec.target), only);
  };

  /** Resolves a relation by its cardinality. */
  const resolveRelation = (
    record: ObjectRecord,
    meta: EntityMeta,
    relation: string,
    spec: RelationSpec
  ): Promise<ObjectRecord | ObjectRecord[] | null> => {
    switch (spec.cardinality) {
      case "belongsTo":
        return resolveBelongsTo(record, meta, relation, spec);
      case "hasOne":
        return resolveHasOne(record, meta, relation, spec);
      case "hasMany":
      case "manyToMany":
        return resolveMany(record, meta, relation, spec);
      default: {
        const unreachable: never = spec;
        throw new TypeError(
          `Relation "${meta.name}.${relation}" has an unknown cardinality: ${JSON.stringify(unreachable)}`
        );
      }
    }
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

  return { metaFor, fetchOne, replaceOne, queryPage, withRelations };
}

/**
 * Reads one stored object with its `ETag`. A response without an `ETag` cannot
 * be written safely, so it is an error rather than a silent unconditional write.
 */
async function fetchWithEtag(
  http: HttpClient,
  meta: EntityMeta,
  id: string
): Promise<{ record: ObjectRecord; etag: string }> {
  const capture: { etag: string | undefined } = { etag: undefined };
  const response = await http.get<unknown>(
    objectPath(id),
    undefined,
    undefined,
    {},
    {
      preserveKeys: PROPERTIES_KEY,
      onResponse: (headers) => {
        capture.etag = headers.get("ETag") ?? undefined;
      },
    }
  );
  const record = parseObjectRecord(meta, response);
  if (capture.etag === undefined) {
    throw new ValidationError({
      code: "INVALID_RESPONSE",
      message: `Frontal returned ${meta.name} ${id} without an ETag; refusing an unconditional update`,
      requestId: "local-validation",
      fields: [
        {
          field: "ETag",
          code: "MISSING",
          message: "the ETag header is required for update",
        },
      ],
    });
  }
  return { record, etag: capture.etag };
}

/** Builds the handle for one entity name. Metadata is resolved per call. */
function handleFor(http: HttpClient, ops: Ops, entity: string): RuntimeHandle {
  const { metaFor, fetchOne, replaceOne, queryPage, withRelations } = ops;
  return {
    async list() {
      const meta = await metaFor(entity);
      const items: ObjectRecord[] = [];
      let cursor: string | undefined;
      for (let page = 1; page <= MAX_LIST_PAGES; page += 1) {
        const result = await queryPage(meta, {
          limit: MAX_PAGE_SIZE,
          cursor,
        });
        items.push(...result.items);
        if (result.nextCursor === null) {
          return items;
        }
        cursor = result.nextCursor;
      }
      throw new ValidationError({
        code: "TOO_MANY_PAGES",
        message: `${meta.name} list exceeded ${MAX_LIST_PAGES} pages`,
        requestId: "local-validation",
        fields: [],
      });
    },
    async query(options) {
      const args = parseQueryArgs(entity, options);
      const meta = await metaFor(entity);
      return queryPage(meta, args);
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
      let lastError: unknown;
      for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt += 1) {
        const { record, etag } = await fetchWithEtag(http, meta, id);
        // Send only writable fields, so server-computed fields are not echoed.
        const properties: ObjectRecord = {};
        for (const field of meta.writable) {
          if (record[field] !== undefined) {
            properties[field] = record[field];
          }
        }
        Object.assign(properties, changes);
        try {
          return withRelations(
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
                { preserveKeys: PROPERTIES_KEY, headers: { "If-Match": etag } }
              )
            ),
            meta
          );
        } catch (error) {
          if (!PreconditionFailedError.isInstance(error)) {
            throw error;
          }
          lastError = error;
        }
      }
      const requestId = isFrontalError(lastError)
        ? lastError.requestId
        : "unknown";
      throw new ConflictError({
        code: "PRECONDITION_FAILED",
        message: `${meta.name} ${id} changed on every attempt (${MAX_WRITE_ATTEMPTS}); update was not applied`,
        requestId,
      });
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

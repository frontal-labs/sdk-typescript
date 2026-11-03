import { ValidationError } from "@frontal-labs/core";
import type { OntologySdk } from "./sdk";

/**
 * Ontology shape used when no generated types are supplied. It has no
 * entities, so the typed entity accessors are absent.
 */
export type UntypedOntology = Record<never, never>;

/**
 * Runtime metadata emitted by the Frontal CLI into `.frontal/client.ts`.
 * Types cannot carry entity names or foreign-key names, so they travel as a
 * plain literal next to the generated `Ontology` type.
 */
export interface OntologyRuntime {
  /** Entity names that may be accessed as `ontology.<Entity>`. */
  readonly entities: readonly string[];
  /** Relation accessors per entity, keyed by relation name. */
  readonly relations?: Readonly<
    Record<
      string,
      Readonly<
        Record<string, { readonly target: string; readonly foreignKey: string }>
      >
    >
  >;
}

/** The read shape of entity `K` (`Ontology[K]["read"]`). */
export type EntityRead<O, K extends keyof O> = O[K] extends {
  read: infer R;
}
  ? R
  : never;

/** The create input of entity `K` (`Ontology[K]["create"]`). */
export type EntityCreate<O, K extends keyof O> = O[K] extends {
  create: infer C;
}
  ? C
  : never;

/** The update patch of entity `K` (`Ontology[K]["update"]`). */
export type EntityUpdate<O, K extends keyof O> = O[K] extends {
  update: infer U;
}
  ? U
  : never;

type RelationDefs<O, K extends keyof O> = O[K] extends {
  relations: infer R;
}
  ? R
  : Record<never, never>;

type RelationTarget<D> = D extends { target: infer T } ? T : never;

type RelationOptional<D> = D extends { optional: true } ? true : false;

/**
 * Lazy relation accessors for entity `K`. Each accessor returns a promise of
 * the target entity. Optional relations resolve to `null` when the foreign key
 * is empty.
 */
export type EntityRelations<O, K extends keyof O> = {
  [R in keyof RelationDefs<O, K>]: () => Promise<
    RelationOptional<RelationDefs<O, K>[R]> extends true
      ? EntityWithRelations<
          O,
          RelationTarget<RelationDefs<O, K>[R]> & keyof O
        > | null
      : EntityWithRelations<O, RelationTarget<RelationDefs<O, K>[R]> & keyof O>
  >;
};

/** A fetched entity: its read fields plus lazy relation accessors. */
export type EntityWithRelations<O, K extends keyof O> = EntityRead<O, K> &
  EntityRelations<O, K>;

/** Typed operations for one entity. */
export interface EntityHandle<O, K extends keyof O> {
  /** Fetches an entity by id. */
  get(id: string): Promise<EntityWithRelations<O, K>>;
  /**
   * Creates an entity with an explicit id. The backend has no create without
   * an id, so this uses PUT on `/objects/objects/{id}`.
   */
  create(
    id: string,
    input: EntityCreate<O, K>
  ): Promise<EntityWithRelations<O, K>>;
  /**
   * Merges `patch` into the stored entity. This is a GET, merge and PUT, so it
   * is not atomic: a concurrent write between the GET and PUT can be lost.
   */
  update(
    id: string,
    patch: EntityUpdate<O, K>
  ): Promise<EntityWithRelations<O, K>>;
  /** Deletes an entity by id. */
  delete(id: string): Promise<void>;
}

/**
 * The `ontology` namespace of `Frontal<TOntology>`: the existing
 * {@link OntologySdk} members plus one typed handle per entity.
 */
export type OntologyClient<O> = OntologySdk & {
  [K in keyof O]: EntityHandle<O, K>;
};

type Body = Record<string, unknown>;

function isRecord(value: unknown): value is Body {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidResponse(entity: string, detail: string): ValidationError {
  return new ValidationError({
    code: "INVALID_RESPONSE",
    message: `Frontal returned an invalid ${entity} record: ${detail}`,
    requestId: "local-validation",
  });
}

/**
 * Narrows an untyped API response to an entity record. Only the id is checked:
 * the backend does not describe object shapes, so the field types are a
 * compile-time claim, not a runtime guarantee.
 */
function toRecord(entity: string, value: unknown): Body {
  if (!isRecord(value)) {
    throw invalidResponse(entity, "expected an object");
  }
  if (typeof value.id !== "string") {
    throw invalidResponse(entity, "missing string id");
  }
  return value;
}

/**
 * Builds a runtime {@link OntologySdk} whose unknown properties resolve to
 * entity handles when `runtime.entities` lists them. Existing members are
 * returned unchanged.
 *
 * ASSUMPTION: an object's record is flat, with object-type fields as top-level
 * keys and `id` as the object id.
 * ASSUMPTION: `PUT /objects/objects/{id}` replaces the whole record.
 */
export function withEntityHandles<O>(
  sdk: OntologySdk,
  runtime: OntologyRuntime | undefined
): OntologyClient<O> {
  if (!runtime || runtime.entities.length === 0) {
    return sdk as OntologyClient<O>;
  }
  const known = new Set(runtime.entities);
  const handles = new Map<string, EntityHandleLike>();

  const handleFor = (entity: string): EntityHandleLike => {
    const cached = handles.get(entity);
    if (cached) {
      return cached;
    }
    const handle = createHandle(sdk, runtime, entity);
    handles.set(entity, handle);
    return handle;
  };

  return new Proxy(sdk, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && !(prop in target) && known.has(prop)) {
        return handleFor(prop);
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as unknown as OntologyClient<O>;
}

interface EntityHandleLike {
  get(id: string): Promise<Body>;
  create(id: string, input: unknown): Promise<Body>;
  update(id: string, patch: unknown): Promise<Body>;
  delete(id: string): Promise<void>;
}

function createHandle(
  sdk: OntologySdk,
  runtime: OntologyRuntime,
  entity: string
): EntityHandleLike {
  const objects = sdk.objects;

  const wrap = (record: Body): Body => {
    const relations = runtime.relations?.[entity] ?? {};
    for (const [name, rel] of Object.entries(relations)) {
      // Non-enumerable so console.log and JSON.stringify show only fields.
      Object.defineProperty(record, name, {
        enumerable: false,
        configurable: true,
        writable: false,
        value: () => resolveRelation(record, rel, entity, name),
      });
    }
    return record;
  };

  const resolveRelation = async (
    record: Body,
    rel: { readonly target: string; readonly foreignKey: string },
    owner: string,
    name: string
  ): Promise<Body | null> => {
    const key = record[rel.foreignKey];
    if (key === undefined || key === null) {
      // ASSUMPTION: a relation's foreign key is stored on the source record.
      return null;
    }
    if (typeof key !== "string") {
      throw invalidResponse(
        owner,
        `relation "${name}" foreign key "${rel.foreignKey}" is not a string`
      );
    }
    const raw = await objects.getObject(key);
    const target = toRecord(rel.target, raw);
    const targetRelations = runtime.relations?.[rel.target] ?? {};
    for (const [tName, tRel] of Object.entries(targetRelations)) {
      Object.defineProperty(target, tName, {
        enumerable: false,
        configurable: true,
        writable: false,
        value: () => resolveRelation(target, tRel, rel.target, tName),
      });
    }
    return target;
  };

  return {
    async get(id) {
      return wrap(toRecord(entity, await objects.getObject(id)));
    },
    async create(id, input) {
      if (!isRecord(input)) {
        throw invalidResponse(entity, "create input must be an object");
      }
      return wrap(toRecord(entity, await objects.putObject(id, input)));
    },
    async update(id, patch) {
      if (!isRecord(patch)) {
        throw invalidResponse(entity, "update patch must be an object");
      }
      const current = toRecord(entity, await objects.getObject(id));
      const merged = { ...current, ...patch };
      return wrap(toRecord(entity, await objects.putObject(id, merged)));
    },
    async delete(id) {
      await objects.deleteObject(id);
    },
  };
}

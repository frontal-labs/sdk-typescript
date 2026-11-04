/**
 * Compile-time model of a generated Frontal ontology.
 *
 * A generated `Ontology` interface maps every entity name to four shapes:
 *
 * - `read`: every field of a stored record, including `id: string`.
 * - `create`: writable fields accepted by `create` and `put`.
 * - `update`: writable fields accepted by `update`, all optional.
 * - `relations`: `belongsTo` relations, each with a `target` entity name and
 *   an `optional` flag. The foreign key lives on the source record.
 *
 * @example
 * ```ts
 * export interface Ontology {
 *   Company: {
 *     read: { id: string; name: string };
 *     create: { name: string };
 *     update: { name?: string };
 *     relations: Record<never, never>;
 *   };
 *   Customer: {
 *     read: { id: string; email: string; companyId?: string | null };
 *     create: { email: string };
 *     update: { email?: string; companyId?: string | null };
 *     relations: { company: { target: "Company"; optional: true } };
 *   };
 * }
 * ```
 */

import type { OntologySdk } from "./sdk";

/** The ontology used when no generated types are supplied. It has no entities. */
export type UntypedOntology = Record<never, never>;

/** `E["read"]` for an ontology entry `E`, or `never` when absent. */
export type ReadOf<E> = E extends { read: infer R } ? R : never;

/** `E["create"]` for an ontology entry `E`, or `never` when absent. */
export type CreateOf<E> = E extends { create: infer C } ? C : never;

/** `E["update"]` for an ontology entry `E`, or `never` when absent. */
export type UpdateOf<E> = E extends { update: infer U } ? U : never;

/** `E["relations"]` for an ontology entry `E`; empty when absent. */
export type RelationsOf<E> = E extends { relations: infer R }
  ? R
  : Record<never, never>;

/** The stored fields of entity `K`, as returned by reads. */
export type EntityRead<O, K extends keyof O> = ReadOf<O[K]>;

/** The input accepted by `create` and `put` for entity `K`. */
export type EntityCreate<O, K extends keyof O> = CreateOf<O[K]>;

/** The patch accepted by `update` for entity `K`. */
export type EntityUpdate<O, K extends keyof O> = UpdateOf<O[K]>;

/**
 * One relation accessor, typed by its cardinality:
 * - `belongsTo`: an entity, or `null` when the relation is optional;
 * - `hasOne`: an entity, or `null` when there is none;
 * - `hasMany` and `manyToMany`: every related entity, in backend order.
 */
type RelationAccessor<O, Def> = Def extends {
  target: infer T;
  cardinality: infer C;
  optional: infer Optional;
}
  ? T extends keyof O & string
    ? C extends "hasMany" | "manyToMany"
      ? () => Promise<EntityWithRelations<O, T>[]>
      : C extends "hasOne"
        ? () => Promise<EntityWithRelations<O, T> | null>
        : C extends "belongsTo"
          ? Optional extends true
            ? () => Promise<EntityWithRelations<O, T> | null>
            : () => Promise<EntityWithRelations<O, T>>
          : never
    : never
  : never;

/**
 * Lazy relation accessors for entity `K`, e.g. `await customer.company()`.
 * Each call fetches the target; nothing is cached.
 */
export type EntityRelations<O, K extends keyof O> = {
  readonly [R in keyof RelationsOf<O[K]> & string]: RelationAccessor<
    O,
    RelationsOf<O[K]>[R]
  >;
};

/** A fetched entity: its stored fields plus its lazy relation accessors. */
export type EntityWithRelations<O, K extends keyof O> = EntityRead<O, K> &
  EntityRelations<O, K>;

/** Operators on a `string` field. */
export interface StringFilter {
  readonly eq?: string;
  readonly in?: readonly string[];
  readonly contains?: string;
  readonly startsWith?: string;
}

/** Operators on an enum field: only its declared values. */
export interface EnumFilter<E extends string> {
  readonly eq?: E;
  readonly in?: readonly E[];
}

/** Operators on a `number` field. */
export interface NumberFilter {
  readonly eq?: number;
  readonly in?: readonly number[];
  readonly gt?: number;
  readonly gte?: number;
  readonly lt?: number;
  readonly lte?: number;
}

/** Operators on a `boolean` field. */
export interface BooleanFilter {
  readonly eq?: boolean;
}

/**
 * The operators allowed on a field of type `T`, derived from its TypeScript
 * type. `never` when the field cannot be filtered (arrays, JSON, dates).
 */
export type FilterFor<T> = [NonNullable<T>] extends [never]
  ? never
  : NonNullable<T> extends boolean
    ? BooleanFilter
    : NonNullable<T> extends number
      ? NumberFilter
      : NonNullable<T> extends string
        ? string extends NonNullable<T>
          ? StringFilter
          : EnumFilter<NonNullable<T>>
        : never;

/** The read fields of `R` that accept at least one operator. */
type FilterableFields<R> = {
  [F in keyof R & string]: [FilterFor<R[F]>] extends [never] ? never : F;
}[keyof R & string];

/**
 * The `where` clause of `query` for entity `K`: each filterable read field
 * maps to the operators its type allows. Conditions are combined with AND.
 *
 * @example
 * ```ts
 * { age: { gte: 18 }, status: { in: ["active"] } }
 * ```
 */
export type EntityWhere<O, K extends keyof O> = {
  readonly [F in FilterableFields<ReadOf<O[K]>>]?: FilterFor<ReadOf<O[K]>[F]>;
};

/** Options of `query`. Every field is optional. */
export interface QueryOptions<O, K extends keyof O> {
  /** Conditions to match. Omitted matches every entity of the type. */
  readonly where?: EntityWhere<O, K>;
  /** Page size, from 1 to 500. Defaults to 50. */
  readonly limit?: number;
  /** Cursor from a previous page's `nextCursor`. */
  readonly cursor?: string;
}

/** One page of entities. */
export interface EntityPage<O, K extends keyof O> {
  readonly items: EntityWithRelations<O, K>[];
  /** Cursor for the next page, or `null` on the last page. */
  readonly nextCursor: string | null;
}

/** Typed operations for one entity. Returned as `ontology.<Entity>`. */
export interface EntityHandle<O, K extends keyof O> {
  /**
   * Lists every entity of this type, following the pages of `query` until the
   * last one. Every element is checked; one invalid record fails the call.
   *
   * @example
   * ```ts
   * const customers = await ontology.Customer.list();
   * ```
   */
  list(): Promise<EntityWithRelations<O, K>[]>;

  /**
   * Returns one page of entities that match `where`, in backend order.
   *
   * @example
   * ```ts
   * const page = await ontology.Customer.query({ where: { status: { eq: "active" } }, limit: 100 });
   * ```
   */
  query(options?: QueryOptions<O, K>): Promise<EntityPage<O, K>>;

  /**
   * Fetches an entity by id.
   *
   * @example
   * ```ts
   * const customer = await ontology.Customer.get("cust_1");
   * ```
   */
  get(id: string): Promise<EntityWithRelations<O, K>>;

  /**
   * Creates an entity. The server generates its id.
   *
   * @example
   * ```ts
   * const customer = await ontology.Customer.create({ email: "a@example.com" });
   * ```
   */
  create(input: EntityCreate<O, K>): Promise<EntityWithRelations<O, K>>;

  /**
   * Creates or replaces the entity stored under `id`. The stored record is
   * replaced by `input`, so every writable field must be given.
   *
   * @example
   * ```ts
   * await ontology.Customer.put("cust_1", { email: "a@example.com" });
   * ```
   */
  put(
    id: string,
    input: EntityCreate<O, K>
  ): Promise<EntityWithRelations<O, K>>;

  /**
   * Changes the given writable fields of the entity stored under `id`.
   *
   * This reads the entity with its `ETag`, merges the writable fields, and
   * writes with `If-Match` set to that `ETag`. A write that lost a race is
   * retried from a fresh read, up to three attempts in total; after that it
   * throws a `ConflictError` with code `PRECONDITION_FAILED`. No update is lost
   * silently.
   *
   * @example
   * ```ts
   * await ontology.Customer.update("cust_1", { status: "closed" });
   * ```
   */
  update(
    id: string,
    patch: EntityUpdate<O, K>
  ): Promise<EntityWithRelations<O, K>>;

  /**
   * Deletes the entity stored under `id`.
   *
   * @example
   * ```ts
   * await ontology.Customer.delete("cust_1");
   * ```
   */
  delete(id: string): Promise<void>;
}

/**
 * Problems that make an ontology entry invalid, as a union of readable
 * messages. `never` means the entry is valid.
 */
type EntryIssue<O, K extends keyof O> =
  | (O[K] extends {
      read: object;
      create: object;
      update: object;
      relations: object;
    }
      ? never
      : `entry "${K & string}" must define read, create, update and relations objects`)
  | (ReadOf<O[K]> extends { id: string }
      ? never
      : `entry "${K & string}" read must declare id: string`)
  | (Exclude<keyof CreateOf<O[K]>, keyof UpdateOf<O[K]>> extends never
      ? never
      : `entry "${K & string}" create fields must also be accepted by update`)
  | RelationIssue<O, K>;

type RelationIssue<O, K extends keyof O> = {
  [R in keyof RelationsOf<O[K]> & string]: RelationDefIssue<
    O,
    K,
    R,
    RelationsOf<O[K]>[R]
  >;
}[keyof RelationsOf<O[K]> & string];

type RelationDefIssue<
  O,
  K extends keyof O,
  R extends string,
  Def,
> = Def extends {
  target: infer T;
  cardinality: infer C;
}
  ? T extends keyof O & string
    ? R extends keyof ReadOf<O[K]>
      ? `relation "${K & string}.${R}" has the same name as a read field`
      : C extends "belongsTo" | "hasOne" | "hasMany" | "manyToMany"
        ? never
        : `relation "${K & string}.${R}" has an unknown cardinality`
    : `relation "${K & string}.${R}" targets "${T & string}", which is not an entity in the ontology`
  : `relation "${K & string}.${R}" must declare target and cardinality`;

/** An entry is either itself (when valid) or an object naming the problem. */
type EntryCheck<O, K extends keyof O> = [EntryIssue<O, K>] extends [never]
  ? O[K]
  : { readonly __frontalOntologyError: EntryIssue<O, K> };

/**
 * Constraint for a generated ontology. Use it as the type-parameter bound of
 * any function that accepts an ontology: `<T extends OntologyDefinition<T>>`.
 * An invalid entry (missing shape, a relation that shadows a read field, a
 * relation to an unknown entity) fails to compile and names the problem.
 *
 * @example
 * ```ts
 * function make<T extends OntologyDefinition<T>>(): T { ... }
 * ```
 */
export type OntologyDefinition<O> = {
  readonly [K in keyof O]: EntryCheck<O, K>;
};

/**
 * The typed `ontology` namespace of `Frontal<TOntology>`: the existing
 * `OntologySdk` members plus one {@link EntityHandle} per entity.
 */
export type OntologyClient<O> = OntologySdk & {
  readonly [K in keyof O & string]: EntityHandle<O, K>;
};

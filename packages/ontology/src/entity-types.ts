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
 * One relation accessor. Optional relations resolve to `null` when the
 * foreign key is empty; required relations always resolve to an entity.
 */
type RelationAccessor<O, Def> = Def extends {
  target: infer T;
  optional: infer Optional;
}
  ? T extends keyof O & string
    ? () => Promise<
        Optional extends true
          ? EntityWithRelations<O, T> | null
          : EntityWithRelations<O, T>
      >
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

/** Typed operations for one entity. Returned as `ontology.<Entity>`. */
export interface EntityHandle<O, K extends keyof O> {
  /**
   * Lists every entity of this type.
   *
   * The backend does not page this list, so the whole result is returned in
   * one call. Every element is checked; one invalid record fails the call.
   *
   * @example
   * ```ts
   * const customers = await ontology.Customer.list();
   * ```
   */
  list(): Promise<EntityWithRelations<O, K>[]>;

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
   * This is a GET, a merge of the writable fields, then a PUT. It is **not
   * atomic**: a concurrent write between the GET and the PUT can be lost.
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
  optional: boolean;
}
  ? T extends keyof O & string
    ? R extends keyof ReadOf<O[K]>
      ? `relation "${K & string}.${R}" has the same name as a read field`
      : never
    : `relation "${K & string}.${R}" targets "${T & string}", which is not an entity in the ontology`
  : `relation "${K & string}.${R}" must declare target and optional`;

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

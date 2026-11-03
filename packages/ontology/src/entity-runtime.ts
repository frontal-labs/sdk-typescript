/**
 * Runtime metadata for a generated ontology.
 *
 * Types are erased at runtime, so the Frontal CLI emits this literal next to
 * the generated `Ontology` type, in `.frontal/client.ts`:
 *
 * ```ts
 * createFrontalClient<Ontology>(config, {
 *   entities: ["Company", "Customer"],
 *   fields: {
 *     Company: { id: { kind: "string", required: true }, name: { kind: "string", required: true } },
 *     Customer: {
 *       id: { kind: "string", required: true },
 *       email: { kind: "string", required: true },
 *       status: { kind: { enum: ["active", "closed"] }, required: true },
 *       companyId: { kind: "string", required: false },
 *     },
 *   },
 *   writable: { Company: ["name"], Customer: ["email", "status", "companyId"] },
 *   relations: {
 *     Company: {},
 *     Customer: { company: { target: "Company", foreignKey: "companyId", optional: true } },
 *   },
 * } as const);
 * ```
 *
 * The type parameter ties the literal to the ontology: a missing read field,
 * an unknown writable name or a relation with the wrong target fails to
 * compile. Every read field must be listed in `fields`, including `id`, so
 * that optional values are kind-checked when they are present.
 */
import type {
  OntologyDefinition,
  ReadOf,
  RelationsOf,
  UpdateOf,
} from "./entity-types";

/**
 * The value kinds the SDK can check at runtime. `unknown` is used for fields
 * with no checkable scalar kind, such as arrays, JSON and vectors.
 */
export type FieldKind =
  | "string"
  | "number"
  | "boolean"
  | "unknown"
  | { readonly enum: readonly string[] };

/** Runtime description of one stored field. */
export interface FieldSpec {
  readonly kind: FieldKind;
  /**
   * `true` when the stored record always has a non-null value. `false` when
   * the field may be absent or `null`.
   */
  readonly required: boolean;
}

/** Runtime description of one `belongsTo` relation. */
export interface RelationSpec {
  /** Name of the target entity. */
  readonly target: string;
  /** Field on the source record that holds the target's id. */
  readonly foreignKey: string;
  /** `true` when an empty foreign key resolves to `null`. */
  readonly optional: boolean;
}

/**
 * Runtime metadata for ontology `O`. Every key is checked against the
 * ontology, so the literal cannot drift from the generated types.
 */
export interface OntologyRuntime<O> {
  /** Entity names reachable as `ontology.<Entity>`. */
  readonly entities: readonly (keyof O & string)[];
  /** Every read field of every entity, including `id`. */
  readonly fields: {
    readonly [K in keyof O & string]: {
      readonly [F in keyof ReadOf<O[K]> & string]: FieldSpec;
    };
  };
  /** Field names accepted by `create`, `put` and `update`. */
  readonly writable: {
    readonly [K in keyof O & string]: readonly (keyof UpdateOf<O[K]> &
      string)[];
  };
  /** `belongsTo` relations per entity. */
  readonly relations: {
    readonly [K in keyof O & string]: {
      readonly [R in keyof RelationsOf<O[K]> & string]: {
        readonly target: keyof O & string;
        readonly foreignKey: string;
        readonly optional: boolean;
      };
    };
  };
}

/**
 * Runtime arguments for `createFrontalClient<O>`. The metadata is required
 * whenever the ontology has entities, and optional for the untyped client.
 */
export type OntologyRuntimeArgs<O extends OntologyDefinition<O>> = [
  keyof O,
] extends [never]
  ? [runtime?: OntologyRuntime<O>]
  : [runtime: OntologyRuntime<O>];

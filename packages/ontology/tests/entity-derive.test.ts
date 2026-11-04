import { describe, expect, it } from "vitest";
import { deriveOntologyRuntime } from "../src/entity-derive";

function objectType(
  name: string,
  id: string,
  schema: Record<string, unknown>
): Record<string, unknown> {
  return { name, object_type_id: id, schema };
}

const CUSTOMER = objectType("Customer", "ot_customer", {
  fields: {
    age: { type: "integer" },
    createdAt: { type: "timestamp", required: true, auto: true },
    displayName: { type: "text", computed: true },
    email: { type: "string", required: true },
    externalRef: { type: "uuid", primary: true },
    profile: { type: "json" },
    score: { type: "float", default: 0 },
    status: { type: "enum", enum: ["active", "closed"], required: true },
    tags: { type: "array", items: "string" },
    verified: { type: "boolean", required: true },
  },
  relationships: {
    company: { type: "belongsTo", targetEntity: "Company" },
    primaryAddress: {
      type: "hasOne",
      targetEntity: "Address",
      relationshipTypeId: "rt_primary_address",
    },
  },
});

const COMPANY = objectType("Company", "ot_company", {
  fields: { name: { type: "string", required: true } },
  relationships: {
    customers: {
      type: "hasMany",
      targetEntity: "Customer",
      relationshipTypeId: "rt_customer_company",
    },
  },
});

const ADDRESS = objectType("Address", "ot_address", {
  fields: { line: { type: "string" } },
});

/** Every type the fixtures reference, so relation targets resolve. */
const ONTOLOGY = [CUSTOMER, COMPANY, ADDRESS];

/** The runtime derivation as a thunk, for `expect(...).toThrow(...)`. */
function invalidRuntime(response: unknown): () => unknown {
  return () => deriveOntologyRuntime(response);
}

describe("deriveOntologyRuntime: entities and ids", () => {
  it("sorts entities and maps each name to its object type id", () => {
    const runtime = deriveOntologyRuntime(ONTOLOGY);
    expect(runtime.entities).toEqual(["Address", "Company", "Customer"]);
    expect(runtime.objectTypeIds).toEqual({
      Address: "ot_address",
      Company: "ot_company",
      Customer: "ot_customer",
    });
  });

  it("always lists the object id first and as a required string", () => {
    const runtime = deriveOntologyRuntime(ONTOLOGY);
    expect(runtime.fields.Customer?.id).toEqual({
      kind: "string",
      required: true,
    });
  });

  it("returns an empty runtime for an empty ontology", () => {
    expect(deriveOntologyRuntime([])).toEqual({
      entities: [],
      fields: {},
      objectTypeIds: {},
      relations: {},
      writable: {},
    });
  });
});

describe("deriveOntologyRuntime: field kinds and required", () => {
  it("maps each field type to its runtime kind", () => {
    const fields = deriveOntologyRuntime(ONTOLOGY).fields.Customer;
    expect(fields?.age).toEqual({ kind: "number", required: false });
    expect(fields?.email).toEqual({ kind: "string", required: true });
    expect(fields?.createdAt).toEqual({ kind: "string", required: true });
    expect(fields?.externalRef).toEqual({ kind: "string", required: false });
    expect(fields?.verified).toEqual({ kind: "boolean", required: true });
    expect(fields?.profile).toEqual({ kind: "unknown", required: false });
    expect(fields?.tags).toEqual({ kind: "unknown", required: false });
    expect(fields?.score).toEqual({ kind: "number", required: false });
  });

  it("keeps enum values in declaration order", () => {
    const status = deriveOntologyRuntime(ONTOLOGY).fields.Customer?.status;
    expect(status).toEqual({
      kind: { enum: ["active", "closed"] },
      required: true,
    });
  });

  it("rejects an enum without values", () => {
    expect(
      invalidRuntime([
        objectType("Thing", "ot_thing", { fields: { kind: { type: "enum" } } }),
      ])
    ).toThrow(/enum without values/);
  });

  it("rejects duplicate enum values", () => {
    expect(
      invalidRuntime([
        objectType("Thing", "ot_thing", {
          fields: { kind: { type: "enum", enum: ["a", "a"] } },
        }),
      ])
    ).toThrow(/duplicate enum values/);
  });

  it("rejects an unknown field type", () => {
    expect(
      invalidRuntime([
        objectType("Thing", "ot_thing", { fields: { x: { type: "money" } } }),
      ])
    ).toThrow(/unknown field type "money"/);
  });

  it("ignores a declared field named id", () => {
    const runtime = deriveOntologyRuntime([
      objectType("Thing", "ot_thing", {
        fields: { id: { type: "uuid" }, label: { type: "string" } },
      }),
    ]);
    expect(runtime.fields.Thing).toEqual({
      id: { kind: "string", required: true },
      label: { kind: "string", required: false },
    });
  });

  it("keeps field names exactly as the schema declares them", () => {
    const fields = deriveOntologyRuntime(ONTOLOGY).fields.Customer;
    expect(Object.keys(fields ?? {})).toContain("displayName");
    expect(Object.keys(fields ?? {})).toContain("externalRef");
  });
});

describe("deriveOntologyRuntime: writable fields", () => {
  it("excludes primary, auto and computed fields and the object id", () => {
    const writable = deriveOntologyRuntime(ONTOLOGY).writable.Customer;
    expect(writable).toEqual([
      "age",
      "companyId",
      "email",
      "profile",
      "score",
      "status",
      "tags",
      "verified",
    ]);
  });
});

describe("deriveOntologyRuntime: relations", () => {
  it("defaults the foreign key to <name>Id and adds it as an optional writable field", () => {
    const runtime = deriveOntologyRuntime(ONTOLOGY);
    expect(runtime.relations.Customer).toEqual({
      company: {
        cardinality: "belongsTo",
        foreignKey: "companyId",
        optional: true,
        target: "Company",
      },
      primaryAddress: {
        cardinality: "hasOne",
        relationshipTypeId: "rt_primary_address",
        target: "Address",
      },
    });
    expect(runtime.fields.Customer?.companyId).toEqual({
      kind: "string",
      required: false,
    });
    expect(runtime.writable.Customer).toContain("companyId");
  });

  it("uses a declared foreign key and makes the relation required when it is", () => {
    const runtime = deriveOntologyRuntime([
      objectType("Order", "ot_order", {
        fields: { customerRef: { type: "uuid", required: true } },
        relationships: {
          customer: {
            foreignKey: "customerRef",
            targetEntity: "Customer",
            type: "belongsTo",
          },
        },
      }),
      ...ONTOLOGY,
    ]);
    expect(runtime.relations.Order?.customer).toEqual({
      cardinality: "belongsTo",
      foreignKey: "customerRef",
      optional: false,
      target: "Customer",
    });
  });

  it("derives hasMany and hasOne relations with their relationship type", () => {
    const runtime = deriveOntologyRuntime(ONTOLOGY);
    expect(runtime.relations.Company).toEqual({
      customers: {
        cardinality: "hasMany",
        relationshipTypeId: "rt_customer_company",
        target: "Customer",
      },
    });
  });

  it("rejects a traversal relation with no relationship type", () => {
    expect(() =>
      deriveOntologyRuntime([
        objectType("Thing", "ot_thing", {
          fields: {},
          relationships: {
            ghosts: { type: "manyToMany", targetEntity: "Thing" },
          },
        }),
      ])
    ).toThrow(/needs a relationshipTypeId/);
  });

  it("still checks the target of a skipped relation", () => {
    expect(
      invalidRuntime([
        objectType("Thing", "ot_thing", {
          fields: {},
          relationships: {
            ghosts: {
              type: "hasMany",
              targetEntity: "Ghost",
              relationshipTypeId: "rt_ghosts",
            },
          },
        }),
      ])
    ).toThrow(/targets unknown entity "Ghost"/);
  });

  it("rejects a relation whose name matches a field", () => {
    expect(
      invalidRuntime([
        objectType("Customer", "ot_customer", {
          fields: { company: { type: "string" } },
          relationships: {
            company: { type: "belongsTo", targetEntity: "Customer" },
          },
        }),
      ])
    ).toThrow(/has the same name as a field/);
  });
});

describe("deriveOntologyRuntime: malformed responses", () => {
  it("rejects a response that is not a list", () => {
    expect(invalidRuntime({ object_type_id: "ot_x" })).toThrow(/not a list/);
  });

  it("names the failing record and field", () => {
    expect(invalidRuntime([{ name: "Thing", schema: { fields: {} } }])).toThrow(
      /Object type #1 is malformed/
    );
  });

  it("rejects duplicate entity names", () => {
    expect(
      invalidRuntime([
        objectType("Thing", "ot_a", { fields: {} }),
        objectType("Thing", "ot_b", { fields: {} }),
      ])
    ).toThrow(/defined more than once/);
  });

  it("rejects duplicate object type ids", () => {
    expect(
      invalidRuntime([
        objectType("A", "ot_same", { fields: {} }),
        objectType("B", "ot_same", { fields: {} }),
      ])
    ).toThrow(/used more than once/);
  });
});

describe("deriveOntologyRuntime: prototype names", () => {
  it("rejects a field type that names an Object.prototype member", () => {
    const response = [
      objectType("Note", "ot_note", {
        fields: { body: { type: "constructor", required: true } },
      }),
    ];
    expect(() => deriveOntologyRuntime(response)).toThrow(/unknown field type/);
  });
});

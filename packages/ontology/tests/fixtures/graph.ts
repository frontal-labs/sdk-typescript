import type { OntologyRuntime } from "../../src/entity-runtime";

/**
 * A typed ontology with every relation cardinality, for the relation tests and
 * the relation type tests.
 */
export interface Graph {
  Company: {
    read: { id: string; name: string };
    create: { name: string };
    update: { name?: string };
    relations: {
      customers: {
        cardinality: "hasMany";
        target: "Customer";
        optional: false;
      };
      flagship: { cardinality: "hasOne"; target: "Customer"; optional: true };
    };
  };
  Customer: {
    read: { id: string; email: string; companyId?: string | null };
    create: { email: string; companyId?: string | null };
    update: { email?: string; companyId?: string | null };
    relations: {
      company: { cardinality: "belongsTo"; target: "Company"; optional: true };
      friends: {
        cardinality: "manyToMany";
        target: "Customer";
        optional: false;
      };
    };
  };
}

export const GRAPH_RUNTIME: OntologyRuntime<Graph> = {
  entities: ["Company", "Customer"],
  objectTypeIds: { Company: "ot_company", Customer: "ot_customer" },
  fields: {
    Company: {
      id: { kind: "string", required: true },
      name: { kind: "string", required: true },
    },
    Customer: {
      id: { kind: "string", required: true },
      email: { kind: "string", required: true },
      companyId: { kind: "string", required: false },
    },
  },
  writable: { Company: ["name"], Customer: ["email", "companyId"] },
  relations: {
    Company: {
      customers: {
        cardinality: "hasMany",
        target: "Customer",
        relationshipTypeId: "rt_company_customers",
      },
      flagship: {
        cardinality: "hasOne",
        target: "Customer",
        relationshipTypeId: "rt_flagship",
      },
    },
    Customer: {
      company: {
        cardinality: "belongsTo",
        target: "Company",
        foreignKey: "companyId",
        optional: true,
      },
      friends: {
        cardinality: "manyToMany",
        target: "Customer",
        relationshipTypeId: "rt_friends",
      },
    },
  },
};

// Hand-written sample of what `frontal sync` generates for `.frontal/`.
// Customer <-> Company is cyclic on purpose. `satisfies` checks the runtime
// literal against the ontology type at compile time.
import type { OntologyRuntime } from "../../src/entity-runtime";

export type CustomerStatus = "active" | "closed";

export interface Ontology {
  Company: {
    read: { id: string; name: string; founderId?: string | null };
    create: { name: string; founderId?: string | null };
    update: { name?: string; founderId?: string | null };
    relations: {
      founder: { cardinality: "belongsTo"; target: "Customer"; optional: true };
    };
  };
  Customer: {
    read: {
      id: string;
      email: string;
      status: CustomerStatus;
      companyId?: string | null;
    };
    create: { email: string; status?: CustomerStatus | null };
    update: {
      email?: string;
      status?: CustomerStatus | null;
      companyId?: string | null;
    };
    relations: {
      company: { cardinality: "belongsTo"; target: "Company"; optional: true };
    };
  };
  Order: {
    read: { id: string; total: number; customerId: string };
    create: { total: number; customerId: string };
    update: { total?: number; customerId?: string };
    relations: {
      customer: {
        cardinality: "belongsTo";
        target: "Customer";
        optional: false;
      };
    };
  };
}

export const ontologyRuntime = {
  objectTypeIds: {
    Company: "ot_company",
    Customer: "ot_customer",
    Order: "ot_order",
  },
  entities: ["Company", "Customer", "Order"],
  fields: {
    Company: {
      id: { kind: "string", required: true },
      name: { kind: "string", required: true },
      founderId: { kind: "string", required: false },
    },
    Customer: {
      id: { kind: "string", required: true },
      email: { kind: "string", required: true },
      status: { kind: { enum: ["active", "closed"] }, required: true },
      companyId: { kind: "string", required: false },
    },
    Order: {
      id: { kind: "string", required: true },
      total: { kind: "number", required: true },
      customerId: { kind: "string", required: true },
    },
  },
  writable: {
    Company: ["name", "founderId"],
    Customer: ["email", "status", "companyId"],
    Order: ["total", "customerId"],
  },
  relations: {
    Company: {
      founder: {
        cardinality: "belongsTo",
        target: "Customer",
        foreignKey: "founderId",
        optional: true,
      },
    },
    Customer: {
      company: {
        cardinality: "belongsTo",
        target: "Company",
        foreignKey: "companyId",
        optional: true,
      },
    },
    Order: {
      customer: {
        cardinality: "belongsTo",
        target: "Customer",
        foreignKey: "customerId",
        optional: false,
      },
    },
  },
} as const satisfies OntologyRuntime<Ontology>;

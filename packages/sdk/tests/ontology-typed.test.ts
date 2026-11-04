import type {
  OntologyClient,
  OntologyRuntime,
  OntologySdk,
  UntypedOntology,
} from "@frontal-labs/ontology";
import { createTestClient } from "@frontal-labs/testing";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  createFrontalClient,
  type Frontal,
  type FrontalOntologyRegistry,
} from "../src";

const API_KEY = "frt_test_key_123";

interface SampleOntology {
  Customer: {
    read: { id: string; email: string };
    create: { email: string };
    update: { email?: string };
    relations: Record<never, never>;
  };
}

const sampleRuntime = {
  entities: ["Customer"],
  objectTypeIds: { Customer: "ot_customer" },
  fields: {
    Customer: {
      id: { kind: "string", required: true },
      email: { kind: "string", required: true },
    },
  },
  writable: { Customer: ["email"] },
  relations: { Customer: {} },
} as const satisfies OntologyRuntime<SampleOntology>;

describe("createFrontalClient without an ontology", () => {
  it("keeps the untyped ontology unchanged for existing callers", () => {
    const f = createFrontalClient({ apiKey: API_KEY });
    expect(f.ontology.objects).toBeDefined();
    const plain: OntologySdk = f.ontology;
    expect(plain).toBe(f.ontology);
  });

  it("returns a handle for any name, with no request until it is used", () => {
    const f = createFrontalClient({ apiKey: API_KEY });
    const handle = (f.ontology as unknown as Record<string, { get?: unknown }>)
      .Customer;
    expect(typeof handle?.get).toBe("function");
  });

  it("types the untyped default without entity keys", () => {
    const f = createFrontalClient({ apiKey: API_KEY });
    expectTypeOf(f).toEqualTypeOf<Frontal<FrontalOntologyRegistry>>();
    expectTypeOf(f).toEqualTypeOf<Frontal<UntypedOntology>>();
    // Type-only probe: the access is compile-checked and never executed.
    const probe = () =>
      // @ts-expect-error no entities are declared on the untyped default
      f.ontology.Customer;
    expect(typeof probe).toBe("function");
  });
});

describe("createFrontalClient with a generated ontology", () => {
  it("exposes typed handles when runtime metadata is supplied", () => {
    const f = createFrontalClient<SampleOntology>(
      { apiKey: API_KEY },
      sampleRuntime
    );
    expect(typeof f.ontology.Customer.get).toBe("function");
    expect(typeof f.ontology.Customer.create).toBe("function");
    expect(typeof f.ontology.Customer.put).toBe("function");
    expect(typeof f.ontology.Customer.update).toBe("function");
    expect(typeof f.ontology.Customer.delete).toBe("function");
    expect(f.ontology.objects).toBeDefined();
  });

  it("returns a Frontal typed by the ontology", () => {
    const f = createFrontalClient<SampleOntology>(
      { apiKey: API_KEY },
      sampleRuntime
    );
    expectTypeOf(f).toEqualTypeOf<Frontal<SampleOntology>>();
    expectTypeOf(f.ontology).toEqualTypeOf<OntologyClient<SampleOntology>>();
  });

  it("accepts omitting the runtime metadata and keeps the typed handles", () => {
    const f = createFrontalClient<SampleOntology>({ apiKey: API_KEY });
    expectTypeOf(f).toEqualTypeOf<Frontal<SampleOntology>>();
    expect(typeof f.ontology.Customer.get).toBe("function");
  });

  it("rejects runtime metadata that does not match the ontology", () => {
    createFrontalClient<SampleOntology>(
      { apiKey: API_KEY },
      {
        ...sampleRuntime,
        // @ts-expect-error the Customer read field "email" is missing from fields
        fields: { Customer: { id: sampleRuntime.fields.Customer.id } },
      }
    );
  });

  it("rejects an ontology whose relations are not valid", () => {
    // @ts-expect-error relation "company" targets an entity that does not exist
    void createFrontalClient<{
      Customer: {
        read: { id: string };
        create: Record<never, never>;
        update: Record<never, never>;
        relations: { company: { target: "Ghost"; optional: true } };
      };
    }>(
      { apiKey: API_KEY },
      { entities: [], fields: {}, writable: {}, relations: {} }
    );
  });
});

describe("typed entities through the public client", () => {
  it("lists one object type over the client's own transport", async () => {
    const { client, mock } = createTestClient([
      {
        method: "POST",
        path: "/ontology/objects/objects/query",
        body: {
          results: [
            {
              object_id: "cust_1",
              object_type_id: "ot_customer",
              properties: { email: "a@example.com" },
            },
          ],
          next_cursor: null,
        },
      },
    ]);
    const f = createFrontalClient<SampleOntology>(client, sampleRuntime);
    const customers = await f.ontology.Customer.list();
    expect(customers.map((c) => [c.id, c.email])).toEqual([
      ["cust_1", "a@example.com"],
    ]);
    expect(mock.requests[0]?.body).toEqual({
      objectTypeId: "ot_customer",
      filter: {},
      limit: 500,
    });
  });
});

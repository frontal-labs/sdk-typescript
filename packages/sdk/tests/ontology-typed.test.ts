import type { OntologyClient, OntologySdk } from "@frontal-labs/ontology";
import { describe, expect, expectTypeOf, it } from "vitest";
import { createFrontalClient, type Frontal } from "../src";

const API_KEY = "frt_test_key_123";

interface SampleOntology {
  Customer: {
    read: { id: string; email: string };
    create: { email: string };
    update: { email?: string };
    relations: Record<never, never>;
  };
}

describe("createFrontalClient generics", () => {
  it("keeps the untyped ontology unchanged for existing callers", () => {
    const f = createFrontalClient({ apiKey: API_KEY });
    expect(f.ontology.objects).toBeDefined();
    expect(
      (f.ontology as unknown as Record<string, unknown>).Customer
    ).toBeUndefined();
    // Existing (non-generic) callers still get the plain SDK type.
    const plain: OntologySdk = f.ontology;
    expect(plain).toBe(f.ontology);
  });

  it("exposes entity handles only when runtime metadata is supplied", () => {
    const f = createFrontalClient<SampleOntology>(
      { apiKey: API_KEY },
      { entities: ["Customer"] }
    );
    expect(typeof f.ontology.Customer.get).toBe("function");
    expect(typeof f.ontology.Customer.create).toBe("function");
    expect(typeof f.ontology.Customer.update).toBe("function");
    expect(typeof f.ontology.Customer.delete).toBe("function");
    expect(f.ontology.objects).toBeDefined();
  });

  it("returns a Frontal typed by the ontology", () => {
    const f = createFrontalClient<SampleOntology>({ apiKey: API_KEY });
    expectTypeOf(f).toEqualTypeOf<Frontal<SampleOntology>>();
    expectTypeOf(f.ontology).toEqualTypeOf<OntologyClient<SampleOntology>>();
  });

  it("types the untyped default without entity keys", () => {
    const f = createFrontalClient({ apiKey: API_KEY });
    // @ts-expect-error no entities are declared on the untyped default
    void f.ontology.Customer;
  });
});

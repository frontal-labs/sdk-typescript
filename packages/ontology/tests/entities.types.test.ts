import { describe, expect, expectTypeOf, it } from "vitest";
import type { OntologyClient } from "../src/entities";
import type { OntologySdk } from "../src/sdk";

// Hand-written sample of the shape `.frontal/ontology.d.ts` generates. The
// Customer <-> Company relation is cyclic on purpose.
type CustomerStatus = "active" | "closed";

interface Ontology {
  Company: {
    read: { id: string; name: string; founderId?: string | null };
    create: { name: string; founderId?: string | null };
    update: { name?: string; founderId?: string | null };
    relations: { founder: { target: "Customer"; optional: true } };
  };
  Customer: {
    read: {
      id: string;
      email: string;
      status: CustomerStatus;
      companyId?: string | null;
    };
    create: { email: string; status?: CustomerStatus | null };
    update: { email?: string; status?: CustomerStatus | null };
    relations: { company: { target: "Company"; optional: true } };
  };
  Order: {
    read: { id: string; total: number; customerId: string };
    create: { total: number; customerId: string };
    update: { total?: number };
    relations: { customer: { target: "Customer"; optional: false } };
  };
}

/**
 * Never called. Every statement is type-checked by `tsc -p tsconfig.tests.json`;
 * the `@ts-expect-error` lines assert that the marked statement fails to compile.
 */
async function typeChecks(client: OntologyClient<Ontology>): Promise<void> {
  // ── reads ────────────────────────────────────────────────────────────────
  const customer = await client.Customer.get("123");
  expectTypeOf(customer.id).toEqualTypeOf<string>();
  expectTypeOf(customer.email).toEqualTypeOf<string>();
  expectTypeOf(customer.status).toEqualTypeOf<CustomerStatus>();
  expectTypeOf(customer.companyId).toEqualTypeOf<string | null | undefined>();

  const email: string = customer.email;
  void email;

  // @ts-expect-error age is not a Customer property
  void customer.age;

  // @ts-expect-error email is a string, not a number
  const emailAsNumber: number = customer.email;
  void emailAsNumber;

  // ── relations (lazy) ────────────────────────────────────────────────────
  const company = await customer.company();
  // Optional relation: the target may be null.
  expectTypeOf(company?.name).toEqualTypeOf<string | undefined>();

  // Cyclic: Company -> Customer -> Company resolves without recursion errors.
  const founder = await company?.founder();
  expectTypeOf(founder?.email).toEqualTypeOf<string | undefined>();

  const order = await client.Order.get("o1");
  // Required relation: non-null target.
  const orderCustomer = await order.customer();
  expectTypeOf(orderCustomer.email).toEqualTypeOf<string>();

  // @ts-expect-error company is optional on Customer and not a function on Order
  void order.company;

  // @ts-expect-error relation names are not fields
  const relationAsString: string = customer.company;
  void relationAsString;

  // ── create ──────────────────────────────────────────────────────────────
  await client.Customer.create("c1", { email: "a@example.com" });
  await client.Customer.create("c1", {
    email: "a@example.com",
    status: "closed",
  });

  // @ts-expect-error email is required on create
  await client.Customer.create("c1", {});

  // @ts-expect-error status must be a canonical enum value
  await client.Customer.create("c1", { email: "a", status: "bogus" });

  // @ts-expect-error read-only fields such as id are not writable
  await client.Customer.create("c1", { email: "a", id: "x" });

  // ── update ──────────────────────────────────────────────────────────────
  await client.Customer.update("c1", { email: "b@example.com" });
  await client.Customer.update("c1", { status: null });

  // @ts-expect-error email must be a string
  await client.Customer.update("c1", { email: 5 });

  // ── operations that do not exist in the slice ───────────────────────────
  // @ts-expect-error list needs a backend type filter, which does not exist yet
  void client.Customer.list;

  // @ts-expect-error query needs a documented backend query body
  void client.Customer.query;

  // @ts-expect-error unknown entity
  void client.Unknown;

  // ── delete ──────────────────────────────────────────────────────────────
  await client.Customer.delete("c1");

  // ── existing OntologySdk members keep their types ───────────────────────
  const raw = await client.objects.getObject("x");
  expectTypeOf(raw).toEqualTypeOf<Record<string, unknown>>();
  expectTypeOf(client.objects).toExtend<OntologySdk["objects"]>();
}

describe("entity types", () => {
  it("are checked at compile time (see typeChecks)", () => {
    expect(typeof typeChecks).toBe("function");
  });
});

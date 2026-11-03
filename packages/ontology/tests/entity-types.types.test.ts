import { describe, expect, expectTypeOf, it } from "vitest";
import type { OntologyClient } from "../src/entity-types";
import type { OntologySdk } from "../src/sdk";
import type { CustomerStatus, Ontology } from "./fixtures/ontology";

/**
 * Never called. Every statement is type-checked by `tsc -p tsconfig.tests.json`.
 * Each `@ts-expect-error` asserts that the next statement fails to compile.
 */
async function typeChecks(client: OntologyClient<Ontology>): Promise<void> {
  // ── reads ────────────────────────────────────────────────────────────────
  const customer = await client.Customer.get("cust_1");
  expectTypeOf(customer.id).toEqualTypeOf<string>();
  expectTypeOf(customer.email).toEqualTypeOf<string>();
  expectTypeOf(customer.status).toEqualTypeOf<CustomerStatus>();
  expectTypeOf(customer.companyId).toEqualTypeOf<string | null | undefined>();

  // @ts-expect-error age is not a Customer field
  void customer.age;

  // @ts-expect-error email is a string, not a number
  const emailAsNumber: number = customer.email;
  void emailAsNumber;

  // ── relations (lazy, optional) ──────────────────────────────────────────
  const company = await customer.company();
  expectTypeOf(company?.name).toEqualTypeOf<string | undefined>();
  // @ts-expect-error a relation accessor is a function, not a value
  const relationAsString: string = customer.company;
  void relationAsString;

  // Cyclic: Company -> Customer -> Company resolves without recursion errors.
  const founder = await company?.founder();
  expectTypeOf(founder?.email).toEqualTypeOf<string | undefined>();

  // ── relations (required) ────────────────────────────────────────────────
  const order = await client.Order.get("ord_1");
  const orderCustomer = await order.customer();
  expectTypeOf(orderCustomer.email).toEqualTypeOf<string>();
  // @ts-expect-error company is a Customer relation, not an Order relation
  void order.company;

  // ── create (client-generated id) ────────────────────────────────────────
  const created = await client.Customer.create({ email: "a@example.com" });
  expectTypeOf(created.id).toEqualTypeOf<string>();
  await client.Customer.create({ email: "a@example.com", status: "closed" });

  // @ts-expect-error email is required on create
  await client.Customer.create({});

  // @ts-expect-error status must be a canonical enum value
  await client.Customer.create({ email: "a", status: "bogus" });

  // @ts-expect-error read-only fields such as id are not accepted on create
  await client.Customer.create({ email: "a", id: "x" });

  // @ts-expect-error unknown fields are rejected on create
  await client.Customer.create({ email: "a", nickname: "x" });

  // ── put (explicit id) ───────────────────────────────────────────────────
  await client.Customer.put("cust_2", { email: "b@example.com" });

  // @ts-expect-error put still requires the create fields
  await client.Customer.put("cust_2", { status: "active" });

  // ── update (writable fields, all optional) ──────────────────────────────
  await client.Customer.update("cust_1", { email: "b@example.com" });
  await client.Customer.update("cust_1", { status: null });
  await client.Customer.update("cust_1", { companyId: null });

  // @ts-expect-error email must be a string
  await client.Customer.update("cust_1", { email: 5 });

  // @ts-expect-error id is read-only and cannot be updated
  await client.Customer.update("cust_1", { id: "other" });

  // @ts-expect-error unknown fields are rejected on update
  await client.Customer.update("cust_1", { nickname: "x" });

  // ── operations outside the typed slice ──────────────────────────────────
  // @ts-expect-error list needs a backend type filter, which does not exist yet
  void client.Customer.list;

  // @ts-expect-error query needs a documented backend query body
  void client.Customer.query;

  // @ts-expect-error unknown entity
  void client.Ghost;

  // ── delete ──────────────────────────────────────────────────────────────
  await client.Customer.delete("cust_1");

  // ── existing OntologySdk members keep their types ───────────────────────
  const raw = await client.objects.getObject("x");
  expectTypeOf(raw).toEqualTypeOf<Record<string, unknown>>();
  expectTypeOf(client.objects).toExtend<OntologySdk["objects"]>();
}

describe("entity handle types", () => {
  it("are checked at compile time (see typeChecks)", () => {
    expect(typeof typeChecks).toBe("function");
  });
});

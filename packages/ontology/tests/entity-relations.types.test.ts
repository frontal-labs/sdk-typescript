/**
 * Compile-time checks of relation accessor return types, by cardinality.
 */
import { describe, expect, expectTypeOf, it } from "vitest";
import type { EntityWithRelations, OntologyClient } from "../src/entity-types";
import type { Graph } from "./fixtures/graph";

declare const graph: OntologyClient<Graph>;

async function relationTypes(): Promise<void> {
  const company = await graph.Company.get("co_1");
  const customer = await graph.Customer.get("cust_1");

  // hasMany: every target, as an array.
  expectTypeOf(company.customers).toEqualTypeOf<
    () => Promise<EntityWithRelations<Graph, "Customer">[]>
  >();

  // hasOne: one target, or null.
  expectTypeOf(company.flagship).toEqualTypeOf<
    () => Promise<EntityWithRelations<Graph, "Customer"> | null>
  >();

  // manyToMany: every target, as an array.
  expectTypeOf(customer.friends).toEqualTypeOf<
    () => Promise<EntityWithRelations<Graph, "Customer">[]>
  >();

  // belongsTo, optional: nullable.
  expectTypeOf(customer.company).toEqualTypeOf<
    () => Promise<EntityWithRelations<Graph, "Company"> | null>
  >();

  // @ts-expect-error hasMany does not resolve to a single entity
  const single: EntityWithRelations<Graph, "Customer"> =
    await company.customers();
  void single;
}

describe("relation accessor types", () => {
  it("are checked at compile time (see relationTypes)", () => {
    expect(typeof relationTypes).toBe("function");
  });
});

import { describe, expect, it } from "vitest";
import type { OntologyDefinition } from "../src/entity-types";

/** Compile-time probe: `T` must satisfy the ontology constraint. */
function accepts<T extends OntologyDefinition<T>>(): T | undefined {
  return undefined;
}

/**
 * Never called. Each `@ts-expect-error` marks a hand-written ontology that
 * must fail the constraint. Removing a directive must produce the error named
 * in its comment.
 */
function constraintChecks(): void {
  // A valid ontology is accepted.
  accepts<{
    Company: {
      read: { id: string; name: string };
      create: { name: string };
      update: { name?: string };
      relations: Record<never, never>;
    };
    Customer: {
      read: { id: string; companyId?: string | null };
      create: Record<never, never>;
      update: { companyId?: string | null };
      relations: { company: { target: "Company"; optional: true } };
    };
  }>();

  // @ts-expect-error relation "company" has the same name as a read field
  accepts<{
    Customer: {
      read: { id: string; company: string };
      create: Record<never, never>;
      update: Record<never, never>;
      relations: { company: { target: "Customer"; optional: true } };
    };
  }>();

  // @ts-expect-error relation targets "Ghost", which is not an entity
  accepts<{
    Customer: {
      read: { id: string };
      create: Record<never, never>;
      update: Record<never, never>;
      relations: { company: { target: "Ghost"; optional: true } };
    };
  }>();

  // @ts-expect-error the entry has no update object
  accepts<{
    Customer: {
      read: { id: string };
      create: Record<never, never>;
      relations: Record<never, never>;
    };
  }>();

  // @ts-expect-error the read shape must declare id: string
  accepts<{
    Customer: {
      read: { email: string };
      create: { email: string };
      update: { email?: string };
      relations: Record<never, never>;
    };
  }>();

  // @ts-expect-error a create field must also be accepted by update
  accepts<{
    Customer: {
      read: { id: string; email: string };
      create: { email: string };
      update: Record<never, never>;
      relations: Record<never, never>;
    };
  }>();
}

describe("OntologyDefinition", () => {
  it("is checked at compile time (see constraintChecks)", () => {
    expect(typeof constraintChecks).toBe("function");
  });
});

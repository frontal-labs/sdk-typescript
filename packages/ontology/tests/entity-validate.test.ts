import { ValidationError } from "@frontal-labs/core";
import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { withEntityHandles } from "../src/entity-handle";
import { OntologySdk } from "../src/sdk";
import { type Ontology, ontologyRuntime } from "./fixtures/ontology";

const CUSTOMER_PATH = "/ontology/objects/objects/cust_1";

/** Loose view for deliberately invalid input and responses. */
interface LooseHandle {
  get(id: string): Promise<unknown>;
  create(input: unknown): Promise<unknown>;
  update(id: string, patch: unknown): Promise<unknown>;
}

const CUSTOMER_TYPE = "ot_customer";

/**
 * Wraps a flat test record as the `ObjectResponse` the API returns: `id`
 * becomes `object_id` and the rest become `properties`. Non-objects pass
 * through unchanged.
 */
function envelope(body: unknown): unknown {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return body;
  }
  const { id, ...properties } = body as Record<string, unknown>;
  return { object_id: id, object_type_id: CUSTOMER_TYPE, properties };
}

function setup(body: unknown) {
  const { http, mock } = createTestHttpClient([
    { method: "GET", path: CUSTOMER_PATH, body: envelope(body) },
    { method: "PUT", path: CUSTOMER_PATH, body: envelope(body) },
  ]);
  const ontology = withEntityHandles<Ontology>(
    new OntologySdk(http),
    http,
    ontologyRuntime
  ) as unknown as { Customer: LooseHandle };
  return { customer: ontology.Customer, mock };
}

async function catchError(promise: Promise<unknown>): Promise<ValidationError> {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e
  );
  if (!(err instanceof ValidationError)) {
    throw new Error(`expected a ValidationError, got ${String(err)}`);
  }
  return err;
}

const VALID = { id: "cust_1", email: "a@example.com", status: "active" };

describe("response validation", () => {
  it("accepts a valid record", async () => {
    const { customer } = setup(VALID);
    await expect(customer.get("cust_1")).resolves.toMatchObject(VALID);
  });

  it("reports a missing required field", async () => {
    const { customer } = setup({ id: "cust_1", status: "active" });
    const err = await catchError(customer.get("cust_1"));
    expect(err.code).toBe("INVALID_RESPONSE");
    expect(err.fields).toContainEqual(
      expect.objectContaining({ field: "email", code: "MISSING" })
    );
    expect(err.message).toContain("Customer.email is required");
  });

  it("reports a wrong kind", async () => {
    const { customer } = setup({ ...VALID, email: 42 });
    const err = await catchError(customer.get("cust_1"));
    expect(err.fields).toContainEqual(
      expect.objectContaining({ field: "email", code: "TYPE" })
    );
    expect(err.message).toContain(
      "Customer.email must be a string, got number"
    );
  });

  it("reports a value outside the enum", async () => {
    const { customer } = setup({ ...VALID, status: "archived" });
    const err = await catchError(customer.get("cust_1"));
    expect(err.message).toContain(
      'Customer.status must be one of "active", "closed", got string'
    );
  });

  it("rejects null on a required field", async () => {
    const { customer } = setup({ ...VALID, email: null });
    const err = await catchError(customer.get("cust_1"));
    expect(err.fields).toContainEqual(
      expect.objectContaining({ field: "email", code: "NULL" })
    );
  });

  it("accepts absent and null optional fields", async () => {
    const { customer } = setup({ ...VALID, companyId: null });
    await expect(customer.get("cust_1")).resolves.toBeDefined();
    const absent = setup(VALID).customer;
    await expect(absent.get("cust_1")).resolves.toBeDefined();
  });

  it("rejects a wrong kind on an optional field that is present", async () => {
    const { customer } = setup({ ...VALID, companyId: 7 });
    const err = await catchError(customer.get("cust_1"));
    expect(err.fields).toContainEqual(
      expect.objectContaining({ field: "companyId", code: "TYPE" })
    );
  });

  it("allows extra fields the ontology does not declare", async () => {
    const { customer } = setup({ ...VALID, auditTrail: [1, 2] });
    await expect(customer.get("cust_1")).resolves.toMatchObject(VALID);
  });

  it("reports a missing id", async () => {
    const { customer } = setup({ email: "a@example.com", status: "active" });
    const err = await catchError(customer.get("cust_1"));
    expect(err.fields).toContainEqual(
      expect.objectContaining({ field: "id", code: "MISSING_ID" })
    );
  });

  it("rejects a non-object response", async () => {
    const { customer } = setup(["cust_1"]);
    const err = await catchError(customer.get("cust_1"));
    expect(err.fields[0]?.code).toBe("NOT_AN_OBJECT");
  });

  it("lists every problem in one error", async () => {
    const { customer } = setup({ id: "cust_1", email: 1, status: "bogus" });
    const err = await catchError(customer.get("cust_1"));
    expect(err.fields.map((f) => f.field).sort()).toEqual(["email", "status"]);
  });
});

describe("input validation", () => {
  it("rejects an unknown key before any request", async () => {
    const { customer, mock } = setup(VALID);
    const err = await catchError(
      customer.create({ email: "a@example.com", nope: 1 })
    );
    expect(err.code).toBe("INVALID_INPUT");
    expect(err.fields).toContainEqual(
      expect.objectContaining({ field: "nope", code: "UNKNOWN_FIELD" })
    );
    expect(mock.requests).toHaveLength(0);
  });

  it("rejects a read-only field on create", async () => {
    const { customer } = setup(VALID);
    const err = await catchError(
      customer.create({ email: "a@example.com", id: "x" })
    );
    expect(err.fields).toContainEqual(
      expect.objectContaining({ field: "id", code: "NOT_WRITABLE" })
    );
  });

  it("rejects a wrong kind on create", async () => {
    const { customer } = setup(VALID);
    const err = await catchError(customer.create({ email: 5 }));
    expect(err.fields).toContainEqual(
      expect.objectContaining({ field: "email", code: "TYPE" })
    );
  });

  it("rejects null on a required writable field", async () => {
    const { customer } = setup(VALID);
    const err = await catchError(customer.create({ email: null }));
    expect(err.fields).toContainEqual(
      expect.objectContaining({ field: "email", code: "NULL" })
    );
  });

  it("rejects a non-object create input", async () => {
    const { customer } = setup(VALID);
    const err = await catchError(customer.create("bad"));
    expect(err.fields[0]?.code).toBe("NOT_AN_OBJECT");
  });

  it("rejects a read-only field in an update patch before any request", async () => {
    const { customer, mock } = setup(VALID);
    const err = await catchError(customer.update("cust_1", { id: "other" }));
    expect(err.fields).toContainEqual(
      expect.objectContaining({ field: "id", code: "NOT_WRITABLE" })
    );
    expect(mock.requests).toHaveLength(0);
  });

  it("rejects a wrong kind in an update patch", async () => {
    const { customer, mock } = setup(VALID);
    const err = await catchError(
      customer.update("cust_1", { status: "bogus" })
    );
    expect(err.message).toContain("Customer.status must be one of");
    expect(mock.requests).toHaveLength(0);
  });
});

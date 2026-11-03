import { ValidationError } from "@frontal-labs/core";
import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { withEntityHandles } from "../src/entity-handle";
import type { OntologyRuntime } from "../src/entity-runtime";
import type { OntologyClient } from "../src/entity-types";
import { OntologySdk } from "../src/sdk";
import { type Ontology, ontologyRuntime } from "./fixtures/ontology";

const CUSTOMER_PATH = "/ontology/objects/objects/cust_1";
const ORDER_PATH = "/ontology/objects/objects/ord_1";
const UUID_PATH = /\/ontology\/objects\/objects\/[0-9a-f-]{36}$/;

function setup(routes: Parameters<typeof createTestHttpClient>[0] = []) {
  const { http, mock } = createTestHttpClient(routes);
  const sdk = new OntologySdk(http);
  const ontology: OntologyClient<Ontology> = withEntityHandles<Ontology>(
    sdk,
    ontologyRuntime
  );
  return { ontology, mock, sdk };
}

describe("reads", () => {
  it("get returns the stored record", async () => {
    const { ontology, mock } = setup([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: { id: "cust_1", email: "a@example.com", status: "active" },
      },
    ]);
    const customer = await ontology.Customer.get("cust_1");
    expect(customer.id).toBe("cust_1");
    expect(customer.email).toBe("a@example.com");
    expect(customer.status).toBe("active");
    mock.expectCalled("GET", CUSTOMER_PATH);
  });

  it("fetches a relation target only when the accessor is called", async () => {
    const { ontology, mock } = setup([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: {
          id: "cust_1",
          email: "a@example.com",
          status: "active",
          companyId: "co_1",
        },
      },
      {
        method: "GET",
        path: "/ontology/objects/objects/co_1",
        body: { id: "co_1", name: "Acme" },
      },
    ]);
    const customer = await ontology.Customer.get("cust_1");
    expect(mock.requests.map((r) => r.path)).toEqual([`/v1${CUSTOMER_PATH}`]);
    const company = await customer.company();
    expect(company?.name).toBe("Acme");
    expect(mock.requests.map((r) => r.path)).toEqual([
      `/v1${CUSTOMER_PATH}`,
      "/v1/ontology/objects/objects/co_1",
    ]);
  });

  it("resolves an optional relation to null when the foreign key is empty", async () => {
    const { ontology } = setup([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: {
          id: "cust_1",
          email: "a@example.com",
          status: "active",
          companyId: null,
        },
      },
    ]);
    const customer = await ontology.Customer.get("cust_1");
    expect(await customer.company()).toBeNull();
  });

  it("rejects a record whose required field is null on read", async () => {
    const { ontology } = setup([
      {
        method: "GET",
        path: ORDER_PATH,
        body: { id: "ord_1", total: 10, customerId: null },
      },
    ]);
    const err = await ontology.Order.get("ord_1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields).toContainEqual(
      expect.objectContaining({ field: "customerId", code: "NULL" })
    );
  });

  it("rejects a required relation whose foreign key is empty", async () => {
    // Only reachable when the foreign key is declared optional while the
    // relation is required: the generator never emits that combination.
    const runtime = {
      ...ontologyRuntime,
      fields: {
        ...ontologyRuntime.fields,
        Order: {
          ...ontologyRuntime.fields.Order,
          customerId: { kind: "string", required: false },
        },
      },
    } as unknown as OntologyRuntime<Ontology>;
    const { http } = createTestHttpClient([
      {
        method: "GET",
        path: ORDER_PATH,
        body: { id: "ord_1", total: 10, customerId: null },
      },
    ]);
    const ontology = withEntityHandles<Ontology>(
      new OntologySdk(http),
      runtime
    );
    const order = await ontology.Order.get("ord_1");
    const err = await order.customer().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).code).toBe("INVALID_RESPONSE");
    expect((err as ValidationError).fields[0]?.field).toBe("customerId");
  });

  it("keeps relation accessors out of enumeration and JSON", async () => {
    const { ontology } = setup([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: {
          id: "cust_1",
          email: "a@example.com",
          status: "active",
          companyId: null,
        },
      },
    ]);
    const customer = await ontology.Customer.get("cust_1");
    expect(Object.keys(customer)).toEqual([
      "id",
      "email",
      "status",
      "companyId",
    ]);
    expect(JSON.parse(JSON.stringify(customer))).toEqual({
      id: "cust_1",
      email: "a@example.com",
      status: "active",
      companyId: null,
    });
  });

  it("supports cyclic relations without recursion at construction", async () => {
    const { ontology, mock } = setup([
      {
        method: "GET",
        path: "/ontology/objects/objects/co_1",
        body: { id: "co_1", name: "Acme", founderId: "cust_1" },
      },
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: {
          id: "cust_1",
          email: "a@example.com",
          status: "active",
          companyId: "co_1",
        },
      },
    ]);
    const company = await ontology.Company.get("co_1");
    const founder = await company.founder();
    expect(founder?.email).toBe("a@example.com");
    const back = await founder?.company();
    expect(back?.name).toBe("Acme");
    expect(mock.requests).toHaveLength(3);
  });
});

describe("writes", () => {
  it("create generates a client id and PUTs the input without an id", async () => {
    const { ontology, mock } = setup([
      {
        method: "PUT",
        path: UUID_PATH,
        body: { id: "generated", email: "b@example.com", status: "closed" },
      },
    ]);
    const created = await ontology.Customer.create({
      email: "b@example.com",
      status: "closed",
    });
    expect(created.email).toBe("b@example.com");
    const [request] = mock.requests;
    expect(request?.method).toBe("PUT");
    expect(request?.body).toEqual({ email: "b@example.com", status: "closed" });
    const id = request?.path.split("/").pop() ?? "";
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("put writes under an explicit id", async () => {
    const { ontology, mock } = setup([
      {
        method: "PUT",
        path: "/ontology/objects/objects/cust_2",
        body: { id: "cust_2", email: "c@example.com", status: "active" },
      },
    ]);
    await ontology.Customer.put("cust_2", {
      email: "c@example.com",
      status: "active",
    });
    mock.expectCalledWith("PUT", "/ontology/objects/objects/cust_2", {
      email: "c@example.com",
      status: "active",
    });
  });

  it("update sends only writable fields, merged with the patch", async () => {
    const { ontology, mock } = setup([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: {
          id: "cust_1",
          email: "a@example.com",
          status: "active",
          companyId: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
      },
      {
        method: "PUT",
        path: CUSTOMER_PATH,
        body: {
          id: "cust_1",
          email: "a@example.com",
          status: "closed",
          companyId: null,
        },
      },
    ]);
    await ontology.Customer.update("cust_1", { status: "closed" });
    const put = mock.requests.find((r) => r.method === "PUT");
    expect(put?.body).toEqual({
      email: "a@example.com",
      status: "closed",
      companyId: null,
    });
  });

  it("delete calls the object delete endpoint", async () => {
    const { ontology, mock } = setup([
      { method: "DELETE", path: CUSTOMER_PATH, status: 204 },
    ]);
    await ontology.Customer.delete("cust_1");
    mock.expectCalled("DELETE", CUSTOMER_PATH);
  });

  it("rejects an empty id before any request", async () => {
    const { ontology, mock } = setup();
    await expect(ontology.Customer.get("")).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(mock.requests).toHaveLength(0);
  });
});

describe("unknown names", () => {
  it("throws a TypeError listing the known entities", () => {
    const { ontology } = setup();
    expect(
      () => (ontology as unknown as Record<string, unknown>).Ghost
    ).toThrow(
      'Unknown ontology entity "Ghost". Known entities: Company, Customer, Order.'
    );
  });

  it("returns undefined for probe names so await and serialisation work", () => {
    const { ontology } = setup();
    const loose = ontology as unknown as Record<string, unknown>;
    expect(loose.then).toBeUndefined();
    expect(loose.toJSON).toBeUndefined();
    expect(loose.asymmetricMatch).toBeUndefined();
  });

  it("answers `in` for entities and SDK members", () => {
    const { ontology } = setup();
    expect("Customer" in ontology).toBe(true);
    expect("Ghost" in ontology).toBe(false);
    expect(ontology.objects).toBeDefined();
  });

  it("resolves symbol keys without throwing", () => {
    const { ontology } = setup();
    expect(
      (ontology as unknown as Record<symbol, unknown>)[Symbol.toStringTag]
    ).toBeUndefined();
  });

  it("reports no entities when the runtime metadata is absent", () => {
    const sdk = new OntologySdk(createTestHttpClient().http);
    const untyped = withEntityHandles(sdk, undefined) as unknown as Record<
      string,
      unknown
    >;
    expect(() => untyped.Customer).toThrow("Known entities: (none).");
  });
});

describe("runtime metadata integrity", () => {
  const sdk = () => new OntologySdk(createTestHttpClient().http);

  it("rejects an entity that collides with an SDK member", () => {
    const runtime = {
      ...ontologyRuntime,
      entities: ["objects"],
      fields: { objects: { id: { kind: "string", required: true } } },
      writable: { objects: [] },
      relations: { objects: {} },
    } as unknown as OntologyRuntime<Ontology>;
    expect(() => withEntityHandles(sdk(), runtime)).toThrow(
      'Ontology entity "objects" collides with an SDK member'
    );
  });

  it("rejects a relation whose target is not an entity", () => {
    const runtime = {
      ...ontologyRuntime,
      relations: {
        ...ontologyRuntime.relations,
        Order: {
          customer: {
            target: "Ghost",
            foreignKey: "customerId",
            optional: false,
          },
        },
      },
    } as unknown as OntologyRuntime<Ontology>;
    expect(() => withEntityHandles(sdk(), runtime)).toThrow('targets "Ghost"');
  });

  it("rejects a writable field that is not a field", () => {
    const runtime = {
      ...ontologyRuntime,
      writable: { ...ontologyRuntime.writable, Order: ["total", "missing"] },
    } as unknown as OntologyRuntime<Ontology>;
    expect(() => withEntityHandles(sdk(), runtime)).toThrow(
      'writable field "missing"'
    );
  });
});

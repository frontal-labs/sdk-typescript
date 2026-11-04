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
const COMPANY_PATH = "/ontology/objects/objects/co_1";
const OBJECTS_PATH = "/ontology/objects/objects";
const UUID_PATH = /\/ontology\/objects\/objects\/[0-9a-f-]{36}$/;

const CUSTOMER_TYPE = "ot_customer";
const COMPANY_TYPE = "ot_company";
const ORDER_TYPE = "ot_order";

/** An `ObjectResponse` as the API sends it (snake_case envelope). */
function stored(
  objectTypeId: string,
  objectId: string,
  properties: Record<string, unknown>
) {
  return {
    object_id: objectId,
    object_type_id: objectTypeId,
    properties,
  };
}

function setup(routes: Parameters<typeof createTestHttpClient>[0] = []) {
  const { http, mock } = createTestHttpClient(routes);
  const sdk = new OntologySdk(http);
  const ontology: OntologyClient<Ontology> = withEntityHandles<Ontology>(
    sdk,
    http,
    ontologyRuntime
  );
  return { ontology, mock, sdk };
}

describe("reads", () => {
  it("get returns the stored record with id = object_id and flattened properties", async () => {
    const { ontology, mock } = setup([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "active",
        }),
      },
    ]);
    const customer = await ontology.Customer.get("cust_1");
    expect(customer.id).toBe("cust_1");
    expect(customer.email).toBe("a@example.com");
    expect(customer.status).toBe("active");
    mock.expectCalled("GET", CUSTOMER_PATH);
  });

  it("list asks for one object type and returns every record as an entity", async () => {
    const { ontology, mock } = setup([
      {
        method: "GET",
        path: OBJECTS_PATH,
        body: [
          stored(CUSTOMER_TYPE, "cust_1", {
            email: "a@example.com",
            status: "active",
          }),
          stored(CUSTOMER_TYPE, "cust_2", {
            email: "b@example.com",
            status: "closed",
          }),
        ],
      },
    ]);
    const customers = await ontology.Customer.list();
    expect(customers.map((c) => c.id)).toEqual(["cust_1", "cust_2"]);
    expect(customers[1]?.status).toBe("closed");
    const [request] = mock.requests;
    expect(request?.method).toBe("GET");
    expect(request?.url).toContain(`object_type_id=${CUSTOMER_TYPE}`);
  });

  it("list keeps relation accessors on every element", async () => {
    const { ontology } = setup([
      {
        method: "GET",
        path: OBJECTS_PATH,
        body: [
          stored(CUSTOMER_TYPE, "cust_1", {
            email: "a@example.com",
            status: "active",
            companyId: "co_1",
          }),
        ],
      },
      {
        method: "GET",
        path: COMPANY_PATH,
        body: stored(COMPANY_TYPE, "co_1", { name: "Acme" }),
      },
    ]);
    const [customer] = await ontology.Customer.list();
    const company = await customer?.company();
    expect(company?.name).toBe("Acme");
  });

  it("list fails when one element belongs to another object type", async () => {
    const { ontology } = setup([
      {
        method: "GET",
        path: OBJECTS_PATH,
        body: [
          stored(CUSTOMER_TYPE, "cust_1", {
            email: "a@example.com",
            status: "active",
          }),
          stored(COMPANY_TYPE, "co_1", { name: "Acme" }),
        ],
      },
    ]);
    const err = await ontology.Customer.list().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields).toContainEqual(
      expect.objectContaining({ field: "objectTypeId", code: "WRONG_TYPE" })
    );
  });

  it("list rejects a response that is not an array", async () => {
    const { ontology } = setup([
      {
        method: "GET",
        path: OBJECTS_PATH,
        body: { results: [] },
      },
    ]);
    const err = await ontology.Customer.list().catch((e: unknown) => e);
    expect((err as ValidationError).fields[0]?.code).toBe("NOT_A_LIST");
  });

  it("fetches a relation target only when the accessor is called", async () => {
    const { ontology, mock } = setup([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "active",
          companyId: "co_1",
        }),
      },
      {
        method: "GET",
        path: COMPANY_PATH,
        body: stored(COMPANY_TYPE, "co_1", { name: "Acme" }),
      },
    ]);
    const customer = await ontology.Customer.get("cust_1");
    expect(mock.requests.map((r) => r.path)).toEqual([`/v1${CUSTOMER_PATH}`]);
    const company = await customer.company();
    expect(company?.name).toBe("Acme");
    expect(mock.requests.map((r) => r.path)).toEqual([
      `/v1${CUSTOMER_PATH}`,
      `/v1${COMPANY_PATH}`,
    ]);
  });

  it("resolves an optional relation to null when the foreign key is empty", async () => {
    const { ontology } = setup([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "active",
          companyId: null,
        }),
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
        body: stored(ORDER_TYPE, "ord_1", { total: 10, customerId: null }),
      },
    ]);
    const err = await ontology.Order.get("ord_1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields).toContainEqual(
      expect.objectContaining({ field: "customerId", code: "NULL" })
    );
  });

  it("rejects a record that belongs to another object type", async () => {
    const { ontology } = setup([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: stored(COMPANY_TYPE, "cust_1", { name: "Acme" }),
      },
    ]);
    const err = await ontology.Customer.get("cust_1").catch((e: unknown) => e);
    expect((err as ValidationError).fields).toContainEqual(
      expect.objectContaining({ field: "objectTypeId", code: "WRONG_TYPE" })
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
        body: stored(ORDER_TYPE, "ord_1", { total: 10, customerId: null }),
      },
    ]);
    const ontology = withEntityHandles<Ontology>(
      new OntologySdk(http),
      http,
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
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "active",
          companyId: null,
        }),
      },
    ]);
    const customer = await ontology.Customer.get("cust_1");
    expect(Object.keys(customer)).toEqual([
      "email",
      "status",
      "companyId",
      "id",
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
        path: COMPANY_PATH,
        body: stored(COMPANY_TYPE, "co_1", {
          name: "Acme",
          founderId: "cust_1",
        }),
      },
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "active",
          companyId: "co_1",
        }),
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
  it("create POSTs the object type and properties, with no object id", async () => {
    const { ontology, mock } = setup([
      {
        method: "POST",
        path: OBJECTS_PATH,
        status: 201,
        body: stored(CUSTOMER_TYPE, "srv_generated", {
          email: "b@example.com",
          status: "closed",
        }),
      },
    ]);
    const created = await ontology.Customer.create({
      email: "b@example.com",
      status: "closed",
    });
    expect(created.id).toBe("srv_generated");
    expect(created.email).toBe("b@example.com");
    // The mock records bodies camelCased; the wire carries snake_case.
    mock.expectCalledWith("POST", OBJECTS_PATH, {
      objectTypeId: CUSTOMER_TYPE,
      properties: { email: "b@example.com", status: "closed" },
    });
    const [request] = mock.requests;
    expect(request?.body).not.toHaveProperty("objectId");
  });

  it("put PUTs the full object under the given id", async () => {
    const { ontology, mock } = setup([
      {
        method: "PUT",
        path: "/ontology/objects/objects/cust_2",
        body: stored(CUSTOMER_TYPE, "cust_2", {
          email: "c@example.com",
          status: "active",
        }),
      },
    ]);
    const put = await ontology.Customer.put("cust_2", {
      email: "c@example.com",
      status: "active",
    });
    expect(put.id).toBe("cust_2");
    mock.expectCalledWith("PUT", "/ontology/objects/objects/cust_2", {
      objectTypeId: CUSTOMER_TYPE,
      objectId: "cust_2",
      properties: { email: "c@example.com", status: "active" },
    });
  });

  it("put encodes the id in the path", async () => {
    const { ontology, mock } = setup([
      {
        method: "PUT",
        path: "/ontology/objects/objects/a%2Fb",
        body: stored(CUSTOMER_TYPE, "a/b", {
          email: "c@example.com",
          status: "active",
        }),
      },
    ]);
    await ontology.Customer.put("a/b", {
      email: "c@example.com",
      status: "active",
    });
    expect(mock.requests[0]?.url).toContain("/objects/a%2Fb");
  });

  it("update sends only writable fields, merged with the patch", async () => {
    const { ontology, mock } = setup([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "active",
          companyId: null,
          createdAt: "2026-01-01T00:00:00Z",
        }),
      },
      {
        method: "PUT",
        path: CUSTOMER_PATH,
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "closed",
          companyId: null,
        }),
      },
    ]);
    await ontology.Customer.update("cust_1", { status: "closed" });
    const put = mock.requests.find((r) => r.method === "PUT");
    expect(put?.body).toEqual({
      objectTypeId: CUSTOMER_TYPE,
      objectId: "cust_1",
      properties: {
        email: "a@example.com",
        status: "closed",
        companyId: null,
      },
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

  it("rejects a name the live ontology does not contain", async () => {
    const { http } = createTestHttpClient([
      { method: "GET", path: "/ontology/objects/object-types", body: [] },
    ]);
    const untyped = withEntityHandles(
      new OntologySdk(http),
      http,
      undefined
    ) as unknown as Record<string, { get(id: string): Promise<unknown> }>;
    await expect(untyped.Customer?.get("1")).rejects.toThrow(
      'Entity "Customer" is not in the live ontology'
    );
  });
});

describe("runtime metadata integrity", () => {
  const client = () => createTestHttpClient().http;

  it("rejects an entity that collides with an SDK member", () => {
    const http = client();
    const runtime = {
      ...ontologyRuntime,
      entities: ["objects"],
      objectTypeIds: { objects: "ot_objects" },
      fields: { objects: { id: { kind: "string", required: true } } },
      writable: { objects: [] },
      relations: { objects: {} },
    } as unknown as OntologyRuntime<Ontology>;
    expect(() =>
      withEntityHandles(new OntologySdk(http), http, runtime)
    ).toThrow('Ontology entity "objects" collides with an SDK member');
  });

  it("rejects an entity with no object type id", () => {
    const http = client();
    const runtime = {
      ...ontologyRuntime,
      objectTypeIds: { Company: "ot_company", Order: "ot_order" },
    } as unknown as OntologyRuntime<Ontology>;
    expect(() =>
      withEntityHandles(new OntologySdk(http), http, runtime)
    ).toThrow('Ontology entity "Customer" has no objectTypeIds entry');
  });

  it("rejects a relation whose target is not an entity", () => {
    const http = client();
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
    expect(() =>
      withEntityHandles(new OntologySdk(http), http, runtime)
    ).toThrow('targets "Ghost"');
  });

  it("rejects a writable field that is not a field", () => {
    const http = client();
    const runtime = {
      ...ontologyRuntime,
      writable: { ...ontologyRuntime.writable, Order: ["total", "missing"] },
    } as unknown as OntologyRuntime<Ontology>;
    expect(() =>
      withEntityHandles(new OntologySdk(http), http, runtime)
    ).toThrow('writable field "missing"');
  });

  it("create never puts an id in the path", async () => {
    const { ontology, mock } = setup([
      {
        method: "POST",
        path: OBJECTS_PATH,
        status: 201,
        body: stored(CUSTOMER_TYPE, "srv", {
          email: "a@example.com",
          status: "active",
        }),
      },
    ]);
    await ontology.Customer.create({
      email: "a@example.com",
      status: "active",
    });
    expect(mock.requests[0]?.path).not.toMatch(UUID_PATH);
  });
});

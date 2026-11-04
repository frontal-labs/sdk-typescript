import { ConflictError, type ValidationError } from "@frontal-labs/core";
import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { withEntityHandles } from "../src/entity-handle";
import type { OntologyRuntime } from "../src/entity-runtime";
import type { OntologyClient } from "../src/entity-types";
import { OntologySdk } from "../src/sdk";
import { GRAPH_RUNTIME } from "./fixtures/graph";
import { type Ontology, ontologyRuntime } from "./fixtures/ontology";

const CUSTOMER_PATH = "/ontology/objects/objects/cust_1";
const QUERY_PATH = "/ontology/objects/objects/query";
const RELATIONSHIPS_PATH = "/ontology/relationships/relationships";
const CUSTOMER_TYPE = "ot_customer";

function stored(
  objectTypeId: string,
  objectId: string,
  properties: Record<string, unknown>
) {
  return { object_id: objectId, object_type_id: objectTypeId, properties };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function setup<O>(
  runtime: OntologyRuntime<O>,
  routes: Parameters<typeof createTestHttpClient>[0] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  const sdk = new OntologySdk(http);
  const ontology: OntologyClient<O> = withEntityHandles<O>(sdk, http, runtime);
  return { ontology, mock };
}

function setupFixture(routes: Parameters<typeof createTestHttpClient>[0] = []) {
  return setup<Ontology>(ontologyRuntime, routes);
}

/** Serves the relationship list for one relationship type; other types answer `[]`. */
function linksFor(byType: Record<string, string[]>) {
  return {
    method: "GET",
    path: RELATIONSHIPS_PATH,
    handler: (request: { url: string }) => {
      const type =
        new URL(request.url).searchParams.get("relationship_type_id") ?? "";
      const targets = byType[type] ?? [];
      return jsonResponse(targets.map((id) => ({ target_object_id: id })));
    },
  };
}

describe("conditional update", () => {
  it("retries from a fresh read after a 412 and writes with the new ETag", async () => {
    const { ontology, mock } = setupFixture([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        times: 1,
        headers: { ETag: '"1"' },
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "active",
        }),
      },
      {
        method: "PUT",
        path: CUSTOMER_PATH,
        times: 1,
        status: 412,
        body: {
          code: "PRECONDITION_FAILED",
          detail: "changed",
          current_revision: 2,
        },
      },
      {
        method: "GET",
        path: CUSTOMER_PATH,
        times: 1,
        headers: { ETag: '"2"' },
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "active",
        }),
      },
      {
        method: "PUT",
        path: CUSTOMER_PATH,
        times: 1,
        headers: { ETag: '"3"' },
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "closed",
        }),
      },
    ]);
    const updated = await ontology.Customer.update("cust_1", {
      status: "closed",
    });
    expect(updated.status).toBe("closed");
    const puts = mock.requests.filter((r) => r.method === "PUT");
    expect(puts.map((r) => r.headers["if-match"])).toEqual(['"1"', '"2"']);
  });

  it("gives up after three attempts with a ConflictError", async () => {
    const { ontology, mock } = setupFixture([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        headers: { ETag: '"1"' },
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "active",
        }),
      },
      {
        method: "PUT",
        path: CUSTOMER_PATH,
        status: 412,
        body: {
          code: "PRECONDITION_FAILED",
          detail: "changed",
          current_revision: 9,
        },
      },
    ]);
    const err = await ontology.Customer.update("cust_1", {
      status: "closed",
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect((err as ConflictError).code).toBe("PRECONDITION_FAILED");
    expect(mock.requests.filter((r) => r.method === "PUT")).toHaveLength(3);
  });

  it("refuses to write when the read has no ETag", async () => {
    const { ontology, mock } = setupFixture([
      {
        method: "GET",
        path: CUSTOMER_PATH,
        body: stored(CUSTOMER_TYPE, "cust_1", {
          email: "a@example.com",
          status: "active",
        }),
      },
    ]);
    const err = await ontology.Customer.update("cust_1", {
      status: "closed",
    }).catch((e: unknown) => e);
    expect((err as ValidationError).code).toBe("INVALID_RESPONSE");
    expect(mock.requests.some((r) => r.method === "PUT")).toBe(false);
  });
});

describe("query", () => {
  it("sends the filter, limit and cursor, and returns the next cursor", async () => {
    const { ontology, mock } = setupFixture([
      {
        method: "POST",
        path: QUERY_PATH,
        body: {
          results: [
            stored(CUSTOMER_TYPE, "cust_1", {
              email: "a@example.com",
              status: "active",
            }),
          ],
          next_cursor: "c2",
        },
      },
    ]);
    const page = await ontology.Customer.query({
      where: { status: { eq: "active" }, email: { startsWith: "a" } },
      limit: 10,
      cursor: "c1",
    });
    expect(page.items.map((c) => c.id)).toEqual(["cust_1"]);
    expect(page.nextCursor).toBe("c2");
    expect(mock.requests[0]?.body).toEqual({
      objectTypeId: CUSTOMER_TYPE,
      filter: { status: { eq: "active" }, email: { startsWith: "a" } },
      limit: 10,
      cursor: "c1",
    });
  });

  it("rejects an operator the field's kind does not allow, before any request", async () => {
    const { ontology, mock } = setupFixture();
    const err = await ontology.Customer.query({
      where: {
        // @ts-expect-error email is a string field: "gt" is not an operator on it
        email: { gt: "a" },
      },
    }).catch((e: unknown) => e);
    expect((err as ValidationError).code).toBe("INVALID_INPUT");
    expect((err as ValidationError).fields[0]?.code).toBe("INVALID_OPERATOR");
    expect(mock.requests).toHaveLength(0);
  });

  it("rejects an enum value outside the declared values at runtime", async () => {
    const { ontology, mock } = setupFixture();
    const err = await ontology.Customer.query({
      where: {
        // @ts-expect-error status values are active and closed
        status: { eq: "archived" },
      },
    }).catch((e: unknown) => e);
    expect((err as ValidationError).fields[0]?.code).toBe("INVALID_OPERATOR");
    expect(mock.requests).toHaveLength(0);
  });

  it("rejects an unknown field before any request", async () => {
    const { ontology, mock } = setupFixture();
    const err = await ontology.Customer.query({
      where: {
        // @ts-expect-error nickname is not a field of Customer
        nickname: { eq: "x" },
      },
    }).catch((e: unknown) => e);
    expect((err as ValidationError).fields[0]?.code).toBe("UNKNOWN_PROPERTY");
    expect(mock.requests).toHaveLength(0);
  });

  it("rejects a page size outside 1 to 500 before any request", async () => {
    const { ontology, mock } = setupFixture();
    const zero = await ontology.Customer.query({ limit: 0 }).catch(
      (e: unknown) => e
    );
    const tooBig = await ontology.Customer.query({ limit: 501 }).catch(
      (e: unknown) => e
    );
    expect((zero as ValidationError).fields[0]?.field).toBe("limit");
    expect((tooBig as ValidationError).fields[0]?.field).toBe("limit");
    expect(mock.requests).toHaveLength(0);
  });

  it("keeps the server's code for a rejected operator", async () => {
    const { ontology } = setupFixture([
      {
        method: "POST",
        path: QUERY_PATH,
        status: 422,
        body: {
          code: "INVALID_CURSOR",
          detail: "cursor belongs to another type",
        },
      },
    ]);
    const err = await ontology.Customer.query({ cursor: "other" }).catch(
      (e: unknown) => e
    );
    expect((err as ValidationError).code).toBe("INVALID_CURSOR");
  });
});

describe("relation traversal", () => {
  it("hasMany returns every target in the order the server lists them", async () => {
    const { ontology } = setup(GRAPH_RUNTIME, [
      {
        method: "GET",
        path: "/ontology/objects/objects/co_1",
        body: stored("ot_company", "co_1", { name: "Acme" }),
      },
      linksFor({ rt_company_customers: ["cust_2", "cust_1"] }),
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
        body: stored("ot_customer", "cust_1", { email: "a@example.com" }),
      },
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_2",
        body: stored("ot_customer", "cust_2", { email: "b@example.com" }),
      },
    ]);
    const company = await ontology.Company.get("co_1");
    const customers = await company.customers();
    expect(customers.map((c) => c.id)).toEqual(["cust_2", "cust_1"]);
  });

  it("hasMany resolves to an empty list when there are no links", async () => {
    const { ontology } = setup(GRAPH_RUNTIME, [
      {
        method: "GET",
        path: "/ontology/objects/objects/co_1",
        body: stored("ot_company", "co_1", { name: "Acme" }),
      },
      linksFor({}),
    ]);
    const company = await ontology.Company.get("co_1");
    expect(await company.customers()).toEqual([]);
  });

  it("manyToMany resolves through its relationship type", async () => {
    const { ontology } = setup(GRAPH_RUNTIME, [
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
        body: stored("ot_customer", "cust_1", { email: "a@example.com" }),
      },
      linksFor({ rt_friends: ["cust_3"] }),
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_3",
        body: stored("ot_customer", "cust_3", { email: "c@example.com" }),
      },
    ]);
    const customer = await ontology.Customer.get("cust_1");
    const friends = await customer.friends();
    expect(friends.map((c) => c.email)).toEqual(["c@example.com"]);
  });

  it("hasOne resolves to null when there is no link", async () => {
    const { ontology } = setup(GRAPH_RUNTIME, [
      {
        method: "GET",
        path: "/ontology/objects/objects/co_1",
        body: stored("ot_company", "co_1", { name: "Acme" }),
      },
      linksFor({}),
    ]);
    const company = await ontology.Company.get("co_1");
    expect(await company.flagship()).toBeNull();
  });

  it("hasOne resolves to its one target", async () => {
    const { ontology } = setup(GRAPH_RUNTIME, [
      {
        method: "GET",
        path: "/ontology/objects/objects/co_1",
        body: stored("ot_company", "co_1", { name: "Acme" }),
      },
      linksFor({ rt_flagship: ["cust_1"] }),
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
        body: stored("ot_customer", "cust_1", { email: "a@example.com" }),
      },
    ]);
    const company = await ontology.Company.get("co_1");
    expect((await company.flagship())?.email).toBe("a@example.com");
  });

  it("hasOne rejects more than one link with TOO_MANY_RELATIONSHIPS", async () => {
    const { ontology } = setup(GRAPH_RUNTIME, [
      {
        method: "GET",
        path: "/ontology/objects/objects/co_1",
        body: stored("ot_company", "co_1", { name: "Acme" }),
      },
      linksFor({ rt_flagship: ["cust_1", "cust_2"] }),
    ]);
    const company = await ontology.Company.get("co_1");
    const err = await company.flagship().catch((e: unknown) => e);
    expect((err as ValidationError).code).toBe("TOO_MANY_RELATIONSHIPS");
  });
});

import { ValidationError } from "@frontal-labs/core";
import { createTestHttpClient, type MockRoute } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { withEntityHandles } from "../src/entity-handle";
import { OntologySdk } from "../src/sdk";
import { ontologyRuntime } from "./fixtures/ontology";

const OBJECT_TYPES_PATH = "/ontology/objects/object-types";

/** Object types as the API sends them (snake_case envelope, schema as-is). */
const OBJECT_TYPES_BODY = [
  {
    name: "Customer",
    object_type_id: "ot_customer",
    schema: {
      fields: {
        email: { required: true, type: "string" },
        score: { type: "integer" },
        status: { enum: ["active", "closed"], required: true, type: "enum" },
      },
    },
  },
  {
    name: "Company",
    object_type_id: "ot_company",
    schema: { fields: { name: { required: true, type: "string" } } },
  },
];

const CUSTOMER_ROUTE: MockRoute = {
  body: {
    object_id: "cust_1",
    object_type_id: "ot_customer",
    properties: { email: "a@example.com", status: "active" },
  },
  method: "GET",
  path: "/ontology/objects/objects/cust_1",
};

type Live = Record<
  string,
  {
    get(id: string): Promise<{ id: string; email: string }>;
    list(): Promise<unknown[]>;
  }
>;

function liveClient(routes: MockRoute[]) {
  const { http, mock } = createTestHttpClient(routes);
  const ontology = withEntityHandles(
    new OntologySdk(http),
    http,
    undefined
  ) as unknown as Live;
  return { mock, ontology };
}

function objectTypeRequests(requests: { path: string }[]): number {
  return requests.filter((request) => request.path.endsWith(OBJECT_TYPES_PATH))
    .length;
}

describe("lazy ontology metadata", () => {
  it("reads the object types once and reuses the metadata", async () => {
    const { mock, ontology } = liveClient([
      { body: OBJECT_TYPES_BODY, method: "GET", path: OBJECT_TYPES_PATH },
      CUSTOMER_ROUTE,
    ]);
    await ontology.Customer?.get("cust_1");
    await ontology.Customer?.get("cust_1");
    expect(objectTypeRequests(mock.requests)).toBe(1);
  });

  it("shares one request between concurrent first calls", async () => {
    const { mock, ontology } = liveClient([
      { body: OBJECT_TYPES_BODY, method: "GET", path: OBJECT_TYPES_PATH },
      CUSTOMER_ROUTE,
      { body: [], method: "GET", path: "/ontology/objects/objects" },
    ]);
    await Promise.all([
      ontology.Customer?.get("cust_1"),
      ontology.Customer?.get("cust_1"),
      ontology.Company?.list(),
    ]);
    expect(objectTypeRequests(mock.requests)).toBe(1);
  });

  it("retries the read after a failure instead of caching the error", async () => {
    const { mock, ontology } = liveClient([
      {
        body: { detail: "temporarily unavailable" },
        method: "GET",
        path: OBJECT_TYPES_PATH,
        status: 503,
        times: 1,
      },
      { body: OBJECT_TYPES_BODY, method: "GET", path: OBJECT_TYPES_PATH },
      CUSTOMER_ROUTE,
    ]);
    await expect(ontology.Customer?.get("cust_1")).rejects.toThrow(
      "temporarily unavailable"
    );
    await expect(ontology.Customer?.get("cust_1")).resolves.toMatchObject({
      email: "a@example.com",
    });
    expect(objectTypeRequests(mock.requests)).toBe(2);
  });

  it("rejects a name the live ontology does not contain, on use", async () => {
    const { ontology } = liveClient([
      { body: OBJECT_TYPES_BODY, method: "GET", path: OBJECT_TYPES_PATH },
    ]);
    await expect(ontology.Ghost?.get("1")).rejects.toThrow(
      'Entity "Ghost" is not in the live ontology; types may be out of date, run frontal sync'
    );
  });

  it("validates responses against the live metadata", async () => {
    const { ontology } = liveClient([
      { body: OBJECT_TYPES_BODY, method: "GET", path: OBJECT_TYPES_PATH },
      {
        body: {
          object_id: "cust_1",
          object_type_id: "ot_customer",
          properties: { email: "a@example.com", status: "gold" },
        },
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
      },
    ]);
    const failure = await ontology.Customer?.get("cust_1").catch(
      (error: unknown) => error
    );
    expect(failure).toBeInstanceOf(ValidationError);
  });

  it("makes no object-types request when the runtime is pinned", async () => {
    const { http, mock } = createTestHttpClient([CUSTOMER_ROUTE]);
    const ontology = withEntityHandles(
      new OntologySdk(http),
      http,
      ontologyRuntime
    ) as unknown as Record<string, { get(id: string): Promise<unknown> }>;
    await ontology.Customer?.get("cust_1");
    expect(objectTypeRequests(mock.requests)).toBe(0);
  });

  it("keeps the sync error for unknown names when the runtime is pinned", () => {
    const { http } = createTestHttpClient();
    const ontology = withEntityHandles(
      new OntologySdk(http),
      http,
      ontologyRuntime
    ) as unknown as Record<string, unknown>;
    expect(() => ontology.Ghost).toThrow(TypeError);
  });
});

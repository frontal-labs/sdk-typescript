import { ValidationError } from "@frontal-labs/core";
import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { withEntityHandles } from "../src/entities";
import { OntologySdk } from "../src/sdk";

const runtime = {
  entities: ["Company", "Customer"],
  relations: {
    Customer: { company: { target: "Company", foreignKey: "companyId" } },
  },
} as const;

function setup(routes: Parameters<typeof createTestHttpClient>[0] = []) {
  const { http, mock } = createTestHttpClient(routes);
  const sdk = new OntologySdk(http);
  return { sdk, mock };
}

// Typed access in tests goes through a loose view: the handles are validated
// by the compile-time tests, not here.
interface LooseHandle {
  get(id: string): Promise<Record<string, unknown>>;
  create(id: string, input: unknown): Promise<Record<string, unknown>>;
  update(id: string, patch: unknown): Promise<Record<string, unknown>>;
  delete(id: string): Promise<void>;
}

function handles(sdk: OntologySdk) {
  return withEntityHandles(sdk, runtime) as unknown as Record<
    string,
    LooseHandle
  >;
}

describe("withEntityHandles", () => {
  it("returns the plain SDK when no runtime is supplied", () => {
    const { sdk } = setup();
    expect(withEntityHandles(sdk, undefined)).toBe(sdk);
  });

  it("keeps existing OntologySdk members intact", () => {
    const { sdk } = setup();
    const ontology = withEntityHandles(sdk, runtime);
    expect(ontology.objects).toBe(sdk.objects);
    expect(ontology.schemas).toBe(sdk.schemas);
  });

  it("resolves unknown names to undefined", () => {
    const { sdk } = setup();
    expect(handles(sdk).Unknown).toBeUndefined();
  });
});

describe("entity handle", () => {
  it("get fetches the object by id", async () => {
    const { sdk, mock } = setup([
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
        body: { id: "cust_1", email: "a@example.com", companyId: null },
      },
    ]);
    const customer = await handles(sdk).Customer?.get("cust_1");
    expect(customer?.email).toBe("a@example.com");
    mock.expectCalled("GET", "/ontology/objects/objects/cust_1");
  });

  it("get rejects a response without a string id", async () => {
    const { sdk } = setup([
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
        body: { email: "a@example.com" },
      },
    ]);
    const err = await handles(sdk)
      .Customer?.get("cust_1")
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).code).toBe("INVALID_RESPONSE");
  });

  it("get rejects a non-object response", async () => {
    const { sdk } = setup([
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
        body: ["not", "an", "object"],
      },
    ]);
    await expect(handles(sdk).Customer?.get("cust_1")).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("create writes the input with an explicit id via PUT", async () => {
    const { sdk, mock } = setup([
      {
        method: "PUT",
        path: "/ontology/objects/objects/cust_2",
        body: { id: "cust_2", email: "b@example.com" },
      },
    ]);
    const created = await handles(sdk).Customer?.create("cust_2", {
      email: "b@example.com",
    });
    expect(created?.id).toBe("cust_2");
    mock.expectCalledWith("PUT", "/ontology/objects/objects/cust_2", {
      email: "b@example.com",
    });
  });

  it("create rejects a non-object input", async () => {
    const { sdk } = setup();
    await expect(
      handles(sdk).Customer?.create("cust_2", "bad")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("update merges the patch into the stored record (GET, merge, PUT)", async () => {
    const { sdk, mock } = setup([
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
        body: { id: "cust_1", email: "a@example.com", status: "active" },
      },
      {
        method: "PUT",
        path: "/ontology/objects/objects/cust_1",
        body: { id: "cust_1", email: "new@example.com", status: "active" },
      },
    ]);
    await handles(sdk).Customer?.update("cust_1", {
      email: "new@example.com",
    });
    mock.expectCalledWith("PUT", "/ontology/objects/objects/cust_1", {
      id: "cust_1",
      email: "new@example.com",
      status: "active",
    });
  });

  it("delete calls the object delete endpoint", async () => {
    const { sdk, mock } = setup([
      {
        method: "DELETE",
        path: "/ontology/objects/objects/cust_1",
        status: 204,
      },
    ]);
    await handles(sdk).Customer?.delete("cust_1");
    mock.expectCalled("DELETE", "/ontology/objects/objects/cust_1");
  });
});

describe("relation accessors", () => {
  it("resolves the target lazily through the foreign key", async () => {
    const { sdk, mock } = setup([
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
        body: { id: "cust_1", email: "a@example.com", companyId: "co_1" },
      },
      {
        method: "GET",
        path: "/ontology/objects/objects/co_1",
        body: { id: "co_1", name: "Acme" },
      },
    ]);
    const customer = await handles(sdk).Customer?.get("cust_1");
    // Fetching the customer must not fetch the company.
    expect(mock.requests.some((r) => r.path.endsWith("/objects/co_1"))).toBe(
      false
    );
    const company = await (
      customer?.company as () => Promise<Record<string, unknown>>
    )();
    expect(company.name).toBe("Acme");
    mock.expectCalled("GET", "/ontology/objects/objects/co_1");
  });

  it("returns null when the foreign key is empty", async () => {
    const { sdk } = setup([
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
        body: { id: "cust_1", companyId: null },
      },
    ]);
    const customer = await handles(sdk).Customer?.get("cust_1");
    const company = await (customer?.company as () => Promise<unknown>)();
    expect(company).toBeNull();
  });

  it("keeps relation accessors out of enumeration and JSON", async () => {
    const { sdk } = setup([
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
        body: { id: "cust_1", companyId: null },
      },
    ]);
    const customer = await handles(sdk).Customer?.get("cust_1");
    expect(Object.keys(customer ?? {})).toEqual(["id", "companyId"]);
    expect(JSON.parse(JSON.stringify(customer))).toEqual({
      id: "cust_1",
      companyId: null,
    });
  });

  it("rejects a non-string foreign key", async () => {
    const { sdk } = setup([
      {
        method: "GET",
        path: "/ontology/objects/objects/cust_1",
        body: { id: "cust_1", companyId: 42 },
      },
    ]);
    const customer = await handles(sdk).Customer?.get("cust_1");
    await expect(
      (customer?.company as () => Promise<unknown>)()
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

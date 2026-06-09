import {
  createTestHttpClient,
  fixtures,
  mockPageResponse,
} from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { EntityAccessor, GraphService } from "../src/service";

function createService(
  routes: Parameters<typeof createTestHttpClient>[0] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  const service = new GraphService(http);
  return { service, mock };
}

const entity = fixtures.entity;

describe("GraphService", () => {
  describe("entities()", () => {
    it("returns an EntityAccessor for the given type", () => {
      const { service } = createService();
      const accessor = service.use("user");
      expect(accessor).toBeInstanceOf(EntityAccessor);
    });
  });

  describe("query()", () => {
    it("posts to /v1/ontology/graph/graph/query and returns paginated results", async () => {
      const items = [entity(), entity()];
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/ontology/graph/graph/query",
          body: mockPageResponse(items),
        },
      ]);

      const result = await service.query({ entityType: "user" });

      expect(result.data).toHaveLength(2);
      mock.expectCalled("POST", "/ontology/graph/graph/query");
    });
  });

  describe("naturalLanguageQuery()", () => {
    it("posts to /v1/ontology/graph/graph/analyze with question", async () => {
      const body = {
        answer: "Found 3 users",
        entities: [entity()],
        confidence: 0.92,
      };
      const { service, mock } = createService([
        { method: "POST", path: "/ontology/graph/graph/analyze", body },
      ]);

      const result = await service.naturalLanguageQuery("find all users");

      expect(result.answer).toBe("Found 3 users");
      expect(result.confidence).toBe(0.92);
      mock.expectCalledWith("POST", "/ontology/graph/graph/analyze", {
        question: "find all users",
      });
    });

    it("passes optional entityType and limit", async () => {
      const body = { answer: "ok", entities: [], confidence: 0.8 };
      const { service, mock } = createService([
        { method: "POST", path: "/ontology/graph/graph/analyze", body },
      ]);

      await service.naturalLanguageQuery("find admins", {
        entityType: "admin",
        limit: 5,
      });

      mock.expectCalledWith("POST", "/ontology/graph/graph/analyze", {
        entityType: "admin",
        limit: 5,
      });
    });
  });

  describe("semanticSearch()", () => {
    it("posts to /v1/ontology/graph/graph/neighborhood", async () => {
      const body = {
        results: [{ entity: entity(), score: 0.95 }],
        query: "test",
      };
      const { service, mock } = createService([
        { method: "POST", path: "/ontology/graph/graph/neighborhood", body },
      ]);

      const result = await service.semanticSearch({
        query: "find similar entities",
        entityType: "user",
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].score).toBe(0.95);
      mock.expectCalled("POST", "/ontology/graph/graph/neighborhood");
    });
  });

  describe("traverse()", () => {
    it("posts to /v1/ontology/graph/graph/neighborhood", async () => {
      const body = {
        paths: [[{ entity: entity(), edge: { id: "e1", type: "knows" } }]],
        totalFound: 1,
      };
      const { service, mock } = createService([
        { method: "POST", path: "/ontology/graph/graph/neighborhood", body },
      ]);

      const result = await service.traverse({
        startEntity: { id: "ent_1", type: "user" },
        direction: "outgoing",
        maxDepth: 3,
      });

      expect(result.totalFound).toBe(1);
      expect(result.paths).toHaveLength(1);
      mock.expectCalled("POST", "/ontology/graph/graph/neighborhood");
    });
  });

  describe("findPath()", () => {
    it("posts to /v1/ontology/graph/graph/path", async () => {
      const body = {
        paths: [],
        shortestPath: [{ entity: entity(), edge: { id: "e1", type: "knows" } }],
      };
      const { service, mock } = createService([
        { method: "POST", path: "/ontology/graph/graph/path", body },
      ]);

      const result = await service.findPath({
        fromEntity: { id: "ent_1", type: "user" },
        toEntity: { id: "ent_2", type: "user" },
      });

      expect(result.shortestPath).toHaveLength(1);
      mock.expectCalled("POST", "/ontology/graph/graph/path");
    });
  });

  describe("batch()", () => {
    it("posts batch operations to /v1/ontology/graph/graph/build", async () => {
      const body = { succeeded: 2, failed: 0, results: [] };
      const { service, mock } = createService([
        { method: "POST", path: "/ontology/graph/graph/build", body },
      ]);

      const result = await service.batch([
        { type: "create", entityType: "user", fields: { name: "Alice" } },
        { type: "create", entityType: "user", fields: { name: "Bob" } },
      ]);

      expect(result.succeeded).toBe(2);
      mock.expectCalled("POST", "/ontology/graph/graph/build");
    });
  });
});

describe("EntityAccessor", () => {
  const entityType = "user";

  describe("get()", () => {
    it("fetches an entity by id", async () => {
      const ent = entity({ id: "ent_abc" });
      const { service, mock } = createService([
        {
          method: "GET",
          path: `/v1/ontology/graph/entities/ent_abc`,
          body: ent,
        },
      ]);

      const result = await service.use(entityType).get("ent_abc");

      expect(result.id).toBe("ent_abc");
      mock.expectCalled("GET", `/v1/ontology/graph/entities/ent_abc`);
    });

    it("passes version parameter", async () => {
      const ent = entity({ id: "ent_abc", version: 2 });
      const { service } = createService([
        {
          method: "GET",
          path: `/v1/ontology/graph/entities/ent_abc`,
          body: ent,
        },
      ]);

      const result = await service
        .use(entityType)
        .get("ent_abc", { version: 2 });
      expect(result.version).toBe(2);
    });
  });

  describe("create()", () => {
    it("creates an entity with fields", async () => {
      const ent = entity({ type: entityType });
      const { service, mock } = createService([
        { method: "POST", path: `/v1/ontology/graph/runs`, body: ent },
      ]);

      const result = await service
        .use(entityType)
        .create({ name: "Alice", email: "alice@test.com" });

      expect(result.type).toBe(entityType);
      mock.expectCalledWith("POST", `/v1/ontology/graph/runs`, {
        fields: { name: "Alice", email: "alice@test.com" },
      });
    });
  });

  describe("update()", () => {
    it("updates an entity by id", async () => {
      const ent = entity({ id: "ent_abc", fields: { name: "Alice Updated" } });
      const { service, mock } = createService([
        {
          method: "PUT",
          path: `/v1/ontology/graph/entities/ent_abc`,
          body: ent,
        },
      ]);

      const result = await service
        .use(entityType)
        .update("ent_abc", { name: "Alice Updated" });

      expect(result.id).toBe("ent_abc");
      mock.expectCalled("PUT", `/v1/ontology/graph/entities/ent_abc`);
    });
  });

  describe("delete()", () => {
    it("deletes an entity by id", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: `/v1/ontology/graph/runs`,
          status: 204,
        },
      ]);

      await service.use(entityType).delete("ent_abc");

      mock.expectCalled("POST", `/v1/ontology/graph/runs`);
    });
  });

  describe("list()", () => {
    it("lists entities with pagination", async () => {
      const items = [entity(), entity(), entity()];
      const { service, mock } = createService([
        {
          method: "GET",
          path: `/v1/ontology/graph/runs`,
          body: mockPageResponse(items),
        },
      ]);

      const result = await service.use(entityType).list({ limit: 10 });

      expect(result.data).toHaveLength(3);
      mock.expectCalled("GET", `/v1/ontology/graph/runs`);
    });
  });

  describe("relationships()", () => {
    it("fetches relationships for an entity", async () => {
      const body = {
        data: [{ id: "rel_1", entityType: "org", relationType: "belongs_to" }],
      };
      const { service, mock } = createService([
        {
          method: "GET",
          path: `/v1/ontology/graph/entities/ent_abc/provenance`,
          body,
        },
      ]);

      const result = await service.use(entityType).relationships("ent_abc");

      expect(result.data).toHaveLength(1);
      mock.expectCalled(
        "GET",
        `/v1/ontology/graph/entities/ent_abc/provenance`
      );
    });
  });

  describe("addRelationship()", () => {
    it("adds a relationship between entities", async () => {
      const body = { id: "edge_1", type: "works_at" };
      const { service, mock } = createService([
        {
          method: "POST",
          path: `/v1/ontology/graph/entities/ent_abc/provenance`,
          body,
        },
      ]);

      const result = await service
        .use(entityType)
        .addRelationship("ent_abc", "ent_xyz", "works_at");

      expect(result.type).toBe("works_at");
      mock.expectCalledWith(
        "POST",
        `/v1/ontology/graph/entities/ent_abc/provenance`,
        {
          targetEntityId: "ent_xyz",
          relationType: "works_at",
        }
      );
    });
  });

  describe("removeRelationship()", () => {
    it("removes a relationship by id", async () => {
      const { service, mock } = createService([
        {
          method: "DELETE",
          path: `/v1/ontology/graph/relationships/rel_1`,
          status: 204,
        },
      ]);

      await service.use(entityType).removeRelationship("ent_abc", "rel_1");

      mock.expectCalled("DELETE", `/v1/ontology/graph/relationships/rel_1`);
    });
  });
});

describe("HistoryNamespace", () => {
  describe("get()", () => {
    it("fetches entity history", async () => {
      const body = {
        entityId: "ent_abc",
        entityType: "user",
        versions: [{ version: 1, createdAt: "2024-01-01" }],
      };
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/ontology/graph/entities/ent_abc/provenance",
          body,
        },
      ]);

      const result = await service.history.get("ent_abc", "user");

      expect(result.entityId).toBe("ent_abc");
      mock.expectCalled("GET", "/ontology/graph/entities/ent_abc/provenance");
    });
  });

  describe("revert()", () => {
    it("reverts an entity to a previous version", async () => {
      const ent = entity({ id: "ent_abc", version: 1 });
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/ontology/graph/runs",
          body: ent,
        },
      ]);

      const result = await service.history.revert("ent_abc", "user", 1);

      expect(result.version).toBe(1);
      mock.expectCalledWith("POST", "/ontology/graph/runs", {
        toVersion: 1,
      });
    });
  });
});

import {
	createTestHttpClient,
	fixtures,
	mockPageResponse,
} from "@frontal/testing";
import { describe, expect, it } from "vitest";
import { EntityAccessor, GraphService, HistoryNamespace } from "../src/service";

function createService(
	routes: Parameters<typeof createTestHttpClient>[0] = [],
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
		it("posts to /graph/query and returns paginated results", async () => {
			const items = [entity(), entity()];
			const { service, mock } = createService([
				{ method: "POST", path: "/graph/query", body: mockPageResponse(items) },
			]);

			const result = await service.query({ entityType: "user" });

			expect(result.data).toHaveLength(2);
			mock.expectCalled("POST", "/graph/query");
		});
	});

	describe("naturalLanguageQuery()", () => {
		it("posts to /graph/nl-query with question", async () => {
			const body = {
				answer: "Found 3 users",
				entities: [entity()],
				confidence: 0.92,
			};
			const { service, mock } = createService([
				{ method: "POST", path: "/graph/nl-query", body },
			]);

			const result = await service.naturalLanguageQuery("find all users");

			expect(result.answer).toBe("Found 3 users");
			expect(result.confidence).toBe(0.92);
			mock.expectCalledWith("POST", "/graph/nl-query", {
				question: "find all users",
			});
		});

		it("passes optional entityType and limit", async () => {
			const body = { answer: "ok", entities: [], confidence: 0.8 };
			const { service, mock } = createService([
				{ method: "POST", path: "/graph/nl-query", body },
			]);

			await service.naturalLanguageQuery("find admins", {
				entityType: "admin",
				limit: 5,
			});

			mock.expectCalledWith("POST", "/graph/nl-query", {
				entityType: "admin",
				limit: 5,
			});
		});
	});

	describe("semanticSearch()", () => {
		it("posts to /graph/semantic-search", async () => {
			const body = {
				results: [{ entity: entity(), score: 0.95 }],
				query: "test",
			};
			const { service, mock } = createService([
				{ method: "POST", path: "/graph/semantic-search", body },
			]);

			const result = await service.semanticSearch({
				query: "find similar entities",
				entityType: "user",
			});

			expect(result.results).toHaveLength(1);
			expect(result.results[0].score).toBe(0.95);
			mock.expectCalled("POST", "/graph/semantic-search");
		});
	});

	describe("traverse()", () => {
		it("posts to /graph/traverse", async () => {
			const body = {
				paths: [[{ entity: entity(), edge: { id: "e1", type: "knows" } }]],
				totalFound: 1,
			};
			const { service, mock } = createService([
				{ method: "POST", path: "/graph/traverse", body },
			]);

			const result = await service.traverse({
				startEntity: { id: "ent_1", type: "user" },
				direction: "outgoing",
				maxDepth: 3,
			});

			expect(result.totalFound).toBe(1);
			expect(result.paths).toHaveLength(1);
			mock.expectCalled("POST", "/graph/traverse");
		});
	});

	describe("findPath()", () => {
		it("posts to /graph/find-path", async () => {
			const body = {
				paths: [],
				shortestPath: [{ entity: entity(), edge: { id: "e1", type: "knows" } }],
			};
			const { service, mock } = createService([
				{ method: "POST", path: "/graph/find-path", body },
			]);

			const result = await service.findPath({
				fromEntity: { id: "ent_1", type: "user" },
				toEntity: { id: "ent_2", type: "user" },
			});

			expect(result.shortestPath).toHaveLength(1);
			mock.expectCalled("POST", "/graph/find-path");
		});
	});

	describe("batch()", () => {
		it("posts batch operations to /graph/batch", async () => {
			const body = { succeeded: 2, failed: 0, results: [] };
			const { service, mock } = createService([
				{ method: "POST", path: "/graph/batch", body },
			]);

			const result = await service.batch([
				{ type: "create", entityType: "user", fields: { name: "Alice" } },
				{ type: "create", entityType: "user", fields: { name: "Bob" } },
			]);

			expect(result.succeeded).toBe(2);
			mock.expectCalled("POST", "/graph/batch");
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
					path: `/graph/entities/${entityType}/ent_abc`,
					body: ent,
				},
			]);

			const result = await service.use(entityType).get("ent_abc");

			expect(result.id).toBe("ent_abc");
			mock.expectCalled("GET", `/graph/entities/${entityType}/ent_abc`);
		});

		it("passes version parameter", async () => {
			const ent = entity({ id: "ent_abc", version: 2 });
			const { service } = createService([
				{
					method: "GET",
					path: `/graph/entities/${entityType}/ent_abc`,
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
				{ method: "POST", path: `/graph/entities/${entityType}`, body: ent },
			]);

			const result = await service
				.use(entityType)
				.create({ name: "Alice", email: "alice@test.com" });

			expect(result.type).toBe(entityType);
			mock.expectCalledWith("POST", `/graph/entities/${entityType}`, {
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
					path: `/graph/entities/${entityType}/ent_abc`,
					body: ent,
				},
			]);

			const result = await service
				.use(entityType)
				.update("ent_abc", { name: "Alice Updated" });

			expect(result.id).toBe("ent_abc");
			mock.expectCalled("PUT", `/graph/entities/${entityType}/ent_abc`);
		});
	});

	describe("delete()", () => {
		it("deletes an entity by id", async () => {
			const { service, mock } = createService([
				{
					method: "DELETE",
					path: `/graph/entities/${entityType}/ent_abc`,
					status: 204,
				},
			]);

			await service.use(entityType).delete("ent_abc");

			mock.expectCalled("DELETE", `/graph/entities/${entityType}/ent_abc`);
		});
	});

	describe("list()", () => {
		it("lists entities with pagination", async () => {
			const items = [entity(), entity(), entity()];
			const { service, mock } = createService([
				{
					method: "GET",
					path: `/graph/entities/${entityType}`,
					body: mockPageResponse(items),
				},
			]);

			const result = await service.use(entityType).list({ limit: 10 });

			expect(result.data).toHaveLength(3);
			mock.expectCalled("GET", `/graph/entities/${entityType}`);
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
					path: `/graph/entities/${entityType}/ent_abc/relationships`,
					body,
				},
			]);

			const result = await service.use(entityType).relationships("ent_abc");

			expect(result.data).toHaveLength(1);
			mock.expectCalled(
				"GET",
				`/graph/entities/${entityType}/ent_abc/relationships`,
			);
		});
	});

	describe("addRelationship()", () => {
		it("adds a relationship between entities", async () => {
			const body = { id: "edge_1", type: "works_at" };
			const { service, mock } = createService([
				{
					method: "POST",
					path: `/graph/entities/${entityType}/ent_abc/relationships`,
					body,
				},
			]);

			const result = await service
				.use(entityType)
				.addRelationship("ent_abc", "ent_xyz", "works_at");

			expect(result.type).toBe("works_at");
			mock.expectCalledWith(
				"POST",
				`/graph/entities/${entityType}/ent_abc/relationships`,
				{
					targetEntityId: "ent_xyz",
					relationType: "works_at",
				},
			);
		});
	});

	describe("removeRelationship()", () => {
		it("removes a relationship by id", async () => {
			const { service, mock } = createService([
				{
					method: "DELETE",
					path: `/graph/entities/${entityType}/ent_abc/relationships/rel_1`,
					status: 204,
				},
			]);

			await service.use(entityType).removeRelationship("ent_abc", "rel_1");

			mock.expectCalled(
				"DELETE",
				`/graph/entities/${entityType}/ent_abc/relationships/rel_1`,
			);
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
				{ method: "GET", path: "/graph/history/user/ent_abc", body },
			]);

			const result = await service.history.get("ent_abc", "user");

			expect(result.entityId).toBe("ent_abc");
			mock.expectCalled("GET", "/graph/history/user/ent_abc");
		});
	});

	describe("revert()", () => {
		it("reverts an entity to a previous version", async () => {
			const ent = entity({ id: "ent_abc", version: 1 });
			const { service, mock } = createService([
				{
					method: "POST",
					path: "/graph/history/user/ent_abc/revert",
					body: ent,
				},
			]);

			const result = await service.history.revert("ent_abc", "user", 1);

			expect(result.version).toBe(1);
			mock.expectCalledWith("POST", "/graph/history/user/ent_abc/revert", {
				toVersion: 1,
			});
		});
	});
});

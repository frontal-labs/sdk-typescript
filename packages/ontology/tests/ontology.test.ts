import {
	createTestHttpClient,
	fixtures,
	mockPageResponse,
} from "@frontal/testing";
import { describe, expect, it } from "vitest";
import { ModelAccessor, OntologyService } from "../src/service";

function createService(
	routes: Parameters<typeof createTestHttpClient>[0] = [],
) {
	const { http, mock } = createTestHttpClient(routes);
	const service = new OntologyService(http);
	return { service, mock };
}

const model = fixtures.model;

describe("OntologyService", () => {
	describe("model()", () => {
		it("returns a ModelAccessor for the given name", () => {
			const { service } = createService();
			const accessor = service.use("user");
			expect(accessor).toBeInstanceOf(ModelAccessor);
		});
	});

	describe("list()", () => {
		it("fetches models with pagination", async () => {
			const items = [model(), model()];
			const { service, mock } = createService([
				{ method: "GET", path: "/v1/ontology/engine/runs", body: mockPageResponse(items) },
			]);

			const result = await service.list();

			expect(result.data).toHaveLength(2);
			mock.expectCalled("GET", "/v1/ontology/engine/runs");
		});

		it("passes filter options", async () => {
			const { service } = createService([
				{ method: "GET", path: "/v1/ontology/engine/runs", body: mockPageResponse([]) },
			]);

			await service.list({ status: "active", limit: 5 });
		});
	});

	describe("create()", () => {
		it("creates a model definition", async () => {
			const mdl = model({ name: "customer" });
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/runs", body: mdl },
			]);

			const result = await service.create({
				name: "customer",
				fields: { id: { type: "uuid" }, email: { type: "string" } },
			});

			expect(result.name).toBe("customer");
			mock.expectCalled("POST", "/v1/ontology/engine/runs");
		});
	});

	describe("validate()", () => {
		it("validates a model definition", async () => {
			const body = { valid: true };
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/ontologies/validate", body },
			]);

			const result = await service.validate({
				name: "customer",
				fields: { id: { type: "uuid" } },
			});

			expect(result.valid).toBe(true);
			mock.expectCalled("POST", "/v1/ontology/engine/ontologies/validate");
		});

		it("returns validation errors", async () => {
			const body = {
				valid: false,
				errors: [{ field: "name", message: "required" }],
			};
			const { service } = createService([
				{ method: "POST", path: "/v1/ontology/engine/ontologies/validate", body },
			]);

			const result = await service.validate({
				name: "",
				fields: {},
			});

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
		});
	});

	describe("checkIntegrity()", () => {
		it("checks ontology integrity", async () => {
			const body = { valid: true };
			const { service, mock } = createService([
				{ method: "GET", path: "/v1/ontology/engine/health", body },
			]);

			const result = await service.checkIntegrity();

			expect(result.valid).toBe(true);
			mock.expectCalled("GET", "/v1/ontology/engine/health");
		});
	});
});

describe("ModelAccessor", () => {
	const modelName = "user";

	describe("get()", () => {
		it("fetches a model by name", async () => {
			const mdl = model({ name: modelName });
			const { service, mock } = createService([
				{ method: "GET", path: `/v1/ontology/engine/runs`, body: mdl },
			]);

			const result = await service.use(modelName).get();

			expect(result.name).toBe(modelName);
			mock.expectCalled("GET", `/v1/ontology/engine/runs`);
		});

		it("fetches a specific version", async () => {
			const mdl = model({ name: modelName, version: 2 });
			const { service } = createService([
				{ method: "GET", path: `/v1/ontology/engine/runs`, body: mdl },
			]);

			const result = await service.use(modelName).get(2);
			expect(result.version).toBe(2);
		});
	});

	describe("update()", () => {
		it("updates a model definition", async () => {
			const mdl = model({ name: modelName });
			const { service, mock } = createService([
				{ method: "POST", path: `/v1/ontology/engine/runs`, body: mdl },
			]);

			await service.use(modelName).update({ fields: { id: { type: "uuid" } } });

			mock.expectCalled("POST", `/v1/ontology/engine/runs`);
		});
	});

	describe("delete()", () => {
		it("deletes a model", async () => {
			const { service, mock } = createService([
				{ method: "POST", path: `/v1/ontology/engine/runs`, status: 204 },
			]);

			await service.use(modelName).delete();

			mock.expectCalled("POST", `/v1/ontology/engine/runs`);
		});
	});

	describe("relationships()", () => {
		it("fetches model relationships", async () => {
			const body = {
				data: [{ id: "rel_1", type: "has_many", target: "order" }],
			};
			const { service, mock } = createService([
				{ method: "GET", path: `/v1/ontology/engine/runs`, body },
			]);

			const result = await service.use(modelName).relationships();

			expect(result.data).toHaveLength(1);
			mock.expectCalled("GET", `/v1/ontology/engine/runs`);
		});
	});

	describe("addRelationship()", () => {
		it("adds a relationship definition", async () => {
			const body = {
				id: "rel_1",
				type: "has_many",
				target: "order",
				name: "orders",
			};
			const { service, mock } = createService([
				{ method: "POST", path: `/v1/ontology/engine/runs`, body },
			]);

			const result = await service.use(modelName).addRelationship({
				type: "hasMany",
				targetEntity: "order",
			});

			expect(result.type).toBe("has_many");
			mock.expectCalled("POST", `/v1/ontology/engine/runs`);
		});
	});

	describe("removeRelationship()", () => {
		it("removes a relationship", async () => {
			const { service, mock } = createService([
				{
					method: "POST",
					path: `/v1/ontology/engine/runs`,
					status: 204,
				},
			]);

			await service.use(modelName).removeRelationship("rel_1");

			mock.expectCalled("POST", `/v1/ontology/engine/runs`);
		});
	});

	describe("validateData()", () => {
		it("validates data against the model", async () => {
			const body = { entityType: "user", totalChecked: 100, violations: [] };
			const { service, mock } = createService([
				{ method: "POST", path: `/v1/ontology/engine/ontologies/validate`, body },
			]);

			const result = await service.use(modelName).validateData();

			expect(result.totalChecked).toBe(100);
			expect(result.violations).toHaveLength(0);
			mock.expectCalled("POST", `/v1/ontology/engine/ontologies/validate`);
		});
	});

	describe("versions()", () => {
		it("fetches model version history", async () => {
			const body = {
				data: [
					{
						version: 1,
						createdAt: "2024-01-01",
						changedBy: "admin",
						changesSummary: "initial",
					},
				],
			};
			const { service, mock } = createService([
				{ method: "GET", path: `/v1/ontology/engine/runs`, body },
			]);

			const result = await service.use(modelName).versions();

			expect(result.data).toHaveLength(1);
			mock.expectCalled("GET", `/v1/ontology/engine/runs`);
		});
	});
});

describe("MigrationsNamespace", () => {
	describe("plan()", () => {
		it("creates a migration plan", async () => {
			const body = { id: "mig_1", steps: [], estimatedDuration: "5m" };
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/ontologies/compare-versions", body },
			]);

			const result = await service.migrations.plan({ modelId: "mdl_1" });

			expect(result.id).toBe("mig_1");
			mock.expectCalled("POST", "/v1/ontology/engine/ontologies/compare-versions");
		});
	});

	describe("apply()", () => {
		it("applies a migration plan", async () => {
			const body = { id: "mig_1", status: "applied", appliedAt: "2024-01-01" };
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/runs", body },
			]);

			const result = await service.migrations.apply("plan_1");

			expect(result.status).toBe("applied");
			mock.expectCalledWith("POST", "/v1/ontology/engine/runs", {
				planId: "plan_1",
				strategy: "zero-downtime",
			});
		});
	});

	describe("rollback()", () => {
		it("rolls back a migration", async () => {
			const body = {
				id: "mig_1",
				status: "rolled_back",
				rolledBackAt: "2024-01-01",
			};
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/runs", body },
			]);

			const result = await service.migrations.rollback("mig_1");

			expect(result.status).toBe("rolled_back");
			mock.expectCalled("POST", "/v1/ontology/engine/runs");
		});
	});

	describe("history()", () => {
		it("lists migration history with pagination", async () => {
			const items = [
				{
					id: "mig_1",
					modelId: "mdl_1",
					fromVersion: 1,
					toVersion: 2,
					status: "applied",
					createdAt: "2024-01-01",
				},
			];
			const { service, mock } = createService([
				{
					method: "GET",
					path: "/v1/ontology/engine/runs",
					body: mockPageResponse(items),
				},
			]);

			const result = await service.migrations.history();

			expect(result.data).toHaveLength(1);
			mock.expectCalled("GET", "/v1/ontology/engine/runs");
		});
	});
});

describe("RulesNamespace", () => {
	describe("list()", () => {
		it("lists all rules", async () => {
			const body = {
				data: [{ id: "rule_1", name: "email_required", type: "validation" }],
			};
			const { service, mock } = createService([
				{ method: "GET", path: "/v1/ontology/engine/runs", body },
			]);

			const result = await service.rules.list();

			expect(result.data).toHaveLength(1);
			mock.expectCalled("GET", "/v1/ontology/engine/runs");
		});
	});

	describe("create()", () => {
		it("creates a rule", async () => {
			const body = { id: "rule_1", name: "email_format", type: "validation" };
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/runs", body },
			]);

			const result = await service.rules.create({
				name: "email_format",
				entityTypes: ["user"],
				condition: "email matches /^.+@.+$/",
				action: "validate",
				severity: "error",
			});

			expect(result.name).toBe("email_format");
			mock.expectCalled("POST", "/v1/ontology/engine/runs");
		});
	});

	describe("update()", () => {
		it("updates a rule", async () => {
			const body = {
				id: "rule_1",
				name: "email_format_v2",
				type: "validation",
			};
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/runs", body },
			]);

			const result = await service.rules.update("rule_1", {
				name: "email_format_v2",
			});

			expect(result.name).toBe("email_format_v2");
			mock.expectCalled("POST", "/v1/ontology/engine/runs");
		});
	});

	describe("delete()", () => {
		it("deletes a rule", async () => {
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/runs", status: 204 },
			]);

			await service.rules.delete("rule_1");

			mock.expectCalled("POST", "/v1/ontology/engine/runs");
		});
	});

	describe("evaluate()", () => {
		it("evaluates rules", async () => {
			const body = {
				results: [],
				summary: { totalChecked: 50, violations: 0 },
			};
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/ontologies/validate", body },
			]);

			const result = await service.rules.evaluate({ entityType: "user" });

			expect(result.summary.violations).toBe(0);
			mock.expectCalled("POST", "/v1/ontology/engine/ontologies/validate");
		});
	});
});

describe("MixinsNamespace", () => {
	describe("list()", () => {
		it("lists all mixins", async () => {
			const body = { data: [{ name: "timestamped", fields: [] }] };
			const { service, mock } = createService([
				{ method: "GET", path: "/v1/ontology/engine/runs", body },
			]);

			const result = await service.mixins.list();

			expect(result.data).toHaveLength(1);
			mock.expectCalled("GET", "/v1/ontology/engine/runs");
		});
	});

	describe("create()", () => {
		it("creates a mixin", async () => {
			const body = {
				name: "auditable",
				fields: [{ name: "createdBy", type: "string" }],
			};
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/runs", body },
			]);

			const result = await service.mixins.create({
				name: "auditable",
				fields: { createdBy: { type: "string" } },
			});

			expect(result.name).toBe("auditable");
			mock.expectCalled("POST", "/v1/ontology/engine/runs");
		});
	});
});

describe("GenerationNamespace", () => {
	describe("generate()", () => {
		it("generates a model from description", async () => {
			const body = {
				proposal: { name: "customer", fields: [{ name: "id", type: "uuid" }] },
				confidence: 0.88,
				reasoning: "Based on description...",
			};
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/ontologies/generate", body },
			]);

			const result = await service.generation.generate(
				"A customer model with basic fields",
				{ context: {} },
			);

			expect(result.confidence).toBe(0.88);
			mock.expectCalled("POST", "/v1/ontology/engine/ontologies/generate");
		});
	});

	describe("infer()", () => {
		it("infers models from substrates", async () => {
			const body = { proposals: [{ name: "inferred_model" }] };
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/ontologies/infer-classes", body },
			]);

			const result = await service.generation.infer({
				substrates: ["postgres"],
			});

			expect(result.proposals).toHaveLength(1);
			mock.expectCalled("POST", "/v1/ontology/engine/ontologies/infer-classes");
		});
	});

	describe("suggestions()", () => {
		it("lists suggestions", async () => {
			const body = { data: [{ id: "sug_1", status: "pending" }] };
			const { service, mock } = createService([
				{ method: "GET", path: "/v1/ontology/engine/runs", body },
			]);

			const result = await service.generation.suggestions();

			expect(result.data).toHaveLength(1);
			mock.expectCalled("GET", "/v1/ontology/engine/runs");
		});
	});

	describe("acceptSuggestion()", () => {
		it("accepts a suggestion", async () => {
			const body = { id: "sug_1", status: "accepted" };
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/runs", body },
			]);

			const result = await service.generation.acceptSuggestion("sug_1");

			expect(result.status).toBe("accepted");
			mock.expectCalled("POST", "/v1/ontology/engine/runs");
		});
	});

	describe("rejectSuggestion()", () => {
		it("rejects a suggestion with reason", async () => {
			const body = { id: "sug_1", status: "rejected" };
			const { service, mock } = createService([
				{ method: "POST", path: "/v1/ontology/engine/runs", body },
			]);

			const result = await service.generation.rejectSuggestion(
				"sug_1",
				"Not relevant",
			);

			expect(result.status).toBe("rejected");
			mock.expectCalledWith("POST", "/v1/ontology/engine/runs", {
				reason: "Not relevant",
			});
		});
	});
});

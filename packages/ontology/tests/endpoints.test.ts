import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { OntologySdk } from "../src/sdk";

// Generated endpoint-contract table: every public method must issue the
// expected HTTP method + path. Regenerate with scratchpad/gen-endpoint-tests.py
// when the SDK surface changes.
const { http, mock } = createTestHttpClient(catchAllRoutes());
const sdk = new OntologySdk(http);

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  [
    "sdk.engine.generate",
    () => sdk.engine.generate({}),
    "POST",
    /\/ontology\/engine\/ontologies\/generate$/,
  ],
  [
    "sdk.engine.validate",
    () => sdk.engine.validate({}),
    "POST",
    /\/ontology\/engine\/ontologies\/validate$/,
  ],
  [
    "sdk.engine.export",
    () => sdk.engine.export({}),
    "POST",
    /\/ontology\/engine\/ontologies\/export$/,
  ],
  [
    "sdk.engine.exportShacl",
    () => sdk.engine.exportShacl({}),
    "POST",
    /\/ontology\/engine\/ontologies\/export-shacl$/,
  ],
  [
    "sdk.engine.inferClasses",
    () => sdk.engine.inferClasses({}),
    "POST",
    /\/ontology\/engine\/ontologies\/infer-classes$/,
  ],
  [
    "sdk.engine.inferProperties",
    () => sdk.engine.inferProperties({}),
    "POST",
    /\/ontology\/engine\/ontologies\/infer-properties$/,
  ],
  [
    "sdk.engine.compareVersions",
    () => sdk.engine.compareVersions({}),
    "POST",
    /\/ontology\/engine\/ontologies\/compare-versions$/,
  ],
  [
    "sdk.objects.listObjectTypes",
    () => sdk.objects.listObjectTypes({}),
    "GET",
    /\/ontology\/objects\/object-types$/,
  ],
  [
    "sdk.objects.getObjectType",
    () => sdk.objects.getObjectType("r_1"),
    "GET",
    /\/ontology\/objects\/object-types\/[^/]+$/,
  ],
  [
    "sdk.objects.putObjectType",
    () => sdk.objects.putObjectType("r_1", {}),
    "PUT",
    /\/ontology\/objects\/object-types\/[^/]+$/,
  ],
  [
    "sdk.objects.deleteObjectType",
    () => sdk.objects.deleteObjectType("r_1"),
    "DELETE",
    /\/ontology\/objects\/object-types\/[^/]+$/,
  ],
  [
    "sdk.objects.listObjects",
    () => sdk.objects.listObjects({}),
    "GET",
    /\/ontology\/objects\/objects$/,
  ],
  [
    "sdk.objects.getObject",
    () => sdk.objects.getObject("r_1"),
    "GET",
    /\/ontology\/objects\/objects\/[^/]+$/,
  ],
  [
    "sdk.objects.putObject",
    () => sdk.objects.putObject("r_1", {}),
    "PUT",
    /\/ontology\/objects\/objects\/[^/]+$/,
  ],
  [
    "sdk.objects.deleteObject",
    () => sdk.objects.deleteObject("r_1"),
    "DELETE",
    /\/ontology\/objects\/objects\/[^/]+$/,
  ],
  [
    "sdk.relationships.listTypes",
    () => sdk.relationships.listTypes({}),
    "GET",
    /\/ontology\/relationships\/relationship-types$/,
  ],
  [
    "sdk.relationships.deleteType",
    () => sdk.relationships.deleteType("r_1"),
    "DELETE",
    /\/ontology\/relationships\/relationship-types\/[^/]+$/,
  ],
  [
    "sdk.relationships.list",
    () => sdk.relationships.list({}),
    "GET",
    /\/ontology\/relationships\/relationships$/,
  ],
  [
    "sdk.relationships.get",
    () => sdk.relationships.get("r_1"),
    "GET",
    /\/ontology\/relationships\/relationships\/[^/]+$/,
  ],
  [
    "sdk.relationships.put",
    () => sdk.relationships.put("r_1", {}),
    "PUT",
    /\/ontology\/relationships\/relationships\/[^/]+$/,
  ],
  [
    "sdk.relationships.delete",
    () => sdk.relationships.delete("r_1"),
    "DELETE",
    /\/ontology\/relationships\/relationships\/[^/]+$/,
  ],
  [
    "sdk.schemas.list",
    () => sdk.schemas.list({}),
    "GET",
    /\/ontology\/schemas\/schemas$/,
  ],
  [
    "sdk.schemas.create",
    () => sdk.schemas.create({}),
    "POST",
    /\/ontology\/schemas\/schemas$/,
  ],
  [
    "sdk.schemas.validate",
    () => sdk.schemas.validate({}),
    "POST",
    /\/ontology\/schemas\/schemas\/validate$/,
  ],
  [
    "sdk.schemas.get",
    () => sdk.schemas.get("r_1"),
    "GET",
    /\/ontology\/schemas\/schemas\/[^/]+$/,
  ],
  [
    "sdk.schemas.delete",
    () => sdk.schemas.delete("r_1"),
    "DELETE",
    /\/ontology\/schemas\/schemas\/[^/]+$/,
  ],
  [
    "sdk.versions.create",
    () => sdk.versions.create({}),
    "POST",
    /\/ontology\/versions\/versions$/,
  ],
  [
    "sdk.versions.compare",
    () => sdk.versions.compare({}),
    "POST",
    /\/ontology\/versions\/versions\/compare$/,
  ],
  [
    "sdk.versions.get",
    () => sdk.versions.get("r_1"),
    "GET",
    /\/ontology\/versions\/versions\/[^/]+$/,
  ],
  [
    "sdk.versions.delete",
    () => sdk.versions.delete("r_1"),
    "DELETE",
    /\/ontology\/versions\/versions\/[^/]+$/,
  ],
  [
    "sdk.versions.auditVerify",
    () => sdk.versions.auditVerify({}),
    "POST",
    /\/ontology\/versions\/audit\/verify$/,
  ],
  [
    "sdk.versions.listReleaseBundles",
    () => sdk.versions.listReleaseBundles({}),
    "GET",
    /\/ontology\/versions\/release-bundles$/,
  ],
  [
    "sdk.versions.createReleaseBundle",
    () => sdk.versions.createReleaseBundle({}),
    "POST",
    /\/ontology\/versions\/release-bundles$/,
  ],
  [
    "sdk.versions.getReleaseBundle",
    () => sdk.versions.getReleaseBundle("r_1"),
    "GET",
    /\/ontology\/versions\/release-bundles\/[^/]+$/,
  ],
  [
    "sdk.validation.validatePayload",
    () => sdk.validation.validatePayload({}),
    "POST",
    /\/ontology\/validation\/payloads\/validate$/,
  ],
  [
    "sdk.validation.listRules",
    () => sdk.validation.listRules({}),
    "GET",
    /\/ontology\/validation\/rules$/,
  ],
  [
    "sdk.validation.createRule",
    () => sdk.validation.createRule({}),
    "POST",
    /\/ontology\/validation\/rules$/,
  ],
  [
    "sdk.validation.getRule",
    () => sdk.validation.getRule("r_1"),
    "GET",
    /\/ontology\/validation\/rules\/[^/]+$/,
  ],
  [
    "sdk.validation.deleteRule",
    () => sdk.validation.deleteRule("r_1"),
    "DELETE",
    /\/ontology\/validation\/rules\/[^/]+$/,
  ],
  [
    "sdk.transformations.create",
    () => sdk.transformations.create({}),
    "POST",
    /\/ontology\/transformations\/transformations$/,
  ],
  [
    "sdk.reasoning.explain",
    () => sdk.reasoning.explain({}),
    "POST",
    /\/ontology\/reasoning\/explain$/,
  ],
  [
    "sdk.reasoning.facts",
    () => sdk.reasoning.facts({}),
    "POST",
    /\/ontology\/reasoning\/facts$/,
  ],
  [
    "sdk.reasoning.loadFactsGraph",
    () => sdk.reasoning.loadFactsGraph({}),
    "POST",
    /\/ontology\/reasoning\/facts\/load-graph$/,
  ],
  [
    "sdk.reasoning.reasonForward",
    () => sdk.reasoning.reasonForward({}),
    "POST",
    /\/ontology\/reasoning\/reason\/forward$/,
  ],
  [
    "sdk.reasoning.reasonBackward",
    () => sdk.reasoning.reasonBackward({}),
    "POST",
    /\/ontology\/reasoning\/reason\/backward$/,
  ],
  [
    "sdk.reasoning.listRules",
    () => sdk.reasoning.listRules({}),
    "GET",
    /\/ontology\/reasoning\/rules$/,
  ],
  [
    "sdk.reasoning.createRule",
    () => sdk.reasoning.createRule({}),
    "POST",
    /\/ontology\/reasoning\/rules$/,
  ],
  [
    "sdk.reasoning.updateRule",
    () => sdk.reasoning.updateRule("r_1", {}),
    "PUT",
    /\/ontology\/reasoning\/rules\/[^/]+$/,
  ],
  [
    "sdk.reasoning.deleteRule",
    () => sdk.reasoning.deleteRule("r_1"),
    "DELETE",
    /\/ontology\/reasoning\/rules\/[^/]+$/,
  ],
  [
    "sdk.rollouts.list",
    () => sdk.rollouts.list({}),
    "GET",
    /\/ontology\/rollouts\/rollouts$/,
  ],
  [
    "sdk.rollouts.create",
    () => sdk.rollouts.create({}),
    "POST",
    /\/ontology\/rollouts\/rollouts$/,
  ],
  [
    "sdk.rollouts.get",
    () => sdk.rollouts.get("r_1"),
    "GET",
    /\/ontology\/rollouts\/rollouts\/[^/]+$/,
  ],
  [
    "sdk.rollouts.update",
    () => sdk.rollouts.update("r_1", {}),
    "PUT",
    /\/ontology\/rollouts\/rollouts\/[^/]+$/,
  ],
  [
    "sdk.rollouts.delete",
    () => sdk.rollouts.delete("r_1"),
    "DELETE",
    /\/ontology\/rollouts\/rollouts\/[^/]+$/,
  ],
  [
    "sdk.rollouts.start",
    () => sdk.rollouts.start("r_1", {}),
    "POST",
    /\/ontology\/rollouts\/rollouts\/[^/]+\/start$/,
  ],
  [
    "sdk.rollouts.pause",
    () => sdk.rollouts.pause("r_1", {}),
    "POST",
    /\/ontology\/rollouts\/rollouts\/[^/]+\/pause$/,
  ],
  [
    "sdk.rollouts.resume",
    () => sdk.rollouts.resume("r_1", {}),
    "POST",
    /\/ontology\/rollouts\/rollouts\/[^/]+\/resume$/,
  ],
  [
    "sdk.rollouts.rollback",
    () => sdk.rollouts.rollback("r_1", {}),
    "POST",
    /\/ontology\/rollouts\/rollouts\/[^/]+\/rollback$/,
  ],
  [
    "sdk.rollouts.status",
    () => sdk.rollouts.status("r_1"),
    "GET",
    /\/ontology\/rollouts\/rollouts\/[^/]+\/status$/,
  ],
  [
    "sdk.rollups.list",
    () => sdk.rollups.list({}),
    "GET",
    /\/ontology\/rollups\/rollups$/,
  ],
  [
    "sdk.rollups.create",
    () => sdk.rollups.create({}),
    "POST",
    /\/ontology\/rollups\/rollups$/,
  ],
  [
    "sdk.rollups.get",
    () => sdk.rollups.get("r_1"),
    "GET",
    /\/ontology\/rollups\/rollups\/[^/]+$/,
  ],
  [
    "sdk.rollups.update",
    () => sdk.rollups.update("r_1", {}),
    "PUT",
    /\/ontology\/rollups\/rollups\/[^/]+$/,
  ],
  [
    "sdk.rollups.delete",
    () => sdk.rollups.delete("r_1"),
    "DELETE",
    /\/ontology\/rollups\/rollups\/[^/]+$/,
  ],
  [
    "sdk.rollups.execute",
    () => sdk.rollups.execute("r_1", {}),
    "POST",
    /\/ontology\/rollups\/rollups\/[^/]+\/execute$/,
  ],
  [
    "sdk.rollups.preview",
    () => sdk.rollups.preview("r_1", {}),
    "POST",
    /\/ontology\/rollups\/rollups\/[^/]+\/preview$/,
  ],
  [
    "sdk.rollups.result",
    () => sdk.rollups.result("r_1"),
    "GET",
    /\/ontology\/rollups\/rollups\/[^/]+\/result$/,
  ],
  [
    "sdk.rollups.executionResult",
    () => sdk.rollups.executionResult("r_1"),
    "GET",
    /\/ontology\/rollups\/rollup-results\/[^/]+$/,
  ],
  [
    "sdk.extract.analyze",
    () => sdk.extract.analyze({}),
    "POST",
    /\/ontology\/extract\/extract\/analyze$/,
  ],
  [
    "sdk.extract.architecture",
    () => sdk.extract.architecture({}),
    "POST",
    /\/ontology\/extract\/extract\/architecture$/,
  ],
  [
    "sdk.extract.coreferences",
    () => sdk.extract.coreferences({}),
    "POST",
    /\/ontology\/extract\/extract\/coreferences$/,
  ],
  [
    "sdk.extract.entities",
    () => sdk.extract.entities({}),
    "POST",
    /\/ontology\/extract\/extract\/entities$/,
  ],
  [
    "sdk.extract.events",
    () => sdk.extract.events({}),
    "POST",
    /\/ontology\/extract\/extract\/events$/,
  ],
  [
    "sdk.extract.relations",
    () => sdk.extract.relations({}),
    "POST",
    /\/ontology\/extract\/extract\/relations$/,
  ],
  [
    "sdk.extract.triplets",
    () => sdk.extract.triplets({}),
    "POST",
    /\/ontology\/extract\/extract\/triplets$/,
  ],
  [
    "sdk.events.list",
    () => sdk.events.list({}),
    "GET",
    /\/ontology\/events\/events$/,
  ],
  [
    "sdk.events.create",
    () => sdk.events.create({}),
    "POST",
    /\/ontology\/events\/events$/,
  ],
  [
    "sdk.events.get",
    () => sdk.events.get("r_1"),
    "GET",
    /\/ontology\/events\/events\/[^/]+$/,
  ],
  [
    "sdk.events.createCheckpoint",
    () => sdk.events.createCheckpoint({}),
    "POST",
    /\/ontology\/events\/events\/checkpoints$/,
  ],
  [
    "sdk.events.getCheckpoint",
    () => sdk.events.getCheckpoint("r_1"),
    "GET",
    /\/ontology\/events\/events\/checkpoints\/[^/]+$/,
  ],
  [
    "sdk.events.acquireLease",
    () => sdk.events.acquireLease({}),
    "POST",
    /\/ontology\/events\/events\/leases\/acquire$/,
  ],
  [
    "sdk.events.acknowledgeLease",
    () => sdk.events.acknowledgeLease({}),
    "POST",
    /\/ontology\/events\/events\/leases\/acknowledge$/,
  ],
];

describe("OntologySdk endpoints", () => {
  it.each(cases)("%s → %s", async (_label, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });
});

import { Frontal } from "@frontal-labs/sdk";

/**
 * CRM → ontology → lineage:
 *   1. define a scheduled pipeline that collects, normalizes and upserts into
 *      the ontology
 *   2. trigger it once and wait for the run
 *   3. list ontology objects and trace lineage for one of the written entities
 */
export async function run(f: Frontal) {
  const pipeline = await f.pipelines
    .define("crm-sync")
    .description("Sync CRM contacts into the ontology")
    .fromSchedule("0 * * * *")
    .collect("fetch-crm", { source: "salesforce", object: "Contact" })
    .transform("normalize", { mapping: { Email: "email", Name: "name" } })
    .validate("require-email", { required: ["email"] })
    .write("upsert-ontology", { target: "ontology", entityType: "customer" })
    .create();

  const pipelineRun = await f.pipelines.use(pipeline.id).trigger({ dryRun: false });

  const customers = await f.ontology.objects.listObjects({ limit: 5 });
  const first = customers.data[0] as { id: string } | undefined;
  const lineage = first ? await f.lineage.nodes.trace(first.id) : undefined;

  return {
    pipelineId: pipeline.id,
    runId: pipelineRun.id,
    customers: customers.data.length,
    lineageNodes: lineage?.nodes.length ?? 0,
  };
}

if (import.meta.main) {
  const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
  console.log(await run(f));
}

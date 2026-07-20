/**
 * Read datasets, submit ingestion, resolve schemas, and browse the catalog.
 *
 * Datasets are served by the Data platform's ingest (`/v1/data/ingest/*`) and
 * catalog (`/v1/data/catalog/*`) services.
 */
import { createDatasetsClient } from "@frontal-labs/datasets";

const datasets = createDatasetsClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("📥 Submitting ingestion request...");
  const run = await datasets.ingest({
    dataset: "user_events",
    source: "events-topic",
  });
  console.log(`✅ Ingestion run: ${run.runId}`);

  console.log("\n📚 Listing datasets...");
  const page = await datasets.list({ limit: 20 });
  console.log(`✅ ${page.data.length} dataset(s)`);

  console.log("\n🔎 Reading a dataset...");
  const ds = await datasets.get("user_events");
  console.log(`✅ ${ds.name}: ${ds.rowCount} rows`);

  console.log("\n🧬 Resolving schemas...");
  const schemas = await datasets.schemas.list();
  console.log(`✅ ${schemas.data.length} schema(s)`);

  console.log("\n🗂️  Browsing the catalog...");
  const catalogDatasets = await datasets.catalog.datasets.list();
  const sources = await datasets.catalog.sources.list();
  console.log(
    `✅ ${catalogDatasets.data.length} catalog dataset(s), ${sources.data.length} source(s)`
  );

  console.log("\n🎉 Complete!");
}

main().catch(console.error);

/**
 * A/B experiments with variants and result analysis.
 */
import { createFlagsClient } from "@frontal-labs/flags";

const flags = createFlagsClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("🧪 Running feature experiment...");
  const flag = await flags.flags.create({
    key: "search-algorithm",
    name: "Search Algorithm",
    type: "string",
    default_value: "bm25",
  });
  console.log(`✅ Flag: ${flag.key}`);

  const exp = await flags.experiments.create({
    flag_id: flag.id,
    name: "Search Ranking Test",
    description: "Compare BM25 vs neural ranking",
    variants: [
      { name: "control", value: "bm25", percentage: 50 },
      { name: "treatment", value: "neural", percentage: 50 },
    ],
  });
  console.log(`✅ Experiment created: ${exp.name}`);

  await flags.experiments.start(exp.id);
  console.log("▶️  Experiment running...");

  await flags.experiments.stop(exp.id);
  console.log("⏹️  Experiment stopped");

  const results = await flags.experiments.results(exp.id);
  console.log("📊 Results:");
  for (const v of results.variants) {
    console.log(`   ${v.name}: sample=${v.sample_size}, conversion=${v.conversion_rate}`);
  }

  await flags.flags.delete(flag.id);
  console.log("\n🎉 Complete!");
}

main();

/**
 * Lineage graph exploration, node/edge listing, and impact analysis.
 */
import { createLineageClient } from "@frontal-labs/lineage";

const lineage = createLineageClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("🕸️  Fetching lineage graph for dataset ds_sales...");
  const graph = await lineage.graph.get("ds_sales", { depth: 3 });
  console.log(`✅ Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  for (const node of graph.nodes) {
    console.log(`   [${node.type}] ${node.name}`);
  }
  for (const edge of graph.edges) {
    console.log(`   ${edge.source_id} → [${edge.type}] → ${edge.target_id}`);
  }

  console.log("\n📋 Listing lineage nodes...");
  const nodes = await lineage.nodes.list({ type: "dataset" });
  for await (const node of nodes) {
    console.log(`   - ${node.name} (${node.type})`);
  }

  console.log("\n🔍 Tracing dataset lineage...");
  const trace = await lineage.nodes.trace("ds_sales");
  console.log(`✅ Full trace: ${trace.nodes.length} nodes`);

  console.log("\n⚠️  Analyzing impact of schema change...");
  const impact = await lineage.impact.analyzeChange("ds_sales", {
    type: "update",
    field: "amount",
  });
  console.log(`   ${impact.affected_resources.length} resource(s) affected:`);
  for (const r of impact.affected_resources) {
    console.log(`   - ${r.name} (${r.type}): ${r.impact} impact`);
  }

  console.log("\n🎉 Complete!");
}

main();

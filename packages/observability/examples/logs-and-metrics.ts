/**
 * Log querying, ingestion, and metric series retrieval.
 */
import { createObservabilityClient } from "@frontal-labs/observability";

const obs = createObservabilityClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("📋 Querying logs...");
  const logs = await obs.logs.query({
    query: "level:error",
    time_from: new Date(Date.now() - 3600000).toISOString(),
    time_to: new Date().toISOString(),
    limit: 50,
  });
  console.log(`✅ Found ${logs.data.length} error log(s)`);
  for await (const entry of logs) {
    console.log(`   [${entry.level}] ${entry.service}: ${entry.message}`);
  }

  console.log("\n📥 Ingesting custom logs...");
  const ingested = await obs.logs.ingest([
    { timestamp: new Date().toISOString(), level: "info", service: "my-app", message: "Deployment completed" },
  ]);
  console.log(`✅ Ingested ${ingested.ingested} log entry(s)`);

  console.log("\n📊 Querying metrics...");
  const metrics = await obs.metrics.query("cpu_usage", {
    from: new Date(Date.now() - 3600000).toISOString(),
    to: new Date().toISOString(),
    granularity: "1m",
  });
  console.log(`✅ Metric: ${metrics.metric} (${metrics.data.length} data points)`);

  const metricList = await obs.metrics.listMetrics();
  console.log(`   ${metricList.data.length} metric(s) available`);
  console.log("\n🎉 Complete!");
}

main();

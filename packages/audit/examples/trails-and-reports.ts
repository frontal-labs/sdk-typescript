/**
 * Audit event logging, querying, trail management, and report generation.
 */
import { createAuditClient } from "@frontal-labs/audit";

const audit = createAuditClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("📝 Logging audit events...");
  const event = await audit.log({
    action: "pipeline.triggered",
    resource: { type: "pipeline", id: "ppl_abc" },
    metadata: { triggered_by: "schedule", schedule_id: "sch_1" },
    status: "success",
  });
  console.log(`✅ Event logged: ${event.id}`);

  console.log("\n🔍 Querying audit trail...");
  const results = await audit.query({
    action: "pipeline.triggered",
    time_from: new Date(Date.now() - 86400000).toISOString(),
    time_to: new Date().toISOString(),
  });
  console.log(`✅ Found ${results.data.length} event(s)`);
  for await (const evt of results) {
    console.log(`   [${evt.status}] ${evt.action} on ${evt.resource.type}/${evt.resource.id}`);
  }

  console.log("\n📥 Exporting audit log...");
  const exportResult = await audit.export({ format: "csv" });
  console.log(`✅ Download: ${exportResult.download_url}`);

  console.log("\n📋 Managing audit trails...");
  const trail = await audit.trails.create({ name: "Pipeline Activity", filter: { action: "pipeline.*" } });
  const trails = await audit.trails.list();
  console.log(`✅ ${trails.data.length} trail(s) configured`);

  console.log("\n✅ Running compliance check...");
  const check = await audit.compliance.runCheck({ check_id: "soc2-access-review", scope: { period: "2025-Q1" } });
  console.log(`   Passed: ${check.passed}`);

  await audit.trails.delete(trail.id as string);
  console.log("\n🎉 Complete!");
}

main();

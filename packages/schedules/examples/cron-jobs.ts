/**
 * Cron schedule creation, run tracking, and cron expression validation.
 */
import { createSchedulesClient } from "@frontal-labs/schedules";

const schedules = createSchedulesClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("🕐 Validating cron expression...");
  const valid = await schedules.cron.validate("0 9 * * 1-5");
  console.log(`   "0 9 * * 1-5" valid: ${valid.valid}`);

  console.log('\n📅 Next 5 runs for "0 */6 * * *"...');
  const nextRuns = await schedules.cron.nextRuns("0 */6 * * *", 5);
  for (const run of nextRuns.runs) {
    console.log(`   → ${run}`);
  }

  console.log("\n📋 Creating scheduled job...");
  const schedule = await schedules.schedules.create({
    name: "Nightly Data Export",
    cron: "0 2 * * *",
    timezone: "America/New_York",
    target: { type: "pipeline", id: "ppl_export" },
    payload: { format: "parquet", destination: "s3://data-lake/exports/" },
  });
  console.log(`✅ Schedule: ${schedule.name} (${schedule.cron})`);

  console.log("\n⚡ Triggering manual run...");
  const run = await schedules.schedules.trigger(schedule.id);
  console.log(`✅ Run started: ${run.id} [${run.status}]`);

  console.log("\n📜 Recent runs...");
  const runs = await schedules.runs.list(schedule.id);
  for await (const r of runs) {
    console.log(`   - ${r.id}: ${r.status} (${r.started_at})`);
  }

  await schedules.schedules.pause(schedule.id);
  console.log("⏸️  Schedule paused");
  await schedules.schedules.resume(schedule.id);
  console.log("▶️  Schedule resumed");

  await schedules.schedules.delete(schedule.id);
  console.log("\n🎉 Complete!");
}

main();

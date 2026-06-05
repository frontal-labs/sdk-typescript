/**
 * Flag evaluation with context, targeting rules, and gradual rollouts.
 */
import { createFlagsClient } from "@frontal-labs/flags";

const flags = createFlagsClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("🚩 Creating feature flag...");
  const flag = await flags.flags.create({
    key: "new-dashboard",
    name: "New Dashboard UI",
    type: "boolean",
    default_value: false,
  });
  console.log(`✅ Flag created: ${flag.key}`);

  const result = await flags.evaluate("new-dashboard", {
    user_id: "usr_abc",
    attributes: { beta_tester: true, region: "us-east" },
  });
  console.log(`✅ Evaluation: ${result.value} (${result.reason})`);

  const bulk = await flags.evaluateBulk(
    ["new-dashboard", "dark-mode"],
    { organization_id: "org_123" }
  );
  for (const [key, evalResult] of Object.entries(bulk)) {
    console.log(`   ${key}: ${evalResult.value} (${evalResult.reason})`);
  }

  console.log("\n📈 Creating rollout...");
  const rollout = await flags.rollouts.create(flag.id, { percentage: 25, value: true });
  console.log(`✅ Rollout: ${rollout.percentage}% → ${rollout.value}`);

  await flags.rollouts.pause(flag.id, rollout.id);
  console.log("⏸️  Rollout paused");

  await flags.rollouts.resume(flag.id, rollout.id);
  console.log("▶️  Rollout resumed");

  await flags.flags.delete(flag.id);
  console.log("\n🎉 Complete!");
}

main();

/**
 * Policy management, evaluation, and RBAC access checks.
 */
import { createGovernanceClient } from "@frontal-labs/governance";

const gov = createGovernanceClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("📜 Creating access policy...");
  const policy = await gov.policies.create({
    name: "No public dataset access",
    rules: [{
      id: "rule_1",
      resource: "datasets.*",
      actions: ["read", "export"],
      effect: "deny" as const,
      conditions: { "resource.visibility": "public" },
    }],
    enabled: true,
    priority: 10,
  });
  console.log(`✅ Policy: ${policy.name} (priority ${policy.priority})`);

  console.log("\n🔍 Evaluating policy...");
  const evalResult = await gov.evaluatePolicy(policy.id, {
    user_id: "usr_abc",
    resource: { type: "dataset", id: "ds_1", visibility: "public" },
  });
  console.log(`   Passed: ${evalResult.passed}`);

  await gov.policies.disable(policy.id);
  console.log("⏸️  Policy disabled");
  await gov.policies.enable(policy.id);
  console.log("▶️  Policy enabled");

  console.log("\n🔑 RBAC access check...");
  const access = await gov.rbac.checkAccess({
    user_id: "usr_abc",
    resource: "pipelines.ppl_1",
    action: "update",
  });
  console.log(`   Allowed: ${access.allowed}`);

  const binding = await gov.rbac.createBinding({
    user_id: "usr_abc",
    role: "pipeline-operator",
    resource: "pipelines.ppl_1",
  });
  console.log(`✅ Binding created: ${binding.id}`);

  await gov.rbac.deleteBinding(binding.id);
  await gov.policies.delete(policy.id);
  console.log("\n🎉 Complete!");
}

main();

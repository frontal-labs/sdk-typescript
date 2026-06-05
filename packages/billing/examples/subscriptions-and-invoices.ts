/**
 * Plan listing, subscription management, invoice retrieval, and usage reporting.
 */
import { createBillingClient } from "@frontal-labs/billing";

const billing = createBillingClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("💳 Available plans...");
  const plans = await billing.plans.list();
  for (const p of plans.data) {
    console.log(`   - ${p.name}: ${p.price} ${p.currency}/${p.interval}`);
  }

  console.log("\n📋 Current subscription...");
  const sub = await billing.subscriptions.get();
  console.log(`✅ Status: ${sub.status}, Plan: ${sub.plan_id}`);

  if (plans.data.length > 1) {
    const nextPlan = plans.data.find(p => p.id !== sub.plan_id);
    if (nextPlan) {
      const updated = await billing.subscriptions.update({ plan_id: nextPlan.id });
      console.log(`✅ Changed to ${updated.plan_id}`);
    }
  }

  console.log("\n🧾 Recent invoices...");
  const invoices = await billing.invoices.list();
  for await (const inv of invoices) {
    console.log(`   - ${inv.id}: ${inv.amount} ${inv.currency} [${inv.status}]`);
  }

  console.log("\n📊 Reporting usage...");
  await billing.usage.report([
    { metric: "api_calls", quantity: 15000 },
    { metric: "storage_gb", quantity: 42.5 },
  ]);
  console.log("✅ Usage reported");

  console.log("\n💳 Payment methods...");
  const methods = await billing.paymentMethods.list();
  console.log(`   ${methods.data.length} method(s) on file`);
  for (const pm of methods.data) {
    console.log(`   - ${pm.type} ending in ${pm.last_four} ${pm.is_default ? "(default)" : ""}`);
  }

  console.log("\n🎉 Complete!");
}

main();

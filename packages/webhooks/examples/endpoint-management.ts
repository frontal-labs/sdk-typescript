/**
 * Webhook endpoint CRUD, secret rotation, delivery tracking, and stats.
 */
import { createWebhooksClient } from "@frontal-labs/webhooks";

const webhooks = createWebhooksClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("🔗 Creating webhook endpoint...");
  const endpoint = await webhooks.endpoints.create({
    url: "https://hooks.myapp.com/frontal-events",
    events: ["order.created", "payment.completed"],
  });
  console.log(`✅ Endpoint created: ${endpoint.id}`);

  console.log("\n🔐 Rotating webhook secret...");
  const rotated = await webhooks.endpoints.rotateSecret(endpoint.id);
  console.log(`✅ New secret: ${rotated.secret.slice(0, 12)}...`);

  console.log("\n📬 Recent deliveries...");
  const deliveries = await webhooks.deliveries.list({ webhook_id: endpoint.id, status: "failed" });
  console.log(`   ${deliveries.data.length} failed delivery(ies)`);
  for await (const del of deliveries) {
    console.log(`   - ${del.event_id}: ${del.status}`);
    await webhooks.deliveries.retry(del.id);
    console.log("     Retried");
  }

  console.log("\n📊 Endpoint stats...");
  const stats = await webhooks.stats.getStats({ webhook_id: endpoint.id });
  console.log(`   Success rate: ${(stats.success_rate * 100).toFixed(1)}%`);
  console.log(`   Avg latency: ${stats.avg_latency_ms}ms`);

  await webhooks.endpoints.delete(endpoint.id);
  console.log("\n🎉 Complete!");
}

main();

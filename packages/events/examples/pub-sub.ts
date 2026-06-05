/**
 * Publish events, subscribe to topics, and manage subscriptions.
 */
import { createEventsClient } from "@frontal-labs/events";

const events = createEventsClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("📡 Creating topic...");
  const topic = await events.topics.create({
    name: "orders.created",
    description: "Fired when a new order is placed",
  });
  console.log(`✅ Topic created: ${topic.name}`);

  console.log("\n📤 Publishing events...");
  const published = await events.publish("orders.created", [
    { source: "orders-service", type: "order.created", data: { order_id: "ord_1234", amount: 99.99, currency: "USD" }, metadata: { user_id: "usr_abc" } },
  ]);
  console.log(`✅ Published ${published.published} event(s)`);

  console.log("\n🔔 Creating subscription...");
  const sub = await events.subscribe("orders.created", {
    endpoint: "https://hooks.myapp.com/orders",
    filter: "event.data.amount > 50",
  });
  console.log(`✅ Subscription active: ${sub.id}`);

  await events.subscriptions.pause(sub.id);
  console.log("⏸️  Subscription paused");

  await events.subscriptions.resume(sub.id);
  console.log("▶️  Subscription resumed");

  await events.unsubscribe(sub.id);
  await events.topics.delete(topic.id);
  console.log("\n🎉 Complete!");
}

main();

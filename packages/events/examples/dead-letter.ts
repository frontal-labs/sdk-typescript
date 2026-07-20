/**
 * Replaying previously-published (e.g. failed) events via the replays resource.
 */
import { createEventsClient } from "@frontal-labs/events";

const events = createEventsClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("📦 Listing replays...");
  const replays = await events.replays.list({ limit: 25 });
  console.log(`✅ Found ${replays.data.length} replay(s)`);

  console.log("\n♻️  Creating a replay for a topic...");
  const replay = await events.replays.create({ topic: "orders.created" });
  console.log("✅ Replay queued:", replay.id);

  console.log("\n🎉 Complete!");
}

main();

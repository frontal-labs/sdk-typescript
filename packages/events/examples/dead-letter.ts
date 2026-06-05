/**
 * Dead-letter queue inspection, replay, and purge.
 */
import { createEventsClient } from "@frontal-labs/events";

const events = createEventsClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("📦 Dead-letter queue management...");
  const dlq = await events.deadLetter.list({ limit: 25 });
  console.log(`✅ Found ${dlq.data.length} dead-letter event(s)`);

  for await (const evt of dlq) {
    console.log(`   - ${evt.event.type} (attempts: ${evt.attempts}) — ${evt.error}`);
  }

  if (dlq.data.length > 0) {
    await events.deadLetter.replay(dlq.data[0].id);
    console.log("✅ Replayed event:", dlq.data[0].id);
  }

  console.log("\n🎉 Complete!");
}

main();

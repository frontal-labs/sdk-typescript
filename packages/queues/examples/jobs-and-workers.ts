/**
 * Queue management, job enqueue/retry, pausing queues.
 */
import { createQueuesClient } from "@frontal-labs/queues";

const queues = createQueuesClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("📬 Creating queue...");
  const queue = await queues.queues.create({
    name: "email-notifications",
    max_concurrency: 5,
  });
  console.log(`✅ Queue: ${queue.name}`);

  console.log("\n📤 Enqueuing jobs...");
  const job1 = await queues.jobs.enqueue(queue.id, {
    to: "user@example.com",
    template: "welcome",
    data: { name: "Alice" },
  });
  console.log(`✅ Job enqueued: ${job1.id}`);

  console.log("\n📋 Job status...");
  const pending = await queues.jobs.list(queue.id, { status: "pending" });
  for await (const j of pending) {
    console.log(`   - ${j.id}: ${j.status} (attempt ${j.attempts}/${j.max_attempts})`);
  }

  await queues.queues.pause(queue.id);
  console.log("⏸️  Queue paused");
  await queues.queues.resume(queue.id);
  console.log("▶️  Queue resumed");

  await queues.jobs.cancel(queue.id, job1.id);
  await queues.queues.delete(queue.id);
  console.log("\n🎉 Complete!");
}

main();

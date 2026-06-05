/**
 * Dataset CRUD, data insert/query, versioning, and rollback.
 */
import { createDatasetsClient } from "@frontal-labs/datasets";

const datasets = createDatasetsClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("📊 Creating dataset...");
  const ds = await datasets.datasets.create({ name: "user_events", description: "User interaction events" });
  console.log(`✅ Dataset: ${ds.name}`);

  console.log("\n📝 Inserting rows...");
  const inserted = await datasets.data.insert(ds.id, [
    { user_id: "usr_1", event: "page_view", page: "/home" },
    { user_id: "usr_2", event: "click", element: "signup" },
    { user_id: "usr_1", event: "purchase", amount: 49.99 },
  ]);
  console.log(`✅ Inserted ${inserted.inserted} row(s)`);

  console.log("\n🔍 Querying data...");
  const results = await datasets.data.query(ds.id, { where: { event: "purchase" }, limit: 10 });
  console.log(`✅ Found ${results.data.length} row(s)`);
  for (const row of results.data) {
    console.log(`   ${JSON.stringify(row)}`);
  }

  console.log("\n📦 Creating version...");
  const version = await datasets.versions.create(ds.id);
  console.log(`✅ Version ${version.version} (${version.row_count} rows)`);

  const diff = await datasets.versions.compare(ds.id, "1", "2");
  console.log(`   Diff v1→v2: +${diff.additions} -${diff.deletions} ~${diff.changes}`);

  console.log("\n📈 Dataset stats...");
  const stats = await datasets.stats.get(ds.id);
  console.log(`   Rows: ${stats.row_count}, Size: ${(stats.storage_size_bytes / 1024).toFixed(1)} KB`);

  await datasets.datasets.delete(ds.id);
  console.log("\n🎉 Complete!");
}

main();

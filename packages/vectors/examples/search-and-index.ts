/**
 * Vector index management, upsert, similarity search, and hybrid search.
 */
import { createVectorsClient } from "@frontal-labs/vectors";

const vectors = createVectorsClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("🧮 Creating vector index...");
  const index = await vectors.indexes.create({
    name: "products",
    dimensions: 1536,
    metric: "cosine",
  });
  console.log(`✅ Index: ${index.name} (${index.dimensions}d, ${index.metric})`);

  console.log("\n📥 Upserting vectors...");
  const dims = Array.from({ length: 8 }, () => Math.random());
  const upserted = await vectors.vectors.upsert(index.id, [
    { id: "prod_1", values: dims, metadata: { name: "Red Shoes", price: 59.99 } },
    { id: "prod_2", values: dims, metadata: { name: "Blue Sneakers", price: 79.99 } },
  ]);
  console.log(`✅ Inserted ${upserted.inserted} vector(s)`);

  console.log("\n🔍 Similarity search...");
  const results = await vectors.search.search(index.id, { vector: dims, top_k: 2 });
  for (const r of results.results) {
    console.log(`   score=${r.score.toFixed(4)} id=${r.vector_id}`);
  }

  console.log("\n🔍 Hybrid search...");
  const hybrid = await vectors.search.hybridSearch(index.id, {
    vector: dims, text: "red shoes", top_k: 2,
  });
  for (const r of hybrid.results) {
    console.log(`   score=${r.score.toFixed(4)} id=${r.vector_id}`);
  }

  await vectors.indexes.delete(index.id);
  console.log("\n🎉 Complete!");
}

main();

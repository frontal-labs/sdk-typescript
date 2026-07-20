import { FrontalClient } from "frontal/core";
import { createGraphClient } from "@frontal-labs/graph";

// Initialize client
const client = new FrontalClient({
	apiKey: process.env.FRONTAL_API_KEY,
	baseUrl: process.env.FRONTAL_BASE_URL,
});

const graphClient = createGraphClient(client);

// Example: Semantic search across entities
async function semanticSearchExample() {
	console.log("=== Semantic Search ===");

	try {
		// Create sample documents/articles
		const articleEntities = graphClient.entities("article");

		const articles = [
			{
				title: "Introduction to Machine Learning",
				content:
					"Machine learning is a subset of artificial intelligence that enables systems to learn from data.",
				category: "technology",
				tags: ["AI", "ML", "data-science"],
			},
			{
				title: "Deep Learning with Neural Networks",
				content:
					"Deep learning uses neural networks with multiple layers to model complex patterns in data.",
				category: "technology",
				tags: ["AI", "neural-networks", "deep-learning"],
			},
			{
				title: "Web Development Best Practices",
				content:
					"Modern web development requires understanding of HTML, CSS, and JavaScript frameworks.",
				category: "technology",
				tags: ["web-dev", "frontend", "javascript"],
			},
			{
				title: "Cooking Italian Pasta",
				content:
					"Traditional Italian pasta recipes involve fresh ingredients and proper cooking techniques.",
				category: "food",
				tags: ["cooking", "italian", "pasta"],
			},
		];

		// Create articles
		const createdArticles = await Promise.all(
			articles.map((article) =>
				articleEntities.create({
					data: article,
				}),
			),
		);

		console.log("Created articles:", createdArticles.length);

		// Semantic search for AI-related content
		const aiSearchResults = await graphClient.semanticSearch({
			query: "artificial intelligence and neural networks",
			entityType: "article",
			limit: 5,
			threshold: 0.6,
		});

		console.log("AI search results:", aiSearchResults);
		console.log("Query:", aiSearchResults.query);

		// Search for cooking content
		const cookingSearchResults = await graphClient.semanticSearch({
			query: "how to make traditional italian food",
			entityType: "article",
			limit: 3,
			threshold: 0.7,
		});

		console.log("Cooking search results:", cookingSearchResults);

		// Search with filters
		const filteredSearchResults = await graphClient.semanticSearch({
			query: "web development and programming",
			entityType: "article",
			filters: {
				category: { eq: "technology" },
				tags: { contains: "javascript" },
			},
			limit: 3,
			threshold: 0.5,
		});

		console.log("Filtered search results:", filteredSearchResults);
	} catch (error) {
		console.error("Semantic search failed:", error);
	}
}

// Example: Natural language query
async function naturalLanguageQueryExample() {
	console.log("\n=== Natural Language Query ===");

	try {
		// Ask natural language questions
		const questions = [
			"What articles do you have about machine learning?",
			"Show me all technology-related content",
			"Find articles about cooking Italian food",
			"What content mentions neural networks?",
		];

		for (const question of questions) {
			const response = await graphClient.naturalLanguageQuery({
				question,
				entityType: "article",
				limit: 3,
			});

			console.log(`\nQuestion: ${question}`);
			console.log(`Answer: ${response.answer}`);
			console.log(`Confidence: ${response.confidence}`);
			console.log(`Found entities: ${response.entities.length}`);
		}
	} catch (error) {
		console.error("Natural language query failed:", error);
	}
}

// Example: Cross-entity semantic search
async function crossEntitySearch() {
	console.log("\n=== Cross-Entity Semantic Search ===");

	try {
		// Search across multiple entity types
		const techResults = await graphClient.semanticSearch({
			query: "artificial intelligence and machine learning",
			limit: 10,
			threshold: 0.5,
		});

		console.log("Cross-entity tech results:", techResults);

		// Search for people/experts
		const peopleResults = await graphClient.semanticSearch({
			query: "software engineering and web development",
			entityType: "user",
			limit: 5,
			threshold: 0.6,
		});

		console.log("People/expert results:", peopleResults);
	} catch (error) {
		console.error("Cross-entity search failed:", error);
	}
}

// Run examples
async function main() {
	await semanticSearchExample();
	await naturalLanguageQueryExample();
	await crossEntitySearch();
}

main().catch(console.error);

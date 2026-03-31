/**
 * Basic Agent Example
 *
 * This example demonstrates how to create a simple agent that responds to user messages
 * with automated responses based on sentiment analysis.
 */

import { type AgentHandler, AgentsService } from "@frontal/agents";
import { HttpClient } from "@frontal/core";

// Initialize the agents service
const http = new HttpClient({
	baseURL: process.env.FRONTAL_API_URL || "https://api.frontal.dev",
	apiKey: process.env.FRONTAL_API_KEY,
});

const agents = new AgentsService(http);

// Define the agent handler for processing messages
const messageHandler: AgentHandler = async (ctx) => {
	const { event, graph, reason, log } = ctx;

	if (event.type === "message.received") {
		const message = event.payload.message as string;
		const userId = event.payload.userId as string;

		log.info("Processing message", {
			userId,
			message: message.substring(0, 50),
		});

		// Use reasoning to analyze sentiment and determine response
		const sentimentResult = await reason({
			question: `What is the sentiment of this message: "${message}"? Respond with 'positive', 'negative', or 'neutral'.`,
			context: { message, userId },
		});

		let response: string;

		switch (sentimentResult.decision) {
			case "positive":
				response =
					"That's great to hear! Thanks for sharing the positive vibes!";
				break;
			case "negative":
				response =
					"I'm sorry to hear you're having a difficult time. How can I help make things better?";
				break;
			default:
				response = "Thank you for your message. How can I assist you today?";
		}

		// Store the interaction in memory for future reference
		await ctx.memory.set(
			`last_interaction_${userId}`,
			{
				message,
				response,
				sentiment: sentimentResult.decision,
				timestamp: new Date().toISOString(),
			},
			"24h",
		);

		// Send the response
		await ctx.functions.invoke("send-message", {
			userId,
			message: response,
			timestamp: new Date().toISOString(),
		});

		log.info("Response sent", {
			userId,
			sentiment: sentimentResult.decision,
			confidence: sentimentResult.confidence,
		});
	}
};

// Create and deploy the agent
async function createBasicAgent() {
	const agent = await agents
		.define("customer-support-basic")
		.description(
			"Basic customer support agent that responds to user messages with sentiment-based responses",
		)
		.trigger("message.received", { source: "chat" })
		.canRead("users", "messages", "conversations")
		.canWrite("messages", "conversations")
		.canInvoke("send-message", "escalate-to-human")
		.autoExecuteAbove(0.8)
		.escalateBelow(0.3)
		.timeout("30s")
		.rateLimit({
			requests: 100,
			window: "1m",
			strategy: "sliding",
		})
		.tags("customer-support", "basic", "sentiment")
		.on("message.received", messageHandler)
		.deploy("production");

	console.log("Basic agent created and deployed:", agent.id);
	return agent;
}

// Example usage
if (require.main === module) {
	createBasicAgent()
		.then(() => console.log("Basic agent deployed successfully"))
		.catch(console.error);
}

export { createBasicAgent, messageHandler };

/**
 * LangChain Integration Example
 *
 * This example demonstrates how to integrate LangChain tools and chains
 * with Frontal agents for enhanced AI capabilities.
 */

import type { AgentHandler } from "@frontal/agents";
import { AgentsService } from "@frontal/agents";
import { HttpClient } from "@frontal/core";

// LangChain imports (peer dependencies)
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { pull } from "langchain/hub";
import { AgentExecutor, createReactAgent } from "langchain/agents";

const http = new HttpClient({
	baseURL: process.env.FRONTAL_API_URL || "https://api.frontal.dev",
	apiKey: process.env.FRONTAL_API_KEY,
});

const agents = new AgentsService(http);

// Initialize LangChain model
const llm = new ChatOpenAI({
	modelName: "gpt-4",
	temperature: 0.1,
	openAIApiKey: process.env.OPENAI_API_KEY,
});

// Define custom tools for the agent
const customerLookupTool = new DynamicStructuredTool({
	name: "customer_lookup",
	description: "Look up customer information by ID or email",
	schema: z.object({
		identifier: z.string().describe("Customer ID or email address"),
	}),
	func: async ({ identifier }) => {
		// This would integrate with your customer database
		// For demo purposes, returning mock data
		return JSON.stringify({
			id: "cust_123",
			name: "John Doe",
			email: "john@example.com",
			tier: "premium",
			joinDate: "2023-01-15",
			totalOrders: 15,
			lifetimeValue: 5432.5,
		});
	},
});

const orderStatusTool = new DynamicStructuredTool({
	name: "order_status",
	description: "Get the status of an order by order ID",
	schema: z.object({
		orderId: z.string().describe("The order ID to look up"),
	}),
	func: async ({ orderId }) => {
		// This would integrate with your order management system
		return JSON.stringify({
			orderId,
			status: "shipped",
			estimatedDelivery: "2024-03-15",
			trackingNumber: "1Z999AA10123456784",
			items: [
				{ name: "Wireless Headphones", quantity: 1, price: 199.99 },
				{ name: "Phone Case", quantity: 2, price: 24.99 },
			],
		});
	},
});

const refundTool = new DynamicStructuredTool({
	name: "process_refund",
	description: "Process a refund for an order",
	schema: z.object({
		orderId: z.string().describe("The order ID to refund"),
		amount: z
			.number()
			.optional()
			.describe("Refund amount (defaults to full amount)"),
		reason: z.string().describe("Reason for the refund"),
	}),
	func: async ({ orderId, amount, reason }) => {
		// This would integrate with your payment processor
		const refundId = `refund_${Date.now()}`;
		return JSON.stringify({
			refundId,
			orderId,
			amount: amount || 0,
			status: "processed",
			processedAt: new Date().toISOString(),
			reason,
		});
	},
});

// Create LangChain agent with tools
const tools = [customerLookupTool, orderStatusTool, refundTool];

// Pull the prompt from hub (or create your own)
const prompt = await pull<ChatPromptTemplate>("hwchase17/react");

// Create the agent
const langchainAgent = await createReactAgent({
	llm,
	tools,
	prompt,
});

// Create agent executor
const agentExecutor = new AgentExecutor({
	agent: langchainAgent,
	tools,
	verbose: true,
});

// Frontal agent handler that uses LangChain
const customerServiceHandler: AgentHandler = async (ctx) => {
	const { event, log, memory } = ctx;

	if (event.type === "customer.inquiry") {
		const inquiry = event.payload as {
			customerId: string;
			message: string;
			sessionId: string;
		};

		log.info("Processing customer inquiry", {
			customerId: inquiry.customerId,
			sessionId: inquiry.sessionId,
			message: inquiry.message.substring(0, 100),
		});

		try {
			// Use LangChain agent to process the inquiry
			const result = await agentExecutor.invoke({
				input: `Customer ${inquiry.customerId} is asking: "${inquiry.message}". 
                Please help them using the available tools. Be helpful and professional.`,
			});

			// Store conversation in memory
			await memory.set(
				`conversation_${inquiry.sessionId}`,
				{
					customerId: inquiry.customerId,
					sessionId: inquiry.sessionId,
					inquiry: inquiry.message,
					response: result.output,
					timestamp: new Date().toISOString(),
					toolsUsed: result.intermediateSteps.map((step: any) => step.tool),
				},
				"7d",
			);

			// Send response back to customer
			await ctx.functions.invoke("send-customer-response", {
				customerId: inquiry.customerId,
				sessionId: inquiry.sessionId,
				message: result.output,
				timestamp: new Date().toISOString(),
			});

			log.info("Customer inquiry resolved", {
				customerId: inquiry.customerId,
				sessionId: inquiry.sessionId,
				toolsUsed: result.intermediateSteps.length,
			});
		} catch (error) {
			log.error("Failed to process customer inquiry", {
				customerId: inquiry.customerId,
				error: error instanceof Error ? error.message : "Unknown error",
			});

			// Escalate to human if LangChain fails
			await ctx.escalate({
				reason: `LangChain agent failed to process inquiry: ${error instanceof Error ? error.message : "Unknown error"}`,
				urgency: "medium",
				context: {
					customerId: inquiry.customerId,
					sessionId: inquiry.sessionId,
					originalMessage: inquiry.message,
				},
			});
		}
	}
};

// Handler for complex order analysis using LangChain
const orderAnalysisHandler: AgentHandler = async (ctx) => {
	const { event, reason, log } = ctx;

	if (event.type === "order.analysis.requested") {
		const { orderId, analysisType } = event.payload as {
			orderId: string;
			analysisType: "fraud" | "profitability" | "customer-satisfaction";
		};

		log.info("Starting order analysis", { orderId, analysisType });

		try {
			let analysisPrompt = "";

			switch (analysisType) {
				case "fraud":
					analysisPrompt = `Analyze order ${orderId} for potential fraud indicators. 
                          Look for unusual patterns, high-risk indicators, and suspicious behavior.`;
					break;
				case "profitability":
					analysisPrompt = `Analyze the profitability of order ${orderId}. 
                          Consider costs, margins, customer lifetime value, and potential for future business.`;
					break;
				case "customer-satisfaction":
					analysisPrompt = `Analyze order ${orderId} for potential customer satisfaction issues. 
                          Look for delivery delays, product quality concerns, and service gaps.`;
					break;
			}

			// Use LangChain for complex analysis
			const analysisResult = await agentExecutor.invoke({
				input:
					analysisPrompt +
					" Use the available tools to gather necessary information for your analysis.",
			});

			// Store analysis results
			await ctx.memory.set(
				`order_analysis_${orderId}_${analysisType}`,
				{
					orderId,
					analysisType,
					result: analysisResult.output,
					timestamp: new Date().toISOString(),
					confidence: 0.85, // This could be calculated based on the analysis
				},
				"30d",
			);

			// Trigger appropriate actions based on analysis
			if (analysisType === "fraud") {
				const fraudDecision = await reason({
					question: `Based on the fraud analysis, should this order be blocked, flagged for review, or approved?`,
					context: { analysis: analysisResult.output },
					options: ["block", "flag", "approve"],
				});

				await ctx.functions.invoke(`order-${fraudDecision.decision}`, {
					orderId,
					reason: fraudDecision.reasoning,
					analysis: analysisResult.output,
				});
			}

			log.info("Order analysis completed", {
				orderId,
				analysisType,
				confidence: 0.85,
			});
		} catch (error) {
			log.error("Order analysis failed", {
				orderId,
				analysisType,
				error: error instanceof Error ? error.message : "Unknown error",
			});

			await ctx.escalate({
				reason: `Order analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				urgency: "medium",
				context: { orderId, analysisType },
			});
		}
	}
};

// Create and deploy the LangChain integrated agent
async function createLangChainAgent() {
	const agent = await agents
		.define("customer-service-langchain")
		.description(
			"Customer service agent powered by LangChain with advanced reasoning and tool integration",
		)
		.trigger("customer.inquiry")
		.trigger("order.analysis.requested")
		.canRead("customers", "orders", "payments", "products")
		.canWrite("conversations", "analysis-results", "alerts")
		.canInvoke(
			"send-customer-response",
			"order-block",
			"order-flag",
			"order-approve",
		)
		.escalatesOn("langchain-failure", "analysis-failure", "high-risk-fraud")
		.confidence({
			autoExecuteAbove: 0.8,
			escalateBelow: 0.3,
		})
		.memory({
			ttl: "7d",
			maxSize: "50MB",
		})
		.retry({
			maxAttempts: 2,
			backoffStrategy: "exponential",
			baseDelay: "500ms",
		})
		.timeout("90s")
		.rateLimit({
			requests: 20,
			window: "1m",
			strategy: "sliding",
		})
		.tags("customer-service", "langchain", "ai-tools", "analysis")
		.on("customer.inquiry", customerServiceHandler)
		.on("order.analysis.requested", orderAnalysisHandler)
		.deploy("production");

	console.log("LangChain integrated agent created and deployed:", agent.id);
	return agent;
}

// Example usage
if (require.main === module) {
	createLangChainAgent()
		.then(() => console.log("LangChain agent deployed successfully"))
		.catch(console.error);
}

export {
	createLangChainAgent,
	customerServiceHandler,
	orderAnalysisHandler,
	agentExecutor,
};

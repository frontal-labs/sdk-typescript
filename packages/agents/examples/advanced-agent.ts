/**
 * Advanced Agent Example
 *
 * This example demonstrates a sophisticated agent with complex reasoning,
 * multi-step workflows, escalation handling, and experiment management.
 */

import type { AgentHandler } from "@frontal/agents";
import { AgentsService } from "@frontal/agents";
import { HttpClient } from "@frontal/core";

const http = new HttpClient({
	baseURL: process.env.FRONTAL_API_URL || "https://api.frontal.dev",
	apiKey: process.env.FRONTAL_API_KEY,
});

const agents = new AgentsService(http);

// Complex handler for order processing with multiple decision points
const orderProcessingHandler: AgentHandler = async (ctx) => {
	const { event, graph, reason, escalate, log, memory } = ctx;

	if (event.type === "order.created") {
		const order = event.payload as any;
		const orderId = order.id;
		const customerId = order.customerId;

		log.info("Processing new order", {
			orderId,
			customerId,
			amount: order.total,
		});

		try {
			// Step 1: Validate order details
			const validation = await reason({
				question: `Is this order valid and ready for processing? Check for: valid customer, sufficient inventory, correct pricing, and payment method.`,
				context: { order, customer: await graph.get("customers", customerId) },
				options: ["valid", "invalid", "needs-review"],
			});

			if (validation.decision === "invalid") {
				await escalate({
					reason: validation.reasoning,
					urgency: "high",
					context: { orderId, validation: validation.reasoning },
					metadata: { order, validation },
				});
				return;
			}

			if (validation.decision === "needs-review") {
				await ctx.functions.invoke("flag-order-for-review", {
					orderId,
					reason: validation.reasoning,
					confidence: validation.confidence,
				});
				return;
			}

			// Step 2: Check inventory and allocate items
			const inventoryCheck = await Promise.all(
				order.items.map(async (item: any) => {
					const inventory = await graph.get("inventory", item.productId);
					return {
						productId: item.productId,
						requested: item.quantity,
						available: inventory.quantity,
						sufficient: inventory.quantity >= item.quantity,
					};
				}),
			);

			const outOfStockItems = inventoryCheck.filter((item) => !item.sufficient);

			if (outOfStockItems.length > 0) {
				const stockDecision = await reason({
					question: `Some items are out of stock. Should we: 1) Partially fulfill available items, 2) Backorder everything, 3) Cancel and refund?`,
					context: { order, outOfStockItems },
					options: ["partial-fulfill", "backorder", "cancel"],
				});

				if (stockDecision.decision === "cancel") {
					await ctx.functions.invoke("cancel-order", {
						orderId,
						reason: "Insufficient inventory",
						refundAmount: order.total,
					});
					return;
				}

				// Handle partial fulfillment or backorder
				await ctx.functions.invoke("handle-inventory-issue", {
					orderId,
					strategy: stockDecision.decision,
					items: outOfStockItems,
				});
			}

			// Step 3: Process payment
			const paymentResult = await ctx.functions.invoke("process-payment", {
				orderId,
				amount: order.total,
				paymentMethod: order.paymentMethod,
				customerId,
			});

			if (!paymentResult.success) {
				await escalate({
					reason: `Payment failed: ${paymentResult.error}`,
					urgency: "high",
					context: { orderId, paymentError: paymentResult.error },
					metadata: { order, paymentResult },
				});
				return;
			}

			// Step 4: Update order status and trigger fulfillment
			await graph.update("orders", orderId, {
				status: "confirmed",
				paymentStatus: "paid",
				confirmedAt: new Date().toISOString(),
			});

			// Store order processing summary in memory
			await memory.set(
				`order_${orderId}_summary`,
				{
					orderId,
					customerId,
					total: order.total,
					itemsProcessed: order.items.length,
					processedAt: new Date().toISOString(),
					validationConfidence: validation.confidence,
				},
				"30d",
			);

			// Trigger fulfillment workflow
			await ctx.functions.invoke("start-fulfillment", {
				orderId,
				priority: order.total > 1000 ? "high" : "normal",
			});

			// Send confirmation to customer
			await ctx.functions.invoke("send-order-confirmation", {
				customerId,
				orderId,
				estimatedDelivery: await calculateEstimatedDelivery(order),
			});

			log.info("Order processed successfully", {
				orderId,
				total: order.total,
				confidence: validation.confidence,
			});
		} catch (error) {
			log.error("Order processing failed", {
				orderId,
				error: error instanceof Error ? error.message : "Unknown error",
			});

			await escalate({
				reason: `Order processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				urgency: "critical",
				context: { orderId },
				metadata: { order, error },
			});
		}
	}
};

// Handler for customer service escalations
const escalationHandler: AgentHandler = async (ctx) => {
	const { event, reason, agents, log } = ctx;

	if (event.type === "escalation.created") {
		const escalation = event.payload as any;

		log.info("Handling escalation", {
			escalationId: escalation.id,
			urgency: escalation.urgency,
			reason: escalation.reason,
		});

		// Determine if this requires human intervention
		const humanIntervention = await reason({
			question: `Does this escalation require immediate human intervention based on urgency and complexity?`,
			context: { escalation },
			options: ["yes", "no", "maybe"],
		});

		if (
			humanIntervention.decision === "yes" ||
			escalation.urgency === "critical"
		) {
			await ctx.functions.invoke("notify-human-agent", {
				escalationId: escalation.id,
				priority: escalation.urgency,
				context: escalation.context,
			});
		} else {
			// Try to resolve automatically
			const resolution = await reason({
				question: `How should this escalation be resolved automatically?`,
				context: { escalation },
				options: ["refund", "discount", "reschedule", "investigate"],
			});

			if (resolution.confidence > 0.7) {
				await ctx.functions.invoke(`resolve-${resolution.decision}`, {
					escalationId: escalation.id,
					reasoning: resolution.reasoning,
				});
			} else {
				// Still escalate to human if confidence is low
				await ctx.functions.invoke("notify-human-agent", {
					escalationId: escalation.id,
					priority: escalation.urgency,
					context: escalation.context,
					aiRecommendation: resolution.reasoning,
				});
			}
		}
	}
};

// Helper function to calculate estimated delivery
async function calculateEstimatedDelivery(order: any): Promise<string> {
	// This would typically integrate with shipping APIs
	const processingTime = 2; // days
	const shippingTime = order.shippingMethod === "express" ? 1 : 5; // days
	const deliveryDate = new Date();
	deliveryDate.setDate(deliveryDate.getDate() + processingTime + shippingTime);
	return deliveryDate.toISOString().split("T")[0];
}

// Create and deploy the advanced agent
async function createAdvancedAgent() {
	const agent = await agents
		.define("order-processing-advanced")
		.description(
			"Advanced order processing agent with complex workflows, escalation handling, and intelligent decision making",
		)
		.trigger("order.created")
		.trigger("escalation.created")
		.canRead("orders", "customers", "inventory", "payments")
		.canWrite("orders", "escalations", "notifications")
		.canInvoke(
			"process-payment",
			"start-fulfillment",
			"send-order-confirmation",
			"flag-order-for-review",
			"cancel-order",
			"handle-inventory-issue",
			"notify-human-agent",
		)
		.escalatesOn("payment-failure", "inventory-shortage", "customer-complaint")
		.confidence({
			autoExecuteAbove: 0.85,
			escalateBelow: 0.4,
		})
		.memory({
			ttl: "30d",
			maxSize: "100MB",
		})
		.retry({
			maxAttempts: 3,
			backoffStrategy: "exponential",
			baseDelay: "1s",
		})
		.timeout("2m")
		.rateLimit({
			requests: 50,
			window: "1m",
			strategy: "token-bucket",
		})
		.tags("order-processing", "advanced", "workflow", "escalation")
		.on("order.created", orderProcessingHandler)
		.on("escalation.created", escalationHandler)
		.deploy("production");

	console.log("Advanced agent created and deployed:", agent.id);
	return agent;
}

// Create an A/B test experiment for the order processing logic
async function createExperiment(agentId: string) {
	const experiment = await agents.agent(agentId).experiments.create({
		name: "Order Processing Strategy Test",
		description:
			"Test different order processing strategies to improve conversion rates",
		metric: "order_completion_rate",
		metricDirection: "increase",
		duration: "14d",
		minSampleSize: 1000,
		variants: [
			{
				name: "control",
				description: "Current order processing logic",
				weight: 50,
				config: { strategy: "current" },
			},
			{
				name: "enhanced-validation",
				description: "Enhanced validation with stricter checks",
				weight: 50,
				config: { strategy: "enhanced" },
			},
		],
	});

	console.log("Experiment created:", experiment.id);
	return experiment;
}

// Example usage
if (require.main === module) {
	createAdvancedAgent()
		.then(async (agent) => {
			console.log("Advanced agent deployed successfully");

			// Create an experiment for testing
			const experiment = await createExperiment(agent.id);
			console.log("Experiment created:", experiment.id);
		})
		.catch(console.error);
}

export {
	createAdvancedAgent,
	createExperiment,
	orderProcessingHandler,
	escalationHandler,
};

/**
 * Vercel AI SDK Integration Example
 *
 * This example demonstrates how to integrate Vercel AI SDK models and tools
 * with Frontal agents for modern AI-powered workflows.
 */

// Vercel AI SDK imports (peer dependencies)
import { openai } from "@ai-sdk/openai";
import type { AgentHandler } from "@frontal/agents";
import { AgentsService } from "@frontal/agents";
import { HttpClient } from "@frontal/core";
import { generateObject, generateText, streamText } from "ai";
import { z } from "zod";

const http = new HttpClient({
	baseURL: process.env.FRONTAL_API_URL || "https://api.frontal.dev",
	apiKey: process.env.FRONTAL_API_KEY,
});

const agents = new AgentsService(http);

// Content generation handler using Vercel AI SDK
const contentGenerationHandler: AgentHandler = async (ctx) => {
	const { event, reason, log, memory } = ctx;

	if (event.type === "content.requested") {
		const request = event.payload as {
			type: "blog-post" | "product-description" | "email" | "social-media";
			topic: string;
			tone: "professional" | "casual" | "friendly" | "urgent";
			length: "short" | "medium" | "long";
			targetAudience?: string;
			seoKeywords?: string[];
		};

		log.info("Generating content", {
			type: request.type,
			topic: request.topic,
			tone: request.tone,
		});

		try {
			// Build prompt based on content type and requirements
			let systemPrompt = `You are a professional content writer.`;

			switch (request.type) {
				case "blog-post":
					systemPrompt += ` Write an engaging blog post about ${request.topic}.`;
					break;
				case "product-description":
					systemPrompt += ` Write a compelling product description for ${request.topic}.`;
					break;
				case "email":
					systemPrompt += ` Write a professional email about ${request.topic}.`;
					break;
				case "social-media":
					systemPrompt += ` Write engaging social media content about ${request.topic}.`;
					break;
			}

			systemPrompt += ` Use a ${request.tone} tone. Make it ${request.length} in length.`;

			if (request.targetAudience) {
				systemPrompt += ` Target audience: ${request.targetAudience}.`;
			}

			if (request.seoKeywords && request.seoKeywords.length > 0) {
				systemPrompt += ` Include these keywords naturally: ${request.seoKeywords.join(", ")}.`;
			}

			// Generate content using Vercel AI SDK
			const { text } = await generateText({
				model: openai("gpt-4-turbo-preview"),
				prompt: systemPrompt,
				temperature: 0.7,
				maxTokens:
					request.length === "short"
						? 200
						: request.length === "medium"
							? 500
							: 1000,
			});

			// Generate metadata about the content
			const { object: metadata } = await generateObject({
				model: openai("gpt-4-turbo-preview"),
				prompt: `Analyze this content and extract metadata: "${text}"`,
				schema: z.object({
					readabilityScore: z.number().min(0).max(100),
					estimatedReadTime: z.number(),
					sentiment: z.enum(["positive", "neutral", "negative"]),
					keyTopics: z.array(z.string()),
					callToActionPresent: z.boolean(),
				}),
			});

			// Store generated content and metadata
			const contentId = `content_${Date.now()}`;
			await memory.set(
				contentId,
				{
					id: contentId,
					type: request.type,
					topic: request.topic,
					content: text,
					metadata,
					generatedAt: new Date().toISOString(),
					request,
				},
				"30d",
			);

			// Notify content management system
			await ctx.functions.invoke("store-generated-content", {
				contentId,
				content: text,
				metadata,
				type: request.type,
				status: "generated",
			});

			log.info("Content generated successfully", {
				contentId,
				type: request.type,
				readabilityScore: metadata.readabilityScore,
				wordCount: text.split(" ").length,
			});
		} catch (error) {
			log.error("Content generation failed", {
				type: request.type,
				topic: request.topic,
				error: error instanceof Error ? error.message : "Unknown error",
			});

			await ctx.escalate({
				reason: `Content generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				urgency: "medium",
				context: { request },
			});
		}
	}
};

// Real-time chat handler using streaming
const chatHandler: AgentHandler = async (ctx) => {
	const { event, log, memory } = ctx;

	if (event.type === "chat.message") {
		const message = event.payload as {
			sessionId: string;
			userId: string;
			message: string;
			streaming: boolean;
		};

		log.info("Processing chat message", {
			sessionId: message.sessionId,
			userId: message.userId,
			streaming: message.streaming,
		});

		try {
			// Get conversation history
			const conversationHistory =
				((await memory.get(`chat_history_${message.sessionId}`)) as any[]) ||
				[];

			// Build messages array for the AI
			const messages = [
				{
					role: "system" as const,
					content: "You are a helpful AI assistant. Be concise and helpful.",
				},
				...conversationHistory.slice(-10), // Keep last 10 messages for context
				{ role: "user" as const, content: message.message },
			];

			if (message.streaming) {
				// Stream the response
				const { textStream } = await streamText({
					model: openai("gpt-4-turbo-preview"),
					messages,
					temperature: 0.7,
				});

				let fullResponse = "";

				// Send chunks as they arrive
				for await (const chunk of textStream) {
					fullResponse += chunk;
					await ctx.functions.invoke("send-chat-chunk", {
						sessionId: message.sessionId,
						userId: message.userId,
						chunk,
						isComplete: false,
					});
				}

				// Send completion signal
				await ctx.functions.invoke("send-chat-chunk", {
					sessionId: message.sessionId,
					userId: message.userId,
					chunk: "",
					isComplete: true,
				});

				// Update conversation history
				const updatedHistory = [
					...conversationHistory,
					{ role: "user" as const, content: message.message },
					{ role: "assistant" as const, content: fullResponse },
				];

				await memory.set(
					`chat_history_${message.sessionId}`,
					updatedHistory,
					"24h",
				);

				log.info("Streaming chat completed", {
					sessionId: message.sessionId,
					responseLength: fullResponse.length,
				});
			} else {
				// Generate complete response at once
				const { text } = await generateText({
					model: openai("gpt-4-turbo-preview"),
					messages,
					temperature: 0.7,
				});

				// Send response
				await ctx.functions.invoke("send-chat-message", {
					sessionId: message.sessionId,
					userId: message.userId,
					message: text,
					timestamp: new Date().toISOString(),
				});

				// Update conversation history
				const updatedHistory = [
					...conversationHistory,
					{ role: "user" as const, content: message.message },
					{ role: "assistant" as const, content: text },
				];

				await memory.set(
					`chat_history_${message.sessionId}`,
					updatedHistory,
					"24h",
				);

				log.info("Chat message processed", {
					sessionId: message.sessionId,
					responseLength: text.length,
				});
			}
		} catch (error) {
			log.error("Chat processing failed", {
				sessionId: message.sessionId,
				error: error instanceof Error ? error.message : "Unknown error",
			});

			await ctx.functions.invoke("send-chat-error", {
				sessionId: message.sessionId,
				userId: message.userId,
				error:
					"Sorry, I encountered an error processing your message. Please try again.",
				timestamp: new Date().toISOString(),
			});
		}
	}
};

// Data analysis handler using structured generation
const dataAnalysisHandler: AgentHandler = async (ctx) => {
	const { event, log } = ctx;

	if (event.type === "data.analysis.requested") {
		const analysis = event.payload as {
			data: Record<string, unknown>[];
			analysisType: "summary" | "trends" | "anomalies" | "predictions";
			timeframe?: string;
			metrics?: string[];
		};

		log.info("Starting data analysis", {
			analysisType: analysis.analysisType,
			dataPoints: analysis.data.length,
			timeframe: analysis.timeframe,
		});

		try {
			let analysisPrompt = `Analyze this data and provide insights. Data: ${JSON.stringify(analysis.data.slice(0, 100))}.`;

			switch (analysis.analysisType) {
				case "summary":
					analysisPrompt +=
						" Provide a comprehensive summary including key statistics, patterns, and insights.";
					break;
				case "trends":
					analysisPrompt +=
						" Identify trends, patterns, and changes over time. Highlight significant increases or decreases.";
					break;
				case "anomalies":
					analysisPrompt +=
						" Identify anomalies, outliers, and unusual patterns in the data.";
					break;
				case "predictions":
					analysisPrompt +=
						" Based on historical patterns, provide predictions and forecasts for the near future.";
					break;
			}

			if (analysis.metrics && analysis.metrics.length > 0) {
				analysisPrompt += ` Focus on these metrics: ${analysis.metrics.join(", ")}.`;
			}

			// Generate structured analysis
			const { object: result } = await generateObject({
				model: openai("gpt-4-turbo-preview"),
				prompt: analysisPrompt,
				schema: z.object({
					summary: z.string(),
					keyFindings: z.array(z.string()),
					recommendations: z.array(z.string()),
					confidence: z.number().min(0).max(1),
					dataQuality: z.object({
						completeness: z.number().min(0).max(1),
						accuracy: z.number().min(0).max(1),
						consistency: z.number().min(0).max(1),
					}),
					visualizations: z.array(
						z.object({
							type: z.enum(["line", "bar", "pie", "scatter"]),
							title: z.string(),
							description: z.string(),
							dataPoints: z.array(z.record(z.unknown())),
						}),
					),
				}),
			});

			// Store analysis results
			const analysisId = `analysis_${Date.now()}`;
			await ctx.memory.set(
				analysisId,
				{
					id: analysisId,
					type: analysis.analysisType,
					result,
					dataPoints: analysis.data.length,
					generatedAt: new Date().toISOString(),
					request: analysis,
				},
				"30d",
			);

			// Trigger visualization creation if needed
			if (result.visualizations.length > 0) {
				await ctx.functions.invoke("create-visualizations", {
					analysisId,
					visualizations: result.visualizations,
				});
			}

			// Send analysis results
			await ctx.functions.invoke("store-analysis-results", {
				analysisId,
				result,
				type: analysis.analysisType,
			});

			log.info("Data analysis completed", {
				analysisId,
				type: analysis.analysisType,
				confidence: result.confidence,
				keyFindings: result.keyFindings.length,
			});
		} catch (error) {
			log.error("Data analysis failed", {
				analysisType: analysis.analysisType,
				error: error instanceof Error ? error.message : "Unknown error",
			});

			await ctx.escalate({
				reason: `Data analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				urgency: "medium",
				context: { analysisType: analysis.analysisType },
			});
		}
	}
};

// Create and deploy the Vercel AI integrated agent
async function createVercelAIAgent() {
	const agent = await agents
		.define("ai-workflows-vercel")
		.description(
			"AI-powered workflows agent using Vercel AI SDK for content generation, chat, and data analysis",
		)
		.trigger("content.requested")
		.trigger("chat.message")
		.trigger("data.analysis.requested")
		.canRead("content", "conversations", "datasets", "analytics")
		.canWrite("content", "analysis-results", "chat-logs")
		.canInvoke(
			"store-generated-content",
			"send-chat-chunk",
			"send-chat-message",
			"send-chat-error",
			"create-visualizations",
			"store-analysis-results",
		)
		.escalatesOn(
			"ai-generation-failure",
			"content-quality-issues",
			"data-analysis-errors",
		)
		.confidence({
			autoExecuteAbove: 0.75,
			escalateBelow: 0.25,
		})
		.memory({
			ttl: "7d",
			maxSize: "100MB",
		})
		.retry({
			maxAttempts: 2,
			backoffStrategy: "linear",
			baseDelay: "1s",
		})
		.timeout("2m")
		.rateLimit({
			requests: 30,
			window: "1m",
			strategy: "token-bucket",
		})
		.tags(
			"ai-workflows",
			"vercel-ai",
			"content-generation",
			"chat",
			"data-analysis",
		)
		.on("content.requested", contentGenerationHandler)
		.on("chat.message", chatHandler)
		.on("data.analysis.requested", dataAnalysisHandler)
		.deploy("production");

	console.log("Vercel AI integrated agent created and deployed:", agent.id);
	return agent;
}

// Example usage
if (require.main === module) {
	createVercelAIAgent()
		.then(() => console.log("Vercel AI agent deployed successfully"))
		.catch(console.error);
}

export {
	createVercelAIAgent,
	contentGenerationHandler,
	chatHandler,
	dataAnalysisHandler,
};

/**
 * Prompt Management Example
 *
 * This example demonstrates how to use the Frontal AI SDK
 * to create, manage, and chain prompts for consistent AI interactions.
 */

import { AI } from "../src";

// Initialize the AI client
const ai = new AI();

async function promptManagementExample() {
	console.log("🚀 Starting Prompt Management Example\n");

	try {
		// Example 1: Create a simple prompt
		console.log("📝 Example 1: Create a simple prompt");

		const welcomePrompt = ai.createPrompt({
			name: "welcome-message",
			template:
				"Hello, {name}! Welcome to {service}. How can I assist you today?",
			variables: {
				name: {
					type: "string",
					description: "User's name",
				},
				service: {
					type: "string",
					description: "Name of the service",
					defaultValue: "our platform",
				},
			},
			metadata: {
				category: "greeting",
				version: "1.0.0",
				author: "AI Team",
			},
		});

		console.log("✅ Created welcome prompt:");
		console.log("   Name:", welcomePrompt.name);
		console.log("   Template:", welcomePrompt.template);
		console.log("   Variables:", Object.keys(welcomePrompt.variables));

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 2: Retrieve and use a prompt
		console.log("📝 Example 2: Retrieve and use a prompt");

		const retrievedPrompt = ai.getPrompt("welcome-message");

		if (retrievedPrompt.error) {
			console.error(
				"❌ Error retrieving prompt:",
				retrievedPrompt.error.message,
			);
		} else {
			console.log("✅ Retrieved prompt:");
			console.log("   Name:", retrievedPrompt.data.name);
			console.log("   Template:", retrievedPrompt.data.template);

			// Simulate filling the template
			const filledTemplate = retrievedPrompt.data.template
				.replace("{name}", "Alice")
				.replace("{service}", "the AI Assistant");
			console.log("   Filled template:", filledTemplate);
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 3: Update an existing prompt
		console.log("📝 Example 3: Update an existing prompt");

		const updatedPrompt = ai.updatePrompt("welcome-message", {
			template:
				"Greetings, {name}! Welcome to {service}. I'm here to help you with {task}.",
			metadata: {
				category: "greeting",
				version: "1.1.0",
				author: "AI Team",
				lastModified: new Date().toISOString(),
			},
		});

		if (updatedPrompt.error) {
			console.error("❌ Error updating prompt:", updatedPrompt.error.message);
		} else {
			console.log("✅ Updated prompt:");
			console.log("   New template:", updatedPrompt.data.template);
			console.log("   Version:", updatedPrompt.data.metadata?.version);
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 4: Create complex prompts with different variable types
		console.log("📝 Example 4: Complex prompts with different variable types");

		const analysisPrompt = ai.createPrompt({
			name: "data-analysis",
			template: `
Analyze the following data:
- Dataset: {dataset}
- Time period: {timeframe} days
- Confidence threshold: {threshold}
- Include visualization: {includeViz}

Please provide insights and recommendations.
      `.trim(),
			variables: {
				dataset: {
					type: "string",
					description: "Name of the dataset to analyze",
				},
				timeframe: {
					type: "number",
					description: "Number of days to analyze",
					defaultValue: 30,
				},
				threshold: {
					type: "number",
					description: "Confidence threshold for analysis",
					defaultValue: 0.8,
				},
				includeViz: {
					type: "boolean",
					description: "Whether to include visualizations",
					defaultValue: true,
				},
			},
			metadata: {
				category: "analysis",
				complexity: "medium",
			},
		});

		console.log("✅ Created complex analysis prompt:");
		console.log("   Variables:", Object.keys(analysisPrompt.variables));
		console.log("   Variable types:");
		Object.entries(analysisPrompt.variables).forEach(([name, variable]) => {
			console.log(`     - ${name}: ${variable.type} (${variable.description})`);
		});

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 5: Prompt chaining
		console.log("📝 Example 5: Prompt chaining");

		const summarizationPrompt = ai.createPrompt({
			name: "summarize",
			template:
				"Please summarize the following text in 3 bullet points: {text}",
			variables: {
				text: {
					type: "string",
					description: "Text to summarize",
				},
			},
		});

		const sentimentPrompt = ai.createPrompt({
			name: "sentiment-analysis",
			template:
				"Analyze the sentiment of this summary: {summary} Rate from 1-10.",
			variables: {
				summary: {
					type: "string",
					description: "Summary to analyze",
				},
			},
		});

		const recommendationPrompt = ai.createPrompt({
			name: "recommendation",
			template:
				"Based on the sentiment analysis ({sentiment}/10), provide recommendations: {sentiment}",
			variables: {
				sentiment: {
					type: "number",
					description: "Sentiment score",
				},
			},
		});

		// Create a prompt chain
		const promptChain = ai.chainPrompts(
			summarizationPrompt,
			sentimentPrompt,
			recommendationPrompt,
		);

		console.log(
			"✅ Created prompt chain with",
			promptChain.prompts.length,
			"prompts:",
		);
		promptChain.prompts.forEach((prompt, index) => {
			console.log(`   ${index + 1}. ${prompt.name}`);
		});
	} catch (error) {
		console.error("❌ Unexpected error:", error);
	}
}

// Advanced example: Dynamic prompt generation
async function dynamicPromptExample() {
	console.log("🎯 Advanced Example: Dynamic Prompt Generation\n");

	// Create prompts for different user roles
	const roles = ["developer", "designer", "manager", "analyst"];

	for (const role of roles) {
		const rolePrompt = ai.createPrompt({
			name: `${role}-assistant`,
			template: `
You are an expert ${role} assistant. Your role is to:
${getRoleDescription(role)}

Please respond professionally and provide specific, actionable advice for ${role}-related questions.
      `.trim(),
			variables: {
				question: {
					type: "string",
					description: "User's question",
				},
			},
			metadata: {
				role: role,
				expertise: getRoleExpertise(role),
			},
		});

		console.log(`✅ Created ${role} assistant prompt`);
		console.log(`   Expertise: ${rolePrompt.metadata?.expertise}`);
	}
}

function getRoleDescription(role: string): string {
	const descriptions = {
		developer:
			"- Help with coding, debugging, and software architecture\n- Provide best practices and code examples\n- Suggest tools and technologies",
		designer:
			"- Assist with UI/UX design principles\n- Provide design feedback and suggestions\n- Recommend design tools and resources",
		manager:
			"- Help with project planning and team coordination\n- Provide management strategies and best practices\n- Suggest productivity tools",
		analyst:
			"- Analyze data and provide insights\n- Create reports and visualizations\n- Recommend analytical approaches",
	};
	return (
		descriptions[role as keyof typeof descriptions] ||
		"Provide expert assistance in your field."
	);
}

function getRoleExpertise(role: string): string {
	const expertise = {
		developer: "Software Development, Architecture, Best Practices",
		designer: "UI/UX Design, User Research, Design Systems",
		manager: "Project Management, Team Leadership, Strategy",
		analyst: "Data Analysis, Statistics, Business Intelligence",
	};
	return expertise[role as keyof typeof expertise] || "General Consulting";
}

// Example: Prompt templates for different use cases
async function useCaseTemplatesExample() {
	console.log("🎯 Example: Use Case Templates\n");

	const useCases = [
		{
			name: "code-review",
			template: `
Review the following code for:
- Code quality and best practices
- Potential bugs or issues
- Performance optimizations
- Security vulnerabilities

Code:
{code}

Language: {language}
Framework: {framework}
      `.trim(),
			variables: {
				code: { type: "string", description: "Code to review" },
				language: { type: "string", description: "Programming language" },
				framework: { type: "string", description: "Framework used" },
			},
		},
		{
			name: "email-draft",
			template: `
Draft a professional email with the following details:
- Recipient: {recipient}
- Subject: {subject}
- Tone: {tone}
- Key points: {keyPoints}
- Call to action: {cta}

Make it concise and professional.
      `.trim(),
			variables: {
				recipient: { type: "string", description: "Email recipient" },
				subject: { type: "string", description: "Email subject" },
				tone: {
					type: "string",
					description: "Email tone (formal/casual/friendly)",
				},
				keyPoints: { type: "string", description: "Key points to include" },
				cta: { type: "string", description: "Call to action" },
			},
		},
		{
			name: "meeting-summary",
			template: `
Create a structured meeting summary:

Meeting Details:
- Date: {date}
- Attendees: {attendees}
- Duration: {duration} minutes
- Type: {meetingType}

Key Discussion Points:
{discussionPoints}

Action Items:
{actionItems}

Next Steps:
{nextSteps}
      `.trim(),
			variables: {
				date: { type: "string", description: "Meeting date" },
				attendees: { type: "string", description: "Meeting attendees" },
				duration: {
					type: "number",
					description: "Meeting duration in minutes",
				},
				meetingType: { type: "string", description: "Type of meeting" },
				discussionPoints: {
					type: "string",
					description: "Key discussion points",
				},
				actionItems: { type: "string", description: "Action items" },
				nextSteps: { type: "string", description: "Next steps" },
			},
		},
	];

	for (const useCase of useCases) {
		const _prompt = ai.createPrompt({
			name: useCase.name,
			template: useCase.template,
			variables: useCase.variables,
			metadata: {
				useCase: useCase.name,
				variableCount: Object.keys(useCase.variables).length,
			},
		});

		console.log(`✅ Created ${useCase.name} template`);
		console.log(`   Variables: ${Object.keys(useCase.variables).join(", ")}`);
	}
}

// Example: Prompt versioning and evolution
async function promptVersioningExample() {
	console.log("🎯 Example: Prompt Versioning and Evolution\n");

	// Version 1.0 - Basic prompt
	const _v1Prompt = ai.createPrompt({
		name: "content-generator",
		template: "Generate content about: {topic}",
		variables: {
			topic: { type: "string", description: "Topic to generate content about" },
		},
		metadata: { version: "1.0.0" },
	});

	console.log("✅ Created v1.0 prompt");

	// Version 2.0 - Enhanced with tone and length
	const v2Prompt = ai.updatePrompt("content-generator", {
		template: "Generate {length} content about {topic} in a {tone} tone.",
		variables: {
			topic: { type: "string", description: "Topic to generate content about" },
			length: {
				type: "string",
				description: "Content length (short/medium/long)",
			},
			tone: {
				type: "string",
				description: "Content tone (formal/casual/professional)",
			},
		},
		metadata: {
			version: "2.0.0",
			changelog: "Added length and tone parameters",
		},
	});

	if (v2Prompt.error) {
		console.error("❌ Error updating to v2.0:", v2Prompt.error.message);
	} else {
		console.log("✅ Updated to v2.0 prompt");
		console.log("   New variables:", Object.keys(v2Prompt.data.variables));
	}

	// Version 3.0 - Added audience and purpose
	const v3Prompt = ai.updatePrompt("content-generator", {
		template: `
Generate {length} content about {topic} in a {tone} tone for {audience}.
Purpose: {purpose}
Format: {format}
      `.trim(),
		variables: {
			topic: { type: "string", description: "Topic to generate content about" },
			length: {
				type: "string",
				description: "Content length (short/medium/long)",
			},
			tone: {
				type: "string",
				description: "Content tone (formal/casual/professional)",
			},
			audience: { type: "string", description: "Target audience" },
			purpose: { type: "string", description: "Content purpose" },
			format: { type: "string", description: "Content format" },
		},
		metadata: {
			version: "3.0.0",
			changelog: "Added audience, purpose, and format parameters",
		},
	});

	if (v3Prompt.error) {
		console.error("❌ Error updating to v3.0:", v3Prompt.error.message);
	} else {
		console.log("✅ Updated to v3.0 prompt");
		console.log("   Final variables:", Object.keys(v3Prompt.data.variables));
	}
}

// Run the examples
if (import.meta.main) {
	await promptManagementExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await dynamicPromptExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await useCaseTemplatesExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await promptVersioningExample();
}

export {
	promptManagementExample,
	dynamicPromptExample,
	useCaseTemplatesExample,
	promptVersioningExample,
};

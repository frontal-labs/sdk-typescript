import { createTestHttpClient, type MockRoute } from "@frontal/testing";
import { describe, expect, it, vi } from "vitest";
import { AIService } from "../src/client";
import { AI } from "../src/compat";

function createService(routes: MockRoute[] = []) {
	const { http, mock } = createTestHttpClient(routes);
	return { service: new AIService(http), mock };
}

const chatResponse = (content: string, finishReason = "stop") => ({
	choices: [{ message: { content }, finish_reason: finishReason }],
	usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
});

describe("AIService", () => {
	describe("generateText()", () => {
		it("sends chat completion request and returns text", async () => {
			const { service, mock } = createService([
				{
					method: "POST",
					path: "/ai/chat/completions",
					body: chatResponse("Hello world"),
				},
			]);

			const result = await service.generateText({
				model: "gpt-4",
				prompt: "Say hello",
			});

			expect(result.text).toBe("Hello world");
			expect(result.finishReason).toBe("stop");
			expect(result.usage.totalTokens).toBe(15);
		});

		it("handles string prompt by converting to messages", async () => {
			const { service, mock } = createService([
				{
					method: "POST",
					path: "/ai/chat/completions",
					body: chatResponse("response"),
				},
			]);

			await service.generateText({ model: "gpt-4", prompt: "test" });

			mock.expectCalledWith("POST", "/ai/chat/completions", {
				messages: [{ role: "user", content: "test" }],
			});
		});

		it("handles messages array", async () => {
			const { service, mock } = createService([
				{
					method: "POST",
					path: "/ai/chat/completions",
					body: chatResponse("response"),
				},
			]);

			await service.generateText({
				model: "gpt-4",
				messages: [
					{ role: "system", content: "You are helpful" },
					{ role: "user", content: "Hello" },
				],
			});

			const req = mock.requests[0];
			expect((req.body as any).messages[0].role).toBe("system");
		});

		it("passes temperature and other options", async () => {
			const { service, mock } = createService([
				{
					method: "POST",
					path: "/ai/chat/completions",
					body: chatResponse("ok"),
				},
			]);

			await service.generateText({
				model: "gpt-4",
				prompt: "test",
				temperature: 0.5,
				maxTokens: 100,
				topP: 0.9,
			});

			mock.expectCalledWith("POST", "/ai/chat/completions", {
				temperature: 0.5,
				max_tokens: 100,
				top_p: 0.9,
			});
		});

		it("throws on API failure", async () => {
			const { service } = createService([
				{
					method: "POST",
					path: "/ai/chat/completions",
					status: 429,
					body: {
						code: "RATE_LIMITED",
						message: "Too many requests",
						requestId: "req_1",
					},
				},
			]);

			await expect(
				service.generateText({ model: "gpt-4", prompt: "test" }),
			).rejects.toThrow();
		});
	});

	describe("embed()", () => {
		it("generates embeddings", async () => {
			const embedResponse = {
				data: [{ embedding: [0.1, 0.2, 0.3] }],
				usage: { total_tokens: 5 },
			};
			const { service } = createService([
				{ method: "POST", path: "/internal/embeddings", body: embedResponse },
			]);

			const result = await service.embed({
				model: "text-embedding-ada-002",
				input: "Hello world",
			});

			expect(result.embeddings).toHaveLength(1);
			expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
			expect(result.usage.totalTokens).toBe(5);
		});

		it("handles multiple inputs", async () => {
			const embedResponse = {
				data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
				usage: { total_tokens: 10 },
			};
			const { service } = createService([
				{ method: "POST", path: "/internal/embeddings", body: embedResponse },
			]);

			const result = await service.embed({
				model: "text-embedding-ada-002",
				input: ["Hello", "World"],
			});

			expect(result.embeddings).toHaveLength(2);
		});
	});

	describe("generateObject()", () => {
		it("generates a structured JSON object", async () => {
			const { service } = createService([
				{
					method: "POST",
					path: "/ai/chat/completions",
					body: chatResponse('{"name":"Alice","age":30}'),
				},
			]);

			const result = await service.generateObject({
				model: "gpt-4",
				prompt: "Generate a person object",
				schema: {
					type: "object",
					properties: { name: { type: "string" }, age: { type: "number" } },
				},
			});

			expect(result.object).toEqual({ name: "Alice", age: 30 });
			expect(result.usage.totalTokens).toBe(15);
		});

		it("throws on invalid JSON response after retries exhausted", async () => {
			const { service } = createService([
				{
					method: "POST",
					path: "/ai/chat/completions",
					body: chatResponse("not valid json"),
				},
			]);

			await expect(
				service.generateObject({
					model: "gpt-4",
					prompt: "Generate something",
					schema: {},
				}),
			).rejects.toThrow();
		});
	});

	describe("generateImage()", () => {
		it("generates an image", async () => {
			const imageResponse = {
				data: [{ url: "https://images.example.com/generated.png" }],
			};
			const { service } = createService([
				{ method: "POST", path: "/internal/predictions", body: imageResponse },
			]);

			const result = await service.generateImage({
				prompt: "A sunset over mountains",
			});

			expect(result.images).toHaveLength(1);
			expect(result.images[0].url).toBe(
				"https://images.example.com/generated.png",
			);
		});
	});

	describe("generateVideo()", () => {
		it("generates a video", async () => {
			const videoResponse = { id: "vid_1", status: "processing", url: null };
			const { service } = createService([
				{ method: "POST", path: "/internal/predictions", body: videoResponse },
			]);

			const result = await service.generateVideo({
				prompt: "A cat walking",
				model: "video-gen-1",
			});

			expect(result).toBeDefined();
			expect((result as any).id).toBe("vid_1");
		});
	});

	describe("generateSpeech()", () => {
		it("generates speech and returns ArrayBuffer", async () => {
			const { http } = createTestHttpClient([]);
			const mockArrayBuffer = new ArrayBuffer(8);
			vi.spyOn(http, "postRaw" as any).mockResolvedValue({
				arrayBuffer: async () => mockArrayBuffer,
			});

			const service = new AIService(http);
			const result = await service.generateSpeech({
				text: "Hello world",
				voice: "alloy",
			});

			expect(result).toBe(mockArrayBuffer);
		});
	});

	describe("transcribe()", () => {
		it("transcribes audio", async () => {
			const { http } = createTestHttpClient([]);
			vi.spyOn(http, "postFormData" as any).mockResolvedValue({
				text: "Hello world",
			});

			const service = new AIService(http);
			const result = await service.transcribe({
				file: new Blob(["audio data"]),
				model: "whisper-1",
			});

			expect(result.text).toBe("Hello world");
		});
	});

	describe("moderate()", () => {
		it("moderates content", async () => {
			const moderationResponse = {
				id: "mod_1",
				results: [{ flagged: false, categories: {} }],
			};
			const { service } = createService([
				{ method: "POST", path: "/internal/predictions", body: moderationResponse },
			]);

			const result = await service.moderate({ input: "Hello, how are you?" });

			expect(result).toBeDefined();
		});
	});

	describe("listModels()", () => {
		it("lists models in OpenAI format", async () => {
			const modelsResponse = {
				object: "list",
				data: [{ id: "gpt-4" }, { id: "gpt-3.5-turbo" }],
			};
			const { service } = createService([
				{ method: "GET", path: "/internal/models", body: modelsResponse },
			]);

			const result = await service.listModels();

			expect(result).toEqual(["gpt-4", "gpt-3.5-turbo"]);
		});

		it("handles simple array format", async () => {
			const { service } = createService([
				{ method: "GET", path: "/internal/models", body: ["gpt-4", "gpt-3.5-turbo"] },
			]);

			const result = await service.listModels();

			expect(result).toEqual(["gpt-4", "gpt-3.5-turbo"]);
		});
	});

	describe("countTokens()", () => {
		it("estimates token count", () => {
			const { service } = createService([]);

			expect(service.countTokens("Hello world")).toBe(3);
			expect(service.countTokens("")).toBe(0);
			expect(service.countTokens("a".repeat(100))).toBe(25);
		});
	});

	describe("estimateCost()", () => {
		it("estimates cost for known model", () => {
			const { service } = createService([]);

			const cost = service.estimateCost({
				model: "frontal-ai-fast",
				inputTokens: 1000,
				outputTokens: 500,
			});
			expect(cost).toBeGreaterThan(0);
		});

		it("uses default rates for unknown model", () => {
			const { service } = createService([]);

			const cost = service.estimateCost({
				model: "unknown-model",
				inputTokens: 1000,
				outputTokens: 500,
			});
			expect(cost).toBeGreaterThan(0);
		});
	});

	describe("prompt management", () => {
		it("creates and retrieves a prompt", () => {
			const { service } = createService([]);

			const prompt = service.createPrompt({
				name: "greeting",
				template: "Hello {{name}}!",
				variables: { name: { type: "string", required: true } },
			});

			expect(prompt.name).toBe("greeting");

			const retrieved = service.getPrompt("greeting");
			expect(retrieved.template).toBe("Hello {{name}}!");
		});

		it("throws for missing prompt", () => {
			const { service } = createService([]);

			expect(() => service.getPrompt("nonexistent")).toThrow(
				"Prompt not found",
			);
		});

		it("updates a prompt", () => {
			const { service } = createService([]);

			service.createPrompt({ name: "test", template: "v1", variables: {} });
			const updated = service.updatePrompt("test", { template: "v2" });
			expect(updated.template).toBe("v2");
		});

		it("chains prompts", () => {
			const { service } = createService([]);

			const p1 = service.createPrompt({
				name: "step1",
				template: "First",
				variables: {},
			});
			const p2 = service.createPrompt({
				name: "step2",
				template: "Second",
				variables: {},
			});

			const chain = service.chainPrompts(p1, p2);
			expect(chain.prompts).toHaveLength(2);
		});
	});

	describe("tool system", () => {
		it("defines and registers a tool", () => {
			const { service } = createService([]);

			const tool = service.defineTool({
				name: "calculator",
				description: "Performs math",
				parameters: { a: "number", b: "number" },
				execute: async (params: any) => params.a + params.b,
			});

			service.registerTool(tool);
			expect(service.getTools()).toHaveLength(1);
			expect(service.getTools()[0].name).toBe("calculator");
		});

		it("executes a registered tool", async () => {
			const { service } = createService([]);

			service.registerTool(
				service.defineTool({
					name: "add",
					description: "Adds numbers",
					parameters: {},
					execute: async () => 42,
				}),
			);

			const result = await service.executeTool("add", {});
			expect(result).toBe(42);
		});

		it("throws for unknown tool", async () => {
			const { service } = createService([]);

			await expect(service.executeTool("nonexistent", {})).rejects.toThrow(
				"Tool not found",
			);
		});
	});

	describe("step tracking", () => {
		it("tracks steps", () => {
			const { service } = createService([]);

			expect(service.getCurrentStep()).toBe(0);
			service.stepCountIs(5);
			expect(service.getCurrentStep()).toBe(5);
			service.resetSteps();
			expect(service.getCurrentStep()).toBe(0);
		});
	});
});

describe("AI (deprecated compat)", () => {
	it("wraps results in APIResponse format", async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(chatResponse("Hello")), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", mockFetch);

		const ai = new AI({
			apiKey: "frt_test-api-key-1234567890",
			baseUrl: "https://ai.test.frontal.dev/v1",
		});
		const result = await ai.generateText({ model: "gpt-4", prompt: "test" });

		expect(result.data?.text).toBe("Hello");
		expect(result.error).toBeNull();

		vi.unstubAllGlobals();
	});
});
